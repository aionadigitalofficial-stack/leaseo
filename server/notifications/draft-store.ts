import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { ContactError, safeProviderCode } from "./core";
import { type Draft, validateDraft, requireVersion, metaPayload } from "./draft-core";
import { metaContext, graphTemplates, lookupTemplate, providerStatus } from "./meta-template-api";

const jsonColumns=new Set(["parameter_keys","example_values"]);
const encode=(key:string,value:any)=>jsonColumns.has(key)?JSON.stringify(value):value;
export async function getDraft(id:string):Promise<Draft>{
  const {rows:[draft]}=await pool.query("SELECT * FROM notification_template_drafts WHERE id=$1 AND archived=false",[id]);
  if(!draft)throw new ContactError("DRAFT_NOT_FOUND",404);
  return draft;
}
export async function createDraft(input:any){
  const fields=validateDraft(input);
  const keys=Object.keys(fields);
  const {rows:[draft]}=await pool.query(`INSERT INTO notification_template_drafts(id,${keys.join(",")})
    VALUES($1,${keys.map((k,i)=>`$${i+2}${jsonColumns.has(k)?"::jsonb":""}`).join(",")}) RETURNING *`,
    [randomUUID(),...keys.map(k=>encode(k,fields[k]))]);
  return draft;
}
export async function updateDraft(id:string,body:any){
  const {version,...input}=body||{};
  const expected=requireVersion(version);
  const old=await getDraft(id);
  if(old.version!==expected)throw new ContactError("DRAFT_CHANGED_RELOAD",409);
  const fields=validateDraft(input,old);
  const keys=Object.keys(fields);
  const {rows:[saved]}=await pool.query(`UPDATE notification_template_drafts SET
    ${keys.map((k,i)=>`${k}=$${i+3}${jsonColumns.has(k)?"::jsonb":""}`).join(",")},
    provider_error_code=NULL,version=version+1,updated_at=now()
    WHERE id=$1 AND version=$2 AND archived=false RETURNING *`,
    [id,expected,...keys.map(k=>encode(k,fields[k]))]);
  if(!saved)throw new ContactError("DRAFT_CHANGED_RELOAD",409);
  return saved;
}
export async function archiveDraft(id:string,version:any){
  const {rowCount}=await pool.query(`UPDATE notification_template_drafts SET archived=true,version=version+1,updated_at=now()
    WHERE id=$1 AND version=$2 AND archived=false AND provider_status<>'SUBMITTING'`,[id,requireVersion(version)]);
  if(!rowCount)throw new ContactError("DRAFT_CHANGED_OR_SUBMITTING_RELOAD",409);
}

