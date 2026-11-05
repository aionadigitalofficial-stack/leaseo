import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import express from "express";

const testUrl=process.env.LEASEO_TEST_DATABASE_URL;
test("notification draft library PostgreSQL and API integration",{skip:!testUrl},async t=>{
  if(!testUrl || !new URL(testUrl).pathname.endsWith("_test"))throw new Error("Dedicated test database required");
  process.env.DATABASE_URL=testUrl;
  process.env.JWT_SECRET="leaseo-isolated-test-only-not-a-real-production-secret";
  process.env.WHATSAPP_CONFIG_ENCRYPTION_KEY="leaseo-isolated-test-only-encryption-not-production";
  const {pool}=await import("../db");
  const {registerNotificationRoutes}=await import("./routes");
  const {generateToken}=await import("../auth");
  const {getDraft}=await import("./draft-store");
  const {persistWhatsAppSettings}=await import("../whatsapp/settings-store");
  const app=express();app.use(express.json());registerNotificationRoutes(app,{startWorker:false});
  const server=app.listen(0,"127.0.0.1");
  await new Promise<void>(resolve=>server.once("listening",resolve));
  const port=(server.address() as any).port;
  t.after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.end();});
  for(const file of ["whatsapp.sql","property-contact.sql","template-drafts.sql"])
    await pool.query(await readFile(new URL(`../../migrations/${file}`,import.meta.url),"utf8"));
  await pool.query(await readFile(new URL("../../migrations/template-drafts.sql",import.meta.url),"utf8"));
  await pool.query("TRUNCATE notification_template_drafts");
  for(const id of ["draft-test-admin","draft-test-customer"])
    await pool.query(`INSERT INTO users(id,first_name,last_name,email,is_active) VALUES($1,'Draft','Test',$2,true) ON CONFLICT(id) DO NOTHING`,[id,`${id}@example.invalid`]);
  await pool.query("INSERT INTO roles(id,name,display_name) VALUES('draft-test-admin-role','admin','Admin') ON CONFLICT(name) DO NOTHING");
  await pool.query(`INSERT INTO user_roles(id,user_id,role_id) SELECT 'draft-test-role-link','draft-test-admin',id FROM roles WHERE name='admin' ON CONFLICT DO NOTHING`);
  await pool.query("DELETE FROM notification_rate_limits WHERE user_id='draft-test-admin'");
  const path="/api/admin/notifications/drafts";
  const api=async(url:string,method="GET",body?:any,who:string|null="draft-test-admin")=>{
    const token=who?generateToken({userId:who,email:`${who}@example.invalid`,isAdmin:who==="draft-test-admin"}):null;
    const response=await fetch(`http://127.0.0.1:${port}${url}`,{method,headers:{
      "Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
      ...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,data:await response.json() as any};
  };
  await t.test("admin-only email drafts persist, preview, reject stale edits, apply disabled and archive locally",async()=>{
    assert.equal((await api(path,"GET",undefined,null)).status,401);
    assert.equal((await api(path,"GET",undefined,"draft-test-customer")).status,403);
    const made=await api(path,"POST",{template_name:"Email draft test",channel:"email",recipient_type:"customer",
      subject:"Your enquiry for {{property_title}}",message_body:"Hello {{customer_name}}, thank you.",
      example_values:{customer_name:"Example Customer",property_title:"Example Property"}});
    assert.equal(made.status,201);const draft=made.data;
    assert.equal(draft.provider_status,"DRAFT");assert.equal(draft.version,1);
    assert.equal((await api(`${path}/${draft.id}/preview`,"POST",{})).data.subject,"Your enquiry for Example Property");
    assert.ok((await api(path)).data.drafts.some((d:any)=>d.id===draft.id));
    const edited=await api(`${path}/${draft.id}`,"PATCH",{version:1,subject:"Updated {{property_title}}"});
    assert.equal(edited.status,200);assert.equal(edited.data.version,2);
    assert.equal((await api(`${path}/${draft.id}`,"PATCH",{version:1,subject:"Stale"})).status,409);
    assert.equal((await api(`${path}/${draft.id}/apply`,"POST",{version:2})).status,400);
    const before=Number((await pool.query("SELECT count(*) FROM notification_jobs")).rows[0].count);
    const applied=await api(`${path}/${draft.id}/apply`,"POST",{version:2,confirmReplace:true});
    assert.equal(applied.status,200);assert.equal(applied.data.id,"customer_email");
    assert.equal(applied.data.subject,"Updated {{property_title}}");assert.equal(applied.data.is_enabled,false);
    assert.equal(Number((await pool.query("SELECT count(*) FROM notification_jobs")).rows[0].count),before);
    assert.equal((await api(`${path}/${draft.id}`,"DELETE",{version:2})).status,200);
    assert.equal((await api(`${path}/${draft.id}/preview`,"POST",{})).status,404);
    assert.equal((await pool.query("SELECT subject FROM notification_templates WHERE id='customer_email'")).rows[0].subject,"Updated {{property_title}}");
  });
  await t.test("multiple SMS drafts coexist, use approved IDs and cannot submit to Meta",async()=>{
    const input={template_name:"SMS one",channel:"sms",recipient_type:"owner",message_body:"Hi {{owner_name}}, enquiry on {{property_title}}.",sms_template_id:"123456"};
    const one=await api(path,"POST",input),two=await api(path,"POST",{...input,template_name:"SMS two"});
    assert.equal(one.status,201);assert.equal(two.status,201);assert.notEqual(one.data.id,two.data.id);
    assert.deepEqual(one.data.parameter_keys,["owner_name","property_title"]);
    assert.equal((await api(`${path}/${one.data.id}/submit`,"POST",{version:1})).status,400);
    const applied=await api(`${path}/${one.data.id}/apply`,"POST",{version:1,confirmReplace:true});
    assert.equal(applied.status,200);assert.equal(applied.data.sms_template_id,"123456");assert.equal(applied.data.is_enabled,false);
  });
  await t.test("WhatsApp creation, approval sync, locked edits and activation use real contracts",async()=>{
    await persistWhatsAppSettings({WHATSAPP_ACCESS_TOKEN:"synthetic-meta-template-token",
      WHATSAPP_BUSINESS_ACCOUNT_ID:"12345",WHATSAPP_API_VERSION:"v24.0"});
    const made=await api(path,"POST",{template_name:"WhatsApp new",channel:"whatsapp",recipient_type:"customer",
      message_body:"Hello {{customer_name}}, property {{property_title}} enquiry received.",meta_template_name:"leaseo_draft_test",
      example_values:{customer_name:"Example Customer",property_title:"Example Property"}});
    assert.equal(made.status,201);let current=made.data;
    const originalFetch=globalThis.fetch;let metaStatus="PENDING",submittedBody:any,calls=0;
    globalThis.fetch=(async(url:any,init:any)=>{
      if(!String(url).startsWith("https://graph.facebook.com/"))return originalFetch(url,init);
      calls++;
      if(init.method==="POST"){
        submittedBody=JSON.parse(init.body);return new Response(JSON.stringify({id:"789",status:"PENDING"}));
      }
      return new Response(JSON.stringify({data:[{id:"789",name:"leaseo_draft_test",language:"en_US",status:metaStatus,components:submittedBody.components}]}));
    }) as typeof fetch;
    try{
      const sent=await api(`${path}/${current.id}/submit`,"POST",{version:current.version});
      assert.equal(sent.status,200);current=sent.data;assert.equal(current.provider_status,"PENDING");
      assert.equal(submittedBody.components[0].text,"Hello {{1}}, property {{2}} enquiry received.");
      assert.equal((await api(`${path}/${current.id}`,"PATCH",{version:current.version,message_body:"Changed"})).status,409);
      assert.equal((await api(`${path}/${current.id}/apply`,"POST",{version:current.version,confirmReplace:true})).status,409);
      current=await getDraft(current.id);metaStatus="APPROVED";
      const synced=await api(`${path}/${current.id}/sync`,"POST",{version:current.version});
      assert.equal(synced.status,200);current=synced.data;assert.equal(current.provider_status,"APPROVED");
      const applied=await api(`${path}/${current.id}/apply`,"POST",{version:current.version,confirmReplace:true});
      assert.equal(applied.status,200);assert.equal(applied.data.is_enabled,false);
      assert.equal(applied.data.meta_template_name,"leaseo_draft_test");
      assert.deepEqual(applied.data.parameter_keys,["customer_name","property_title"]);assert.ok(calls>=4);
      assert.ok(!JSON.stringify(current).includes("synthetic-meta-template-token"));
    }finally{globalThis.fetch=originalFetch;}
  });
  await t.test("uncertain external creation is recorded and cannot be blindly submitted twice",async()=>{
    const made=await api(path,"POST",{template_name:"Unknown WhatsApp",channel:"whatsapp",recipient_type:"owner",
      message_body:"An enquiry was received. Please check your Leaseo dashboard.",meta_template_name:"leaseo_unknown_test"});
    const originalFetch=globalThis.fetch;let calls=0;
    globalThis.fetch=(async(url:any,init:any)=>{
      if(!String(url).startsWith("https://graph.facebook.com/"))return originalFetch(url,init);
      calls++;throw new Error("Synthetic network failure");
    }) as typeof fetch;
    try{
      assert.equal((await api(`${path}/${made.data.id}/submit`,"POST",{version:1})).status,502);
      const draft=await getDraft(made.data.id);assert.equal(draft.provider_status,"UNKNOWN");
      assert.equal((await api(`${path}/${draft.id}/submit`,"POST",{version:draft.version})).status,409);
      assert.equal(calls,1);
    }finally{globalThis.fetch=originalFetch;}
  });
});
