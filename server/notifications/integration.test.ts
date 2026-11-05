import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import express from "express";
import { ContactError } from "./core";

// Intentionally never uses the application's normal DATABASE_URL.
// Point LEASEO_TEST_DATABASE_URL at a dedicated disposable PostgreSQL database.
const testUrl=process.env.LEASEO_TEST_DATABASE_URL;
test("property contact and notification PostgreSQL integration", {skip:!testUrl}, async t=>{
  if(!testUrl || !new URL(testUrl).pathname.includes("test"))throw new Error("Dedicated test database required");
  process.env.DATABASE_URL=testUrl;
  process.env.JWT_SECRET="leaseo-isolated-test-only-not-a-real-production-secret";
  process.env.WHATSAPP_CONFIG_ENCRYPTION_KEY="leaseo-isolated-test-only-encryption-not-production";
  const {pool}=await import("../db");
  const store=await import("./contact-store");
  const {processNotifications}=await import("./worker");
  const {saveConfig,loadConfig,decryptPassword}=await import("./config");
  const {registerNotificationRoutes}=await import("./routes");
  const {generateToken}=await import("../auth");
  const app=express();app.use(express.json());
  registerNotificationRoutes(app,{startWorker:false});
  const server=app.listen(0,"127.0.0.1");
  await new Promise<void>(resolve=>server.once("listening",resolve));
  const port=(server.address() as any).port;
  t.after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.end();});
  const migration=await readFile(new URL("../../migrations/property-contact.sql",import.meta.url),"utf8");
  await pool.query(migration);
  await pool.query(migration);
  // Run only on isolated test fixtures.
  await pool.query("TRUNCATE notification_jobs,property_contact_access,property_contact_otps,notification_rate_limits,enquiries CASCADE");
  for(const [id,first,phone,verified] of [
    ["contact-test-owner","Owner","919000000001",true],
    ["contact-test-a","Asha","919000000002",false],
    ["contact-test-b","Bina","919000000003",false],
    ["contact-test-admin","Admin","919000000004",true],
  ]){
    await pool.query(`INSERT INTO users(id,first_name,last_name,phone,email,phone_verified_at,is_active)
      VALUES($1,$2,'Test',$3,$4,CASE WHEN $5::boolean THEN now() ELSE NULL END,true)
      ON CONFLICT(id) DO UPDATE SET phone_verified_at=excluded.phone_verified_at`,
      [id,first,phone,`${id}@example.invalid`,verified]);
  }
  await pool.query("INSERT INTO roles(id,name,display_name) VALUES('contact-test-admin-role','admin','Admin') ON CONFLICT(name) DO NOTHING");
  await pool.query("INSERT INTO user_roles(id,user_id,role_id) SELECT 'contact-test-admin-link','contact-test-admin',id FROM roles WHERE name='admin' ON CONFLICT DO NOTHING");
  for(const id of ["contact-test-p1","contact-test-p2","contact-test-p3"]){
    await pool.query(`INSERT INTO properties(id,title,description,address,city,state,price,owner_id,status)
      VALUES($1,$2,'Test property','Test Road','Mumbai','Maharashtra',35000,'contact-test-owner','active')
      ON CONFLICT(id) DO NOTHING`,[id,`Property ${id}`]);
  }
  await saveConfig({siteUrl:"https://leaseo.example.invalid",platformName:"Leaseo",
    whatsappEnabled:true,smsEnabled:true,emailEnabled:true,
    adminPhone:"919000000004",adminEmail:"contact-test-admin@example.invalid",
    ownerWhatsappConsent:true,adminWhatsappConsent:true});
  await pool.query("UPDATE notification_templates SET is_enabled=true,meta_template_name='leaseo_enquiry_test'");
  const token=(id:string)=>generateToken({userId:id,email:`${id}@example.invalid`,isAdmin:id==="contact-test-admin"});
  const api=async(path:string,id:string|null="contact-test-a",method="GET",body?:any)=>{
    const response=await fetch(`http://127.0.0.1:${port}${path}`,{method,
      headers:{"Content-Type":"application/json",...(id?{Authorization:`Bearer ${token(id)}`}:{})},
      ...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,data:await response.json() as any};
  };
  let otp="";
  let first:any;
  await t.test("migration is rerunnable and creates nine templates plus separate chat",async()=>{
    const {rows:[r]}=await pool.query("SELECT count(*)::int AS count FROM notification_templates");
    assert.equal(r.count,10);
  });
  await t.test("unauthenticated and unverified customers cannot reveal owner contact",async()=>{
    assert.equal((await api("/api/properties/contact-test-p1/contact",null)).status,401);
    const result=await api("/api/properties/contact-test-p1/contact");
    assert.equal(result.status,403);assert.equal(result.data.ownerPhone,undefined);
    await assert.rejects(()=>store.createContact("contact-test-a","contact-test-p1",true),{code:"MOBILE_VERIFICATION_REQUIRED"});
  });
  await t.test("OTP goes to registered mobile, resend throttles, wrong attempts persist",async()=>{
    await store.requestOtp("contact-test-a",async(phone:string,code:string)=>{assert.equal(phone,"+919000000002");otp=code;return true;});
    assert.match(otp,/^\d{6}$/);
    await assert.rejects(()=>store.requestOtp("contact-test-a",async()=>true),{code:"OTP_RESEND_WAIT_60_SECONDS"});
    await assert.rejects(()=>store.verifyOtp("contact-test-a",otp==="000000"?"111111":"000000"),{code:"INVALID_OTP"});
    const {rows:[r]}=await pool.query("SELECT attempts,code_hash FROM property_contact_otps WHERE user_id='contact-test-a'");
    assert.equal(r.attempts,1);assert.notEqual(r.code_hash,otp);
  });
  await t.test("OTP verification persists at account level and cannot be replayed",async()=>{
    await store.verifyOtp("contact-test-a",otp);
    assert.equal((await store.verification("contact-test-a")).verified,true);
    await assert.rejects(()=>store.verifyOtp("contact-test-a",otp),{code:"OTP_EXPIRED_OR_CONSUMED"});
  });
  await t.test("first property creates an enquiry, correct chat and nine jobs",async()=>{
    first=await store.createContact("contact-test-a","contact-test-p1",true);
    assert.equal(first.created,true);
    assert.equal(first.ownerPhone,"919000000001");
    const chat=new URL(first.whatsappUrl).searchParams.get("text")!;
    assert.match(chat,/Asha Test/);assert.match(chat,/Property contact-test-p1/);assert.match(chat,/Owner Test/);
    assert.ok(!chat.includes("{{"));
    const {rows:[r]}=await pool.query("SELECT count(*)::int AS count FROM notification_jobs WHERE enquiry_id=$1",[first.enquiryId]);
    assert.equal(r.count,9);
  });
  await t.test("second and third properties use account verification but independent enquiries and data",async()=>{
    for(const p of ["contact-test-p2","contact-test-p3"]){
      const result=await store.createContact("contact-test-a",p,true);
      assert.equal(result.created,true);assert.notEqual(result.enquiryId,first.enquiryId);
      const text=new URL(result.whatsappUrl).searchParams.get("text")!;
      assert.ok(text.includes(p));assert.ok(!text.includes("contact-test-p1"));
    }
    const result=await store.requestOtp("contact-test-a",async()=>{throw new Error("must not send again");});
    assert.equal(result.alreadyVerified,true);
  });
  await t.test("concurrent repeated clicks create neither duplicate enquiries nor jobs",async()=>{
    const results=await Promise.all(Array.from({length:5},()=>store.createContact("contact-test-a","contact-test-p1",true)));
    assert.ok(results.every(r=>!r.created && r.enquiryId===first.enquiryId));
    const {rows:[r]}=await pool.query("SELECT count(*)::int AS count FROM notification_jobs WHERE enquiry_id=$1",[first.enquiryId]);
    assert.equal(r.count,9);
  });
  await t.test("different customer's verification is independent",async()=>{
    await assert.rejects(()=>store.createContact("contact-test-b","contact-test-p1",true),{code:"MOBILE_VERIFICATION_REQUIRED"});
    assert.equal((await store.verification("contact-test-b")).verified,false);
    let code="";
    await store.requestOtp("contact-test-b",async(_phone:string,v:string)=>{code=v;return true;});
    await store.verifyOtp("contact-test-b",code);
    const second=await store.createContact("contact-test-b","contact-test-p1",true);
    assert.notEqual(second.enquiryId,first.enquiryId);
  });
  await t.test("simultaneous first clicks create exactly one new enquiry and nine jobs",async()=>{
    const results=await Promise.all(Array.from({length:5},()=>store.createContact("contact-test-b","contact-test-p3",true)));
    assert.equal(results.filter(r=>r.created).length,1);
    assert.equal(new Set(results.map(r=>r.enquiryId)).size,1);
    const {rows:[r]}=await pool.query("SELECT count(*)::int AS count FROM notification_jobs WHERE enquiry_id=$1",[results[0].enquiryId]);
    assert.equal(r.count,9);
  });
  await t.test("consent, missing property and self enquiries are rejected",async()=>{
    await assert.rejects(()=>store.createContact("contact-test-a","contact-test-p1",false),{code:"CONTACT_AND_NOTIFICATION_CONSENT_REQUIRED"});
    await assert.rejects(()=>store.createContact("contact-test-a","missing",true),{code:"PROPERTY_UNAVAILABLE"});
    await assert.rejects(()=>store.createContact("contact-test-owner","contact-test-p1",true),{code:"CANNOT_ENQUIRE_OWN_PROPERTY"});
  });
  await t.test("expired codes, changed phones, attempt and hourly limits fail safely",async()=>{
    await pool.query("UPDATE users SET phone_verified_at=NULL WHERE id='contact-test-b'");
    await pool.query("UPDATE property_contact_otps SET consumed_at=NULL,expires_at=now()-interval '1 minute' WHERE user_id='contact-test-b'");
    await assert.rejects(()=>store.verifyOtp("contact-test-b","123456"),{code:"OTP_EXPIRED_OR_CONSUMED"});
    await pool.query("UPDATE property_contact_otps SET expires_at=now()+interval '5 minutes',attempts=5 WHERE user_id='contact-test-b'");
    await assert.rejects(()=>store.verifyOtp("contact-test-b","123456"),{code:"OTP_ATTEMPTS_EXCEEDED"});
    await pool.query("UPDATE property_contact_otps SET attempts=0,phone='919000009999' WHERE user_id='contact-test-b'");
    await assert.rejects(()=>store.verifyOtp("contact-test-b","123456"),{code:"REGISTERED_PHONE_CHANGED"});
    await pool.query("UPDATE property_contact_otps SET send_count=5,requested_at=now()-interval '2 minutes' WHERE user_id='contact-test-b'");
    await assert.rejects(()=>store.requestOtp("contact-test-b",async()=>true),{code:"OTP_HOURLY_LIMIT"});
    await pool.query("UPDATE users SET phone_verified_at=now() WHERE id='contact-test-b'");
  });
  await t.test("failed OTP delivery never reports success or leaves a usable challenge",async()=>{
    await pool.query("UPDATE users SET phone_verified_at=NULL WHERE id='contact-test-b'");
    await pool.query("UPDATE property_contact_otps SET requested_at=now()-interval '2 hours',window_start=now()-interval '2 hours' WHERE user_id='contact-test-b'");
    await assert.rejects(()=>store.requestOtp("contact-test-b",async()=>false),{code:"OTP_DELIVERY_FAILED_CHECK_SMS_PROVIDER"});
    const {rows:[r]}=await pool.query("SELECT consumed_at FROM property_contact_otps WHERE user_id='contact-test-b'");
    assert.ok(r.consumed_at);
    await pool.query("UPDATE users SET phone_verified_at=now() WHERE id='contact-test-b'");
  });
  await t.test("admin APIs enforce role, template validation and real context preview",async()=>{
    assert.equal((await api("/api/admin/notifications")).status,403);
    const saved=await api("/api/admin/notifications/templates/customer_email","contact-test-admin","PATCH",{message_body:"Updated {{customer_name}} / {{property_title}}"});
    assert.equal(saved.status,200);
    const preview=await api("/api/admin/notifications/templates/customer_email/preview","contact-test-admin","POST",{enquiryId:first.enquiryId});
    assert.match(preview.data.body,/Updated Asha Test \/ Property contact-test-p1/);
    const invalid=await api("/api/admin/notifications/templates/customer_email","contact-test-admin","PATCH",{message_body:"{{secret}}"});
    assert.equal(invalid.status,400);
  });
  await t.test("SMTP secret is encrypted at rest, omitted from response, blank preserves",async()=>{
    const secret="synthetic-test-password-not-a-real-credential";
    const safe=await saveConfig({smtpPassword:secret});
    assert.equal(safe.hasSmtpPassword,true);assert.ok(!JSON.stringify(safe).includes(secret));
    const before=await loadConfig();assert.ok(!before.encrypted!.includes(secret));
    assert.equal(decryptPassword(before.encrypted!),secret);
    await saveConfig({smtpPassword:""});
    assert.equal((await loadConfig()).encrypted,before.encrypted);
  });
  await t.test("disabled template is skipped; modified template is read just before delivery",async()=>{
    await pool.query("UPDATE notification_templates SET is_enabled=false WHERE id='owner_email'");
    const seen:string[]=[];
    for(let i=0;i<10;i++)await processNotifications(async(job:any,tpl:any,context:any)=>{
      if(job.template_id==="customer_email")assert.match(tpl.message_body,/Updated/);
      assert.ok(context.property_title.includes(job.property_id));
      seen.push(job.id);return {messageId:`test-${job.id}`,status:"accepted"};
    });
    assert.equal(new Set(seen).size,seen.length);
    const {rows:[r]}=await pool.query("SELECT status FROM notification_jobs WHERE enquiry_id=$1 AND template_id='owner_email'",[first.enquiryId]);
    assert.equal(r.status,"skipped");
    assert.ok(seen.length>0);
  });
  await t.test("a failure on each channel leaves the other channels running; ambiguous outcomes never retry",async()=>{
    for(const failed of ["whatsapp","sms","email"]){
      await pool.query("UPDATE notification_templates SET is_enabled=true");
      await pool.query("UPDATE notification_jobs SET status='pending',attempts=0,next_attempt_at=now(),provider_message_id=NULL WHERE enquiry_id=$1",[first.enquiryId]);
      for(let i=0;i<2;i++)await processNotifications(async(job:any)=>{
        if(job.channel===failed)throw new ContactError("PROVIDER_REQUEST_OUTCOME_UNKNOWN",502);
        return {messageId:`test-${job.id}`,status:"accepted"};
      });
      const {rows}=await pool.query("SELECT channel,status,retryable FROM notification_jobs WHERE enquiry_id=$1",[first.enquiryId]);
      assert.equal(rows.filter((r:any)=>r.channel===failed && r.status==="unknown" && !r.retryable).length,3);
      assert.equal(rows.filter((r:any)=>r.channel!==failed && r.status==="accepted").length,6);
    }
  });
  await t.test("temporary rejection schedules a bounded retry; successful jobs are not resent",async()=>{
    await pool.query("UPDATE notification_jobs SET status='pending',attempts=0,next_attempt_at=now() WHERE enquiry_id=$1 AND template_id='customer_sms'",[first.enquiryId]);
    await processNotifications(async()=>{throw new ContactError("PROVIDER_RATE_LIMITED",502,true);});
    const {rows:[r]}=await pool.query("SELECT * FROM notification_jobs WHERE enquiry_id=$1 AND template_id='customer_sms'",[first.enquiryId]);
    assert.equal(r.status,"pending");assert.equal(r.retryable,true);assert.equal(r.attempts,1);
    assert.ok(new Date(r.next_attempt_at).getTime()>Date.now());
    let sends=0;
    await processNotifications(async()=>{sends++;return {messageId:null,status:"accepted"};});
    assert.equal(sends,0);
  });
  await t.test("delivery logs follow webhook history and never regress from read to sent",async()=>{
    const {rows:[job]}=await pool.query("SELECT id FROM notification_jobs WHERE enquiry_id=$1 AND template_id='customer_whatsapp'",[first.enquiryId]);
    await pool.query("UPDATE notification_jobs SET status='accepted',provider_message_id='contact-test-wamid' WHERE id=$1",[job.id]);
    await pool.query(`INSERT INTO whatsapp_delivery_events(event_key,message_id,status,event_timestamp)
      VALUES('contact-test-read','contact-test-wamid','read',100),('contact-test-sent','contact-test-wamid','sent',200)
      ON CONFLICT DO NOTHING`);
    await processNotifications();
    const {rows:[r]}=await pool.query("SELECT status FROM notification_jobs WHERE id=$1",[job.id]);
    assert.equal(r.status,"read");
    const logs=await api("/api/admin/notifications/logs","contact-test-admin");
    assert.equal(logs.status,200);assert.ok(logs.data.some((l:any)=>l.id===job.id && l.status==="read"));
  });
  await t.test("disabled channels produce skipped logs without attempting delivery",async()=>{
    await saveConfig({whatsappEnabled:false,smsEnabled:false,emailEnabled:false});
    const result=await store.createContact("contact-test-b","contact-test-p2",true);
    const {rows}=await pool.query("SELECT status,error_code FROM notification_jobs WHERE enquiry_id=$1",[result.enquiryId]);
    assert.equal(rows.length,9);assert.ok(rows.every((r:any)=>r.status==="skipped" && r.error_code==="CHANNEL_DISABLED"));
  });
  await t.test("manual retry is bounded and cannot resend an unknown outcome",async()=>{
    const {rows:[job]}=await pool.query("SELECT id FROM notification_jobs WHERE enquiry_id=$1 AND template_id='customer_sms'",[first.enquiryId]);
    await pool.query("UPDATE notification_jobs SET status='failed',retryable=true,attempts=3 WHERE id=$1",[job.id]);
    assert.equal((await api(`/api/admin/notifications/retry/${job.id}`,"contact-test-admin","POST",{})).status,200);
    assert.equal((await api(`/api/admin/notifications/retry/${job.id}`,"contact-test-admin","POST",{})).status,400);
    await pool.query("UPDATE notification_jobs SET status='unknown',retryable=true WHERE id=$1",[job.id]);
    assert.equal((await api(`/api/admin/notifications/retry/${job.id}`,"contact-test-admin","POST",{})).status,400);
    await pool.query("UPDATE notification_jobs SET status='failed',attempts=6 WHERE id=$1",[job.id]);
    assert.equal((await api(`/api/admin/notifications/retry/${job.id}`,"contact-test-admin","POST",{})).status,400);
  });
});