/** No API token, raw Meta response or user-controlled SQL column is persisted here. */
export async function submitDraft(id:string,version:any){
  const draft=await getDraft(id);
  if(draft.version!==requireVersion(version))throw new ContactError("DRAFT_CHANGED_RELOAD",409);
  if(draft.channel!=="whatsapp")throw new ContactError("WHATSAPP_DRAFT_REQUIRED");
  if(draft.meta_template_id || !["DRAFT","ERROR"].includes(draft.provider_status))
    throw new ContactError("ALREADY_SUBMITTED_REFRESH_STATUS",409);
  const payload=metaPayload(draft);
  const context=await metaContext();
  const {rows:[claimed]}=await pool.query(`UPDATE notification_template_drafts SET provider_status='SUBMITTING',
    provider_error_code=NULL,meta_account_id=$3,version=version+1,updated_at=now()
    WHERE id=$1 AND version=$2 AND archived=false RETURNING *`,[id,draft.version,context.account]);
  if(!claimed)throw new ContactError("DRAFT_CHANGED_RELOAD",409);
  let response:any;
  try{
    response=await graphTemplates(context,"POST",payload);
    if(!/^\d+$/.test(String(response.id)))throw new ContactError("META_TEMPLATE_REQUEST_OUTCOME_UNKNOWN",502);
  }catch(error){
    const code=safeProviderCode(error);
    const unknown=code.includes("UNKNOWN");
    await pool.query(`UPDATE notification_template_drafts SET provider_status=$3,provider_error_code=$4,
      version=version+1,updated_at=now() WHERE id=$1 AND version=$2`,
      [id,claimed.version,unknown?"UNKNOWN":"ERROR",code]);
    throw error;
  }
  // If persistence fails after acceptance, SUBMITTING stays locked. Status lookup
  // recovers it later without repeating the external create request.
  const {rows:[saved]}=await pool.query(`UPDATE notification_template_drafts SET meta_template_id=$3,
    provider_status=$4,provider_error_code=NULL,version=version+1,updated_at=now()
    WHERE id=$1 AND version=$2 RETURNING *`,[id,claimed.version,String(response.id),providerStatus(response.status)]);
  if(!saved)throw new ContactError("META_ACCEPTED_REFRESH_STATUS",409);
  return saved;
}
export async function syncDraft(id:string,version:any){
  const draft=await getDraft(id);
  if(draft.version!==requireVersion(version))throw new ContactError("DRAFT_CHANGED_RELOAD",409);
  if(draft.channel!=="whatsapp" || !draft.meta_template_name)throw new ContactError("WHATSAPP_NAMED_DRAFT_REQUIRED");
  if(draft.provider_status==="SUBMITTING" && Date.now()-new Date(draft.updated_at).getTime()<60000)
    throw new ContactError("META_SUBMISSION_IN_PROGRESS",409);
  const context=await metaContext();
  let remote;
  try{remote=await lookupTemplate(draft,context);}
  catch(e){
    // A failed status request must not leave an old APPROVED badge looking fresh.
    await pool.query(`UPDATE notification_template_drafts SET provider_error_code=$3,
      version=version+1,updated_at=now() WHERE id=$1 AND version=$2`,[id,draft.version,safeProviderCode(e)]);
    throw e;
  }
  const {rows:[saved]}=await pool.query(`UPDATE notification_template_drafts SET meta_template_id=$3,meta_account_id=$4,
    provider_status=$5,provider_body=$6,provider_error_code=NULL,last_synced_at=now(),
    version=version+1,updated_at=now() WHERE id=$1 AND version=$2 AND archived=false RETURNING *`,
    [id,draft.version,remote.id,remote.account,remote.status,remote.body]);
  if(!saved)throw new ContactError("DRAFT_CHANGED_RELOAD",409);
  return saved;
}
export async function applyDraft(id:string,version:any,confirmed:any){
  if(confirmed!==true)throw new ContactError("CONFIRM_REPLACE_REQUIRED");
  let draft=await getDraft(id);
  if(draft.version!==requireVersion(version))throw new ContactError("DRAFT_CHANGED_RELOAD",409);
  // Never trust a stale local APPROVED badge or a template in a previous WABA.
  if(draft.channel==="whatsapp"){
    draft=await syncDraft(id,version);
    if(draft.provider_status!=="APPROVED")throw new ContactError("META_APPROVAL_REQUIRED",409);
  }
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const {rows:[current]}=await client.query("SELECT * FROM notification_template_drafts WHERE id=$1 AND archived=false FOR UPDATE",[id]);
    if(!current || current.version!==draft.version)throw new ContactError("DRAFT_CHANGED_RELOAD",409);
    const {rows:[template]}=await client.query(`UPDATE notification_templates SET template_name=$2,subject=$3,
      message_body=$4,meta_template_name=$5,meta_language=$6,parameter_keys=$7::jsonb,
      sms_template_id=$8,is_enabled=false,updated_at=now() WHERE id=$1 RETURNING *`,
      [`${current.recipient_type}_${current.channel}`,current.template_name,current.subject,current.message_body,
        current.meta_template_name,current.meta_language,JSON.stringify(current.parameter_keys),current.sms_template_id]);
    if(!template)throw new ContactError("CANONICAL_TEMPLATE_MISSING_RUN_MIGRATION",409);
    await client.query("COMMIT");
    return template;
  }catch(e){await client.query("ROLLBACK");throw e;}
  finally{client.release();}
}
