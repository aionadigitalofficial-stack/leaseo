import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import express from "express";

const testUrl = process.env.LEASEO_TEST_DATABASE_URL;
test("WATI settings, queue routing and authenticated delivery reconciliation", { skip: !testUrl }, async t => {
  if (!testUrl || !new URL(testUrl).pathname.endsWith("_test")) throw new Error("Disposable _test database required");
  process.env.DATABASE_URL = testUrl;
  process.env.JWT_SECRET = "leaseo-isolated-test-only-not-a-production-secret";
  process.env.WHATSAPP_CONFIG_ENCRYPTION_KEY = "leaseo-isolated-test-only-not-a-production-encryption-key";
  const { pool } = await import("../db");
  const { registerNotificationRoutes } = await import("./routes");
  const { saveConfig, loadConfig } = await import("./config");
  const { loadWati, safeWati, sendWati, reconcileWati } = await import("./wati-store");
  const { createContact } = await import("./contact-store");
  const { processNotifications } = await import("./worker");
  const { deliver, providerStatus } = await import("./providers");
  const { generateToken } = await import("../auth");
  for (const file of ["whatsapp.sql", "property-contact.sql", "template-drafts.sql", "wati-notifications.sql", "wati-notifications.sql"]) {
    await pool.query(await readFile(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  }
  await pool.query("TRUNCATE notification_jobs,property_contact_access,notification_rate_limits,enquiries CASCADE");
  await pool.query("UPDATE wati_notification_settings SET api_host='',channel='',encrypted_token=NULL,encrypted_webhook_secret=NULL");
  for (const [id, phone] of [["wati-test-owner","918800000001"],["wati-test-customer","918800000002"],["wati-test-admin","918800000003"]]) {
    await pool.query(`INSERT INTO users(id,first_name,last_name,email,phone,phone_verified_at,is_active)
      VALUES($1,'Sample','Person',$2,$3,now(),true) ON CONFLICT(id) DO UPDATE SET phone_verified_at=now()`,
      [id,`${id}@example.invalid`,phone]);
  }
  await pool.query("INSERT INTO roles(id,name,display_name) VALUES('wati-test-admin-role','admin','Admin') ON CONFLICT(name) DO NOTHING");
  await pool.query("INSERT INTO user_roles(id,user_id,role_id) SELECT 'wati-test-admin-link','wati-test-admin',id FROM roles WHERE name='admin' ON CONFLICT DO NOTHING");
  for (const id of ["wati-test-property","wati-test-unknown"]) {
    await pool.query(`INSERT INTO properties(id,title,description,address,city,state,price,owner_id,status)
      VALUES($1,'Sample Office','Test','Sample Road','Mumbai','Maharashtra',10000,'wati-test-owner','active') ON CONFLICT(id) DO NOTHING`,[id]);
  }
  const app = express(); app.use(express.json()); registerNotificationRoutes(app,{startWorker:false});
  const server = app.listen(0,"127.0.0.1");
  await new Promise<void>(resolve => server.once("listening",resolve));
  const port = (server.address() as any).port;
  const realFetch = global.fetch;
  const api = async (path: string, method="GET", body?: any, who: string | null="wati-test-admin") => {
    const token = who ? generateToken({userId:who,email:`${who}@example.invalid`,isAdmin:who==="wati-test-admin"}) : null;
    const res = await realFetch(`http://127.0.0.1:${port}${path}`,{method,headers:{"Content-Type":"application/json",
      ...(token ? {Authorization:`Bearer ${token}`} : {})},...(body ? {body:JSON.stringify(body)} : {})});
    return {status:res.status,data:await res.json() as any};
  };
  t.after(async () => {
    global.fetch=realFetch;
    await new Promise<void>(resolve => server.close(()=>resolve()));
    await pool.end();
  });
  let webhook = "";
  const path="/api/admin/notifications/wati";
  await t.test("settings enforce admin, encrypt keys, preserve blanks and do not switch providers", async () => {
    await saveConfig({whatsappProvider:"meta",siteUrl:"https://leaseo.example.invalid",smtpHost:"mail.example.invalid"});
    assert.equal((await api(path,"GET",undefined,null)).status,401);
    assert.equal((await api(path,"GET",undefined,"wati-test-customer")).status,403);
    assert.equal((await api(path,"PUT",{apiHost:"https://evil.invalid",channel:"",apiToken:"synthetic-key"})).status,400);
    const saved=await api(path,"PUT",{apiHost:"https://live-mt-server.wati.io",channel:"919000000001",apiToken:"synthetic-wati-key"});
    assert.equal(saved.status,200);assert.equal(saved.data.hasApiToken,true);
    assert.ok(!JSON.stringify(saved.data).includes("synthetic-wati-key"));
    const row=await loadWati(); assert.notEqual(row.encrypted_token,"synthetic-wati-key");
    assert.ok(!JSON.stringify(safeWati(row)).includes("encrypted_"));
    const reload=await api(path);assert.deepEqual(saved.data,reload.data);
    assert.equal((await loadConfig()).settings.whatsappProvider,"meta");
    assert.equal((await loadConfig()).settings.smtpHost,"mail.example.invalid");
    assert.equal((await api(path,"PUT",{apiHost:saved.data.apiHost,channel:saved.data.channel,apiToken:""})).status,200);
    assert.equal((await loadWati()).encrypted_token,row.encrypted_token);
    webhook=(await api(`${path}/webhook-url`,"POST",{})).data.path;
    assert.match(webhook,/\/api\/notifications\/wati\/webhook\?key=[a-f0-9]{64}$/);
    assert.equal((await api(`${path}/webhook-url`,"POST",{},"wati-test-customer")).status,403);
  });
  const sent: any[]=[];
  await t.test("customer, owner and admin queued enquiries use WATI V3 named values only", async () => {
    await saveConfig({whatsappProvider:"wati",whatsappEnabled:true,smsEnabled:true,emailEnabled:true,
      ownerWhatsappConsent:true,adminWhatsappConsent:true,adminPhone:"919000000003",adminEmail:"wati-test-admin@example.invalid"});
    for (const [recipient,keys] of [
      ["customer",["customer_name","property_title"]],
      ["owner",["owner_name","property_title","customer_name","customer_phone"]],
      ["admin",["property_title","customer_name","customer_phone"]],
    ] as const) {
      await pool.query("UPDATE notification_templates SET is_enabled=true,meta_template_name=$2,parameter_keys=$3::jsonb WHERE id=$1",
        [`${recipient}_whatsapp`,`leaseo_${recipient}_enquiry`,JSON.stringify(keys)]);
    }
    await pool.query("UPDATE notification_templates SET is_enabled=true WHERE channel IN('sms','email')");
    const before=(await pool.query("SELECT count(*)::int n FROM notification_jobs")).rows[0].n;
    const contact=await createContact("wati-test-customer","wati-test-property",true);
    assert.equal(contact.created,true);
    assert.equal((await createContact("wati-test-customer","wati-test-property",true)).created,false);
    assert.equal((await pool.query("SELECT count(*)::int n FROM notification_jobs")).rows[0].n-before,9);
    global.fetch=async (url,init) => {
      assert.equal(String(url),"https://live-mt-server.wati.io/api/ext/v3/messageTemplates/send");
      assert.equal((init!.headers as any).Authorization,"Bearer synthetic-wati-key");
      const body=JSON.parse(String(init!.body));sent.push(body);
      return Response.json({success:true,broadcast_id:`broadcast-${sent.length}`,recipients:[{
        local_message_id:body.recipients[0].local_message_id,target:body.recipients[0].target,errors:[],
      }]});
    };
    const transport: typeof deliver=async (job,template,values,config,encrypted) =>
      job.channel==="whatsapp" ? deliver(job,template,values,config,encrypted) : {messageId:"synthetic-other-channel",status:"accepted"};
    await processNotifications(transport); await processNotifications(transport);
    assert.equal(sent.length,3);
    assert.deepEqual(sent.map(b=>b.template_name).sort(),["leaseo_admin_enquiry","leaseo_customer_enquiry","leaseo_owner_enquiry"]);
    for(const body of sent) {
      assert.equal(body.channel,"919000000001");
      assert.ok(body.recipients[0].custom_params.every((p:any)=>p.name && p.value && !p.value.includes("{{")));
    }
    const status=await providerStatus((await loadConfig()).settings,null);
    assert.equal(status.whatsapp.configured,true);
    assert.equal((await pool.query("SELECT count(*)::int n FROM notification_jobs WHERE status='accepted'")).rows[0].n,9);
    assert.equal((await pool.query("SELECT count(*)::int n FROM wati_notification_attempts")).rows[0].n,3);
  });
  await t.test("authenticated webhook deduplicates, links message IDs and never regresses read", async () => {
    const local=sent[0].recipients[0].local_message_id;
    const body={eventType:"templateMessageSent_v2",localMessageId:local,id:"wati-safe-id",whatsappMessageId:"wamid.synthetic",channelPhoneNumber:"919000000001",text:"never store this"};
    assert.equal((await api("/api/notifications/wati/webhook?key=wrong","POST",body,null)).status,403);
    assert.equal((await api(webhook,"POST",{...body,channelPhoneNumber:"919000000099"},null)).status,403);
    const repeated=await Promise.all(Array.from({length:5},()=>api(webhook,"POST",body,null)));
    assert.ok(repeated.every(r=>r.status===200));
    assert.equal((await pool.query("SELECT count(*)::int n FROM wati_notification_events")).rows[0].n,1);
    // Read arrives without caller correlation; the sent event supplies the ID link.
    await api(webhook,"POST",{eventType:"sentMessageREAD_v2",id:"wati-safe-id",channelPhoneNumber:"919000000001"},null);
    await reconcileWati();
    const job=(await pool.query("SELECT j.* FROM notification_jobs j JOIN wati_notification_attempts a ON j.id=a.job_id WHERE a.id=$1",[local])).rows[0];
    assert.equal(job.status,"read");
    await api(webhook,"POST",{eventType:"templateMessageFailed",localMessageId:local,failedCode:"131026"},null);
    await api(webhook,"POST",{eventType:"sentMessageDELIVERED_v2",localMessageId:local},null);
    await reconcileWati();
    assert.equal((await pool.query("SELECT status FROM notification_jobs WHERE id=$1",[job.id])).rows[0].status,"read");
  });
  await t.test("timeout stays unknown without resend and resolves a callback before the send response", async () => {
    await saveConfig({smsEnabled:false,emailEnabled:false});
    const contact=await createContact("wati-test-customer","wati-test-unknown",true);
    await pool.query("UPDATE notification_jobs SET status='skipped' WHERE enquiry_id=$1 AND recipient_type<>'customer'",[contact.enquiryId]);
    let attempts=0, local="";
    global.fetch=async (_url,init) => {
      attempts++;local=JSON.parse(String(init!.body)).recipients[0].local_message_id;
      throw new Error("network connection lost");
    };
    await processNotifications();
    const job=(await pool.query("SELECT * FROM notification_jobs WHERE enquiry_id=$1 AND channel='whatsapp' AND recipient_type='customer'",[contact.enquiryId])).rows[0];
    assert.equal(job.status,"unknown");assert.equal(job.retryable,false);
    await processNotifications();assert.equal(attempts,1);
    await api(webhook,"POST",{eventType:"sentMessageDELIVERED_v2",localMessageId:local},null);
    await processNotifications();
    assert.equal((await pool.query("SELECT status FROM notification_jobs WHERE id=$1",[job.id])).rows[0].status,"delivered");
    // Callback received synchronously during a successful request remains authoritative.
    await pool.query("UPDATE notification_jobs SET status='processing' WHERE id=$1",[job.id]);
    const template=(await pool.query("SELECT * FROM notification_templates WHERE id='customer_whatsapp'")).rows[0];
    const result=await sendWati(job,template,{customer_name:"Sample",property_title:"Sample Office"},async (_url,init)=>{
      const id=JSON.parse(String(init!.body)).recipients[0].local_message_id;
      await api(webhook,"POST",{eventType:"templateMessageFailed",localMessageId:id,failedCode:"131026"},null);
      return Response.json({success:true,broadcast_id:"new-broadcast",recipients:[{local_message_id:id,errors:[]}]});
    });
    await pool.query("UPDATE notification_jobs SET status='accepted',provider_message_id=$2 WHERE id=$1",[job.id,result.messageId]);
    await reconcileWati();
    const failed=(await pool.query("SELECT status,error_code FROM notification_jobs WHERE id=$1",[job.id])).rows[0];
    assert.equal(failed.status,"failed");assert.equal(failed.error_code,"WATI_DELIVERY_131026");
  });
  await t.test("all error responses are safe and no uncertain write is automatically retried", async () => {
    const job=(await pool.query("SELECT * FROM notification_jobs WHERE channel='whatsapp' LIMIT 1")).rows[0];
    const template={meta_template_name:"leaseo_customer_enquiry",parameter_keys:["customer_name","property_title"]};
    const values={customer_name:"Sample",property_title:"Office"};
    for(const [status,code] of [[401,"WATI_AUTHORIZATION_FAILED"],[403,"WATI_PERMISSION_OR_PLAN_REQUIRED"],
      [429,"WATI_RATE_OR_USAGE_LIMIT"],[500,"WATI_SEND_OUTCOME_UNKNOWN"],[400,"WATI_REQUEST_REJECTED"]] as const) {
      let requests=0;
      await assert.rejects(()=>sendWati(job,template,values,async()=>{
        requests++;return new Response("private provider diagnostic",{status});
      }),{code});
      assert.equal(requests,1);
    }
    let requests=0;
    await assert.rejects(()=>sendWati({...job,consent_confirmed:false},template,values,async()=>{
      requests++;return Response.json({});
    }),{code:"WHATSAPP_CONSENT_REQUIRED"});
    assert.equal(requests,0);
  });
  await t.test("changing the sender rotates the webhook URL but preserves the encrypted API key", async () => {
    const old=await loadWati();
    const result=await api(path,"PUT",{apiHost:old.api_host,channel:"919000000099"});
    assert.equal(result.status,200);
    assert.equal((await loadWati()).encrypted_token,old.encrypted_token);
    assert.equal((await api(webhook,"POST",{eventType:"message"},null)).status,403);
    const fresh=(await api(`${path}/webhook-url`,"POST",{})).data.path;
    assert.notEqual(fresh,webhook);
    assert.equal((await api(fresh,"POST",{eventType:"message"},null)).status,200);
  });
});
