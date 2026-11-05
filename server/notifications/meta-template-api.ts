import { ContactError, safeProviderCode } from "./core";
import { type Draft, metaPayload } from "./draft-core";

export type MetaContext={token:string;account:string;version:string};
export async function metaContext():Promise<MetaContext>{
  let env;
  try{env=(await (await import("../whatsapp/settings-store")).loadWhatsAppSettings()).environment;}
  catch(e:any){throw new ContactError(safeProviderCode(e),503);}
  const token=env.WHATSAPP_ACCESS_TOKEN?.trim();
  const account=env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
  const version=env.WHATSAPP_API_VERSION?.trim();
  if(!token || !account || !version)throw new ContactError("META_MANAGEMENT_CONFIGURATION_REQUIRED",503);
  if(!/^\d+$/.test(account) || !/^v\d+\.\d+$/.test(version))throw new ContactError("INVALID_META_MANAGEMENT_CONFIGURATION");
  return {token,account,version};
}
export async function graphTemplates(context:MetaContext,method:"GET"|"POST",body?:any,fetcher:typeof fetch=fetch){
  const url=new URL(`https://graph.facebook.com/${context.version}/${context.account}/message_templates`);
  if(method==="GET"){
    url.searchParams.set("name",body.name);
    url.searchParams.set("fields","id,name,language,status,category,components");
    url.searchParams.set("limit","100");
  }
  let response:Response,data:any;
  try{
    response=await fetcher(url,{method,redirect:"error",signal:AbortSignal.timeout(15000),
      headers:{Authorization:`Bearer ${context.token}`,"Content-Type":"application/json"},
      ...(method==="POST"?{body:JSON.stringify(body)}:{})});
    const text=await response.text();
    if(text.length>1_000_000)throw new Error();
    data=JSON.parse(text);
  }catch{throw new ContactError(method==="POST"?"META_TEMPLATE_REQUEST_OUTCOME_UNKNOWN":"META_TEMPLATE_STATUS_UNAVAILABLE",502);}
  if(!response.ok || data.error){
    const status=response.status;
    if(status>=500)throw new ContactError(method==="POST"?"META_TEMPLATE_REQUEST_OUTCOME_UNKNOWN":"META_TEMPLATE_STATUS_UNAVAILABLE",502);
    if(status===401 || data.error?.code===190)throw new ContactError("META_AUTHORIZATION_FAILED",502);
    if(status===403 || [10,200].includes(data.error?.code))throw new ContactError("META_TEMPLATE_MANAGEMENT_PERMISSION_REQUIRED",502);
    if(status===429)throw new ContactError("META_RATE_LIMITED",429);
    const code=Number.isSafeInteger(data.error?.code)?`_${data.error.code}`:"";
    const subcode=Number.isSafeInteger(data.error?.error_subcode)?`_${data.error.error_subcode}`:"";
    throw new ContactError(`META_TEMPLATE_REQUEST_REJECTED${code}${subcode}`,502);
  }
  return data;
}
export function providerStatus(value:any):string{
  return ["PENDING","APPROVED","REJECTED","PAUSED","DISABLED","IN_APPEAL","PENDING_DELETION","DELETED","LIMIT_EXCEEDED"]
    .includes(value)?value:"UNKNOWN";
}
/** Lookups always use the saved WABA, never a user-controlled URL or access token. */
export async function lookupTemplate(draft:Draft,context:MetaContext,fetcher:typeof fetch=fetch){
  if(draft.meta_account_id && draft.meta_account_id!==context.account)
    throw new ContactError("META_ACCOUNT_CHANGED_DUPLICATE_TEMPLATE",409);
  const data=await graphTemplates(context,"GET",{name:draft.meta_template_name},fetcher);
  if(!Array.isArray(data.data))throw new ContactError("META_TEMPLATE_STATUS_UNAVAILABLE",502);
  const remote=data.data.find((t:any)=>t.name===draft.meta_template_name && t.language===draft.meta_language);
  if(!remote)throw new ContactError("META_TEMPLATE_NOT_FOUND_VERIFY_IN_MANAGER",404);
  const remoteBody=Array.isArray(remote.components)?remote.components.find((c:any)=>c.type==="BODY" || c.type==="body")?.text:undefined;
  const body=metaPayload(draft).components[0].text;
  const extras=remote.components?.some((c:any)=>!["BODY","body"].includes(c.type));
  if(remoteBody!==body || extras)throw new ContactError("META_TEMPLATE_CONTENT_MISMATCH",409);
  if(!/^\d+$/.test(String(remote.id)))throw new ContactError("INVALID_META_TEMPLATE_RESPONSE",502);
  return {id:String(remote.id),status:providerStatus(remote.status),body:remoteBody,account:context.account};
}
