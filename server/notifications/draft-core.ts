import { ContactError, placeholders, renderMessage, validateTemplate } from "./core";

export type Draft = {
  id:string;version:number;template_name:string;channel:"whatsapp"|"sms"|"email";
  recipient_type:"customer"|"owner"|"admin";subject:string;message_body:string;
  meta_template_name:string;meta_language:string;meta_category:"UTILITY"|"MARKETING";
  parameter_keys:string[];sms_template_id:string;example_values:Record<string,string>;
  meta_template_id:string;meta_account_id:string;provider_status:string;
  provider_error_code:string|null;provider_body:string|null;last_synced_at:string|null;
  archived:boolean;updated_at:string;created_at:string;
};
export const editableFields=["template_name","channel","recipient_type","subject","message_body",
  "meta_template_name","meta_language","meta_category","sms_template_id","example_values"] as const;

export function bodyKeys(text:string):string[]{
  renderMessage(text,{});
  return Array.from(new Set(Array.from(text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g),m=>m[1])));
}
export function validateDraft(input:any, old?:Draft):Record<string,any>{
  if(!input || typeof input!=="object" || Array.isArray(input) ||
    Object.keys(input).some(k=>!(editableFields as readonly string[]).includes(k)))
    throw new ContactError("INVALID_DRAFT");
  const value={template_name:"",subject:"",message_body:"",meta_template_name:"",meta_language:"en_US",
    meta_category:"UTILITY",sms_template_id:"",example_values:{},...old,...input};
  if(!["whatsapp","sms","email"].includes(value.channel) ||
    !["customer","owner","admin"].includes(value.recipient_type))throw new ContactError("INVALID_TEMPLATE_KIND");
  if(old && (value.channel!==old.channel || value.recipient_type!==old.recipient_type))
    throw new ContactError("DRAFT_KIND_IMMUTABLE");
  if(old?.channel==="whatsapp" && (old.meta_template_id || !["DRAFT","ERROR"].includes(old.provider_status)))
    throw new ContactError("SUBMITTED_TEMPLATE_READ_ONLY_DUPLICATE_TO_EDIT",409);
  const fields:Record<string,any>={};
  for(const k of editableFields)fields[k]=value[k];
  for(const k of ["template_name","subject","message_body","meta_template_name","meta_language","sms_template_id"])
    if(typeof fields[k]!=="string")throw new ContactError("INVALID_DRAFT");
  fields.message_body=fields.message_body.replace(/\r\n/g,"\n");
  validateTemplate(Object.fromEntries(["template_name","subject","message_body","meta_template_name",
    "meta_language","sms_template_id"].map(k=>[k,fields[k]])));
  if(!fields.template_name.trim())throw new ContactError("TEMPLATE_NAME_REQUIRED");
  if(!["UTILITY","MARKETING"].includes(fields.meta_category))throw new ContactError("INVALID_META_CATEGORY");
  if(fields.channel==="whatsapp" && fields.message_body.length>1024)throw new ContactError("WHATSAPP_BODY_MAX_1024");
  if(fields.channel==="email" && !fields.subject.trim())throw new ContactError("EMAIL_SUBJECT_REQUIRED");
  const examples=fields.example_values;
  if(!examples || typeof examples!=="object" || Array.isArray(examples) || Object.keys(examples).length>placeholders.length ||
    Object.entries(examples).some(([k,v])=>!placeholders.includes(k as any) || typeof v!=="string" || v.length>1024))
    throw new ContactError("INVALID_EXAMPLE_VALUES");
  fields.parameter_keys=bodyKeys(fields.message_body);
  return fields;
}
export function metaPayload(draft:Draft){
  if(!draft.meta_template_name || !/^[a-z0-9_]{1,250}$/.test(draft.meta_template_name))
    throw new ContactError("META_TEMPLATE_NAME_REQUIRED");
  const keys=bodyKeys(draft.message_body);
  const samples=keys.map(k=>{
    const value=draft.example_values[k];
    if(!value?.trim())throw new ContactError("META_REVIEW_EXAMPLES_REQUIRED");
    return value;
  });
  const body=draft.message_body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g,(_,key)=>`{{${keys.indexOf(key)+1}}}`);
  return {name:draft.meta_template_name,language:draft.meta_language,category:draft.meta_category,
    components:[{type:"BODY",text:body,...(samples.length?{example:{body_text:[samples]}}:{})}]};
}
export function requireVersion(version:unknown){
  if(!Number.isInteger(version) || Number(version)<1)throw new ContactError("DRAFT_VERSION_REQUIRED");
  return Number(version);
}
