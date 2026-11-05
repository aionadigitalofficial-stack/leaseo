import type { Express, Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { authMiddleware, adminMiddleware } from "../auth";
import { ContactError, placeholders, renderMessage, validateTemplate, accountPhone } from "./core";
import { loadConfig, safeConfig, saveConfig } from "./config";
import { providerStatus } from "./providers";
import { verification, requestOtp, verifyOtp, getContact, createContact } from "./contact-store";
import { startNotificationWorker } from "./worker";
import { registerTemplateDraftRoutes } from "./draft-routes";

const uuidOrId = (value:unknown) => {
  if(typeof value!=="string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))throw new ContactError("INVALID_ID");
  return value;
};
const handler=(fn:(req:Request,res:Response)=>Promise<any>)=>(req:Request,res:Response)=>{
  Promise.resolve(fn(req,res)).catch((e:any)=>{
    if(e instanceof ContactError)return res.status(e.status).json({error:e.code});
    const missing=e?.code==="42P01" || e?.code==="42703";
    res.status(503).json({error:missing?"NOTIFICATION_MIGRATION_REQUIRED":"NOTIFICATION_STORAGE_UNAVAILABLE"});
  });
};
function logFields(){
  return `id,enquiry_id,customer_id,property_id,recipient_type,recipient_id,channel,template_id,
    status,attempts,retryable,error_code,provider_message_id,created_at,sent_at`;
}
export async function listLogs(){
  return (await pool.query(`SELECT ${logFields()} FROM notification_jobs ORDER BY created_at DESC LIMIT 100`)).rows;
}

/** DB-backed fixed windows work across replicas and survive application restarts. */
function rateLimit(action:string,limit:number){
  return handler(async(req,res)=>{
    const {rows:[row]}=await pool.query(`INSERT INTO notification_rate_limits(user_id,action,window_start,request_count)
      VALUES($1,$2,date_trunc('minute',now()),1)
      ON CONFLICT(user_id,action) DO UPDATE SET
       request_count=CASE WHEN notification_rate_limits.window_start<date_trunc('minute',now()) THEN 1 ELSE notification_rate_limits.request_count+1 END,
       window_start=date_trunc('minute',now()) RETURNING request_count`,[req.user!.id,action]);
    if(row.request_count>limit)res.status(429).json({error:"RATE_LIMITED"});
    else (res.locals.rateLimitNext as NextFunction)();
  });
}
function limited(action:string,limit:number){
  const run=rateLimit(action,limit);
  return(req:Request,res:Response,next:NextFunction)=>{res.locals.rateLimitNext=next;run(req,res);};
}

export function registerNotificationRoutes(app:Express, options:{startWorker?:boolean}={}){
  registerTemplateDraftRoutes(app,limited);
  app.get("/api/property-contact/status",authMiddleware,handler(async(req,res)=>res.json(await verification(req.user!.id))));
  app.post("/api/property-contact/otp/request",authMiddleware,limited("otp_request",3),handler(async(req,res)=>{
    res.json(await requestOtp(req.user!.id));
  }));
  app.post("/api/property-contact/otp/verify",authMiddleware,limited("otp_verify",10),handler(async(req,res)=>{
    res.json(await verifyOtp(req.user!.id,req.body.code));
  }));
  app.get("/api/properties/:id/contact",authMiddleware,handler(async(req,res)=>{
    res.json(await getContact(req.user!.id,uuidOrId(req.params.id)));
  }));
  app.post("/api/properties/:id/contact",authMiddleware,limited("contact",20),handler(async(req,res)=>{
    const result=await createContact(req.user!.id,uuidOrId(req.params.id),req.body.consentConfirmed);
    res.status(result.created?201:200).json(result);
  }));
  app.get("/api/admin/notifications",authMiddleware,adminMiddleware,handler(async(_req,res)=>{
    const loaded=await loadConfig();
    res.json({templates:(await pool.query("SELECT * FROM notification_templates ORDER BY recipient_type,channel")).rows,
      settings:safeConfig(loaded),placeholders,logs:await listLogs(),
      providerStatus:await providerStatus(loaded.settings,loaded.encrypted)});
  }));
  app.put("/api/admin/notifications/settings",authMiddleware,adminMiddleware,handler(async(req,res)=>{
    res.json(await saveConfig(req.body));
  }));
  app.get("/api/admin/notifications/logs",authMiddleware,adminMiddleware,handler(async(_req,res)=>res.json(await listLogs())));
  app.get("/api/admin/notifications/enquiries",authMiddleware,adminMiddleware,handler(async(_req,res)=>{
    const {rows}=await pool.query(`SELECT enquiry_id AS id,context->>'property_title' AS property_title,
      context->>'customer_name' AS customer_name,created_at FROM property_contact_access ORDER BY created_at DESC LIMIT 100`);
    res.json(rows);
  }));
  const saveTemplate=async(req:Request,res:Response)=>{
    const id=uuidOrId(req.params.id || req.body.id);
    const body={...req.body};delete body.id;
    const data=validateTemplate(body);
    if(!Object.keys(data).length)throw new ContactError("EMPTY_UPDATE");
    // All column names come exclusively from validateTemplate's whitelist.
    const values=Object.values(data).map((v:any)=>Array.isArray(v)?JSON.stringify(v):v);
    const sets=Object.keys(data).map((k,i)=>`${k}=$${i+2}${k==="parameter_keys"?"::jsonb":""}`);
    const {rows:[saved]}=await pool.query(`UPDATE notification_templates SET ${sets.join(",")},updated_at=now() WHERE id=$1 RETURNING *`,[id,...values]);
    if(!saved)throw new ContactError("TEMPLATE_NOT_FOUND",404);
    res.json(saved);
  };
  app.patch("/api/admin/notifications/templates/:id",authMiddleware,adminMiddleware,handler(saveTemplate));
  // Nine canonical rows are created by migration; this endpoint restores a deleted row
  // only through an explicit typed create, never invents recipient/channel values.
  app.post("/api/admin/notifications/templates",authMiddleware,adminMiddleware,handler(async(req,res)=>{
    const {recipient_type,channel,...fields}=req.body;
    if(!["customer","owner","admin"].includes(recipient_type) || !["whatsapp","sms","email"].includes(channel))throw new ContactError("INVALID_TEMPLATE_KIND");
    const data=validateTemplate(fields);
    if(!data.template_name || !data.message_body)throw new ContactError("TEMPLATE_NAME_AND_BODY_REQUIRED");
    const id=`${recipient_type}_${channel}`;
    const {rows:[saved]}=await pool.query(`INSERT INTO notification_templates(id,template_name,recipient_type,channel,
      subject,message_body,is_enabled,meta_template_name,meta_language,parameter_keys,sms_template_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) ON CONFLICT DO NOTHING RETURNING *`,
      [id,data.template_name,recipient_type,channel,data.subject||"",data.message_body,data.is_enabled||false,
      data.meta_template_name||"",data.meta_language||"en_US",JSON.stringify(data.parameter_keys||[]),data.sms_template_id||""]);
    if(!saved)throw new ContactError("TEMPLATE_ALREADY_EXISTS",409);
    res.status(201).json(saved);
  }));
  app.post("/api/admin/notifications/templates/:id/preview",authMiddleware,adminMiddleware,handler(async(req,res)=>{
    const {rows:[t]}=await pool.query("SELECT * FROM notification_templates WHERE id=$1",[uuidOrId(req.params.id)]);
    if(!t)throw new ContactError("TEMPLATE_NOT_FOUND",404);
    let values:Record<string,string>={};
    if(req.body.enquiryId){
      const {rows:[c]}=await pool.query("SELECT context FROM property_contact_access WHERE enquiry_id=$1",[uuidOrId(req.body.enquiryId)]);
      if(!c)throw new ContactError("ENQUIRY_NOT_FOUND",404);
      values=c.context;
    }else{
      if(req.body.values && (typeof req.body.values!=="object" || Array.isArray(req.body.values)))throw new ContactError("INVALID_PREVIEW_VALUES");
      for(const [k,v] of Object.entries(req.body.values||{})){
        if(!placeholders.includes(k as any) || typeof v!=="string" || v.length>2048)throw new ContactError("INVALID_PREVIEW_VALUES");
        values[k]=v;
      }
    }
    res.json({subject:renderMessage(t.subject,values),body:renderMessage(t.message_body,values),
      parameters:t.parameter_keys.map((k:string)=>values[k]||"Not provided")});
  }));
  app.post("/api/admin/notifications/templates/:id/test",authMiddleware,adminMiddleware,limited("notification_test",1),handler(async(req,res)=>{
    if(req.body.consentConfirmed!==true)throw new ContactError("RECIPIENT_CONSENT_REQUIRED");
    const {rows:[t]}=await pool.query("SELECT * FROM notification_templates WHERE id=$1",[uuidOrId(req.params.id)]);
    if(!t || t.channel==="chat")throw new ContactError("NOTIFICATION_TEMPLATE_REQUIRED");
    if(!t.is_enabled)throw new ContactError("TEMPLATE_DISABLED");
    const {rows:[c]}=await pool.query("SELECT * FROM property_contact_access WHERE enquiry_id=$1",[uuidOrId(req.body.enquiryId)]);
    if(!c)throw new ContactError("ENQUIRY_NOT_FOUND",404);
    let recipient=req.body.recipient;
    if(typeof recipient!=="string" || recipient.length>254)throw new ContactError("INVALID_RECIPIENT");
    if(t.channel==="email"){
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))throw new ContactError("INVALID_EMAIL");
    }else recipient=accountPhone(recipient);
    const id=randomUUID();
    await pool.query(`INSERT INTO notification_jobs(id,enquiry_id,customer_id,property_id,recipient_type,recipient,channel,template_id,test_key,consent_confirmed)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
      [id,c.enquiry_id,c.customer_id,c.property_id,t.recipient_type,recipient,t.channel,t.id,randomUUID()]);
    res.status(202).json({id,status:"pending"});
  }));
  app.post("/api/admin/notifications/retry/:id",authMiddleware,adminMiddleware,limited("notification_retry",5),handler(async(req,res)=>{
    const {rowCount}=await pool.query(`UPDATE notification_jobs SET status='pending',next_attempt_at=now(),updated_at=now()
      WHERE id=$1 AND status='failed' AND retryable=true AND attempts<6`,[uuidOrId(req.params.id)]);
    if(!rowCount)throw new ContactError("NOT_SAFE_TO_RETRY");
    res.json({success:true});
  }));
  if(options.startWorker!==false)startNotificationWorker();
}
