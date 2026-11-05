import type { Express, RequestHandler } from "express";
import { pool } from "../db";
import { authMiddleware, adminMiddleware } from "../auth";
import { ContactError, placeholders, renderMessage } from "./core";
import { getDraft, createDraft, updateDraft, archiveDraft, submitDraft, syncDraft, applyDraft } from "./draft-store";

export function registerTemplateDraftRoutes(app:Express,limited:(action:string,limit:number)=>RequestHandler){
  const path="/api/admin/notifications/drafts";
  const handle=(fn:(req:any,res:any)=>Promise<any>):RequestHandler=>(req,res)=>{
    Promise.resolve(fn(req,res)).catch((e:any)=>{
      if(e instanceof ContactError)return res.status(e.status).json({error:e.code});
      res.status(503).json({error:["42P01","42703"].includes(e?.code)?"TEMPLATE_DRAFT_MIGRATION_REQUIRED":"TEMPLATE_DRAFT_STORAGE_UNAVAILABLE"});
    });
  };
  const id=(value:any)=>{
    if(typeof value!=="string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))throw new ContactError("INVALID_ID");
    return value;
  };
  const admin=[authMiddleware,adminMiddleware];
  app.get(path,...admin,handle(async(_req,res)=>{
    const {rows}=await pool.query("SELECT * FROM notification_template_drafts WHERE archived=false ORDER BY updated_at DESC LIMIT 500");
    res.json({drafts:rows,placeholders});
  }));
  app.post(path,...admin,limited("create_template_draft",30),handle(async(req,res)=>{
    res.status(201).json(await createDraft(req.body));
  }));
  app.patch(`${path}/:id`,...admin,handle(async(req,res)=>res.json(await updateDraft(id(req.params.id),req.body))));
  app.delete(`${path}/:id`,...admin,handle(async(req,res)=>{
    await archiveDraft(id(req.params.id),req.body?.version);res.json({success:true});
  }));
  app.post(`${path}/:id/preview`,...admin,handle(async(req,res)=>{
    const draft=await getDraft(id(req.params.id));
    let values:Record<string,string>={...draft.example_values};
    if(req.body?.enquiryId){
      const {rows:[contact]}=await pool.query("SELECT context FROM property_contact_access WHERE enquiry_id=$1",[id(req.body.enquiryId)]);
      if(!contact)throw new ContactError("ENQUIRY_NOT_FOUND",404);
      values=contact.context;
    }else if(req.body?.values!==undefined){
      const input=req.body.values;
      if(!input || typeof input!=="object" || Array.isArray(input) || Object.keys(input).length>placeholders.length ||
        Object.entries(input).some(([k,v])=>!placeholders.includes(k as any) || typeof v!=="string" || v.length>2048))
        throw new ContactError("INVALID_PREVIEW_VALUES");
      values={...values,...input};
    }
    res.json({subject:renderMessage(draft.subject,values),body:renderMessage(draft.message_body,values),
      parameters:draft.parameter_keys.map(k=>values[k]||"Not provided")});
  }));
  app.post(`${path}/:id/submit`,...admin,limited("meta_template_submit",5),handle(async(req,res)=>{
    res.json(await submitDraft(id(req.params.id),req.body?.version));
  }));
  app.post(`${path}/:id/sync`,...admin,limited("meta_template_sync",20),handle(async(req,res)=>{
    res.json(await syncDraft(id(req.params.id),req.body?.version));
  }));
  app.post(`${path}/:id/apply`,...admin,limited("template_draft_apply",10),handle(async(req,res)=>{
    res.json(await applyDraft(id(req.params.id),req.body?.version,req.body?.confirmReplace));
  }));
}
