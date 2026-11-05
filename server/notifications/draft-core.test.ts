import test from "node:test";
import assert from "node:assert/strict";
import { bodyKeys, validateDraft, metaPayload, requireVersion } from "./draft-core";
import { graphTemplates, lookupTemplate } from "./meta-template-api";

const input={template_name:"New enquiry",channel:"whatsapp",recipient_type:"owner",
  message_body:"Hello {{owner_name}}, {{customer_name}} asked about {{property_title}}. Thank you {{owner_name}}.",
  meta_template_name:"leaseo_enquiry",meta_language:"en_US",example_values:{
    owner_name:"Example Owner",customer_name:"Example Customer",property_title:"Example Apartment",
  }};
const draft=()=>({...validateDraft(input),id:"draft-test",version:1,meta_template_id:"",
  meta_account_id:"",provider_status:"DRAFT"}) as any;
const context={token:"synthetic-token-not-real",account:"12345",version:"v24.0"};
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status});

test("draft variables preserve first appearance and repeated variables reuse a position",()=>{
  assert.deepEqual(bodyKeys(input.message_body),["owner_name","customer_name","property_title"]);
  const payload=metaPayload(draft());
  assert.equal(payload.components[0].text,"Hello {{1}}, {{2}} asked about {{3}}. Thank you {{1}}.");
  assert.deepEqual(payload.components[0].example?.body_text,[["Example Owner","Example Customer","Example Apartment"]]);
});
test("draft validation rejects injection, unknown variables, and missing email subject",()=>{
  assert.throws(()=>validateDraft({...input,provider_status:"APPROVED"}),{code:"INVALID_DRAFT"});
  assert.throws(()=>validateDraft({...input,message_body:"Hello {{not_supported}}"}),{code:"UNKNOWN_PLACEHOLDER"});
  assert.throws(()=>validateDraft({...input,channel:"email"}),{code:"EMAIL_SUBJECT_REQUIRED"});
  assert.throws(()=>validateDraft({...input,message_body:"x".repeat(1025)}),{code:"WHATSAPP_BODY_MAX_1024"});
  assert.throws(()=>validateDraft({...input,subject:"Hi\r\nBcc:other@example.invalid"}),{code:"INVALID_EMAIL_SUBJECT"});
  assert.throws(()=>validateDraft({...input,example_values:{owner_name:123}}),{code:"INVALID_EXAMPLE_VALUES"});
});
test("Meta requires examples and a valid name; submitted templates are immutable",()=>{
  assert.throws(()=>metaPayload({...draft(),example_values:{}}),{code:"META_REVIEW_EXAMPLES_REQUIRED"});
  assert.throws(()=>metaPayload({...draft(),meta_template_name:""}),{code:"META_TEMPLATE_NAME_REQUIRED"});
  assert.throws(()=>validateDraft({message_body:"Changed"}, {...draft(),provider_status:"PENDING"}),{code:"SUBMITTED_TEMPLATE_READ_ONLY_DUPLICATE_TO_EDIT"});
  assert.throws(()=>validateDraft({channel:"email"},draft()),{code:"DRAFT_KIND_IMMUTABLE"});
  assert.throws(()=>requireVersion("1"),{code:"DRAFT_VERSION_REQUIRED"});
  assert.equal(requireVersion(1),1);
});
test("Meta submission uses fixed host and Authorization header, not URL credentials",async()=>{
  const payload=metaPayload(draft());
  const result=await graphTemplates(context,"POST",payload,(async(url,init)=>{
    assert.equal(String(url),"https://graph.facebook.com/v24.0/12345/message_templates");
    assert.ok(!String(url).includes(context.token));
    assert.equal((init?.headers as any).Authorization,`Bearer ${context.token}`);
    assert.deepEqual(JSON.parse(String(init?.body)),payload);
    return json({id:"789",status:"PENDING"});
  }) as typeof fetch);
  assert.equal(result.status,"PENDING");
});
test("Meta permission/auth errors do not return provider payloads or tokens",async()=>{
  await assert.rejects(()=>graphTemplates(context,"POST",{},(async()=>json({
    error:{code:190,message:`Never display ${context.token}`},
  },401)) as typeof fetch),{code:"META_AUTHORIZATION_FAILED"});
  await assert.rejects(()=>graphTemplates(context,"POST",{},(async()=>json({
    error:{code:200,message:"Missing management scope"},
  },403)) as typeof fetch),{code:"META_TEMPLATE_MANAGEMENT_PERMISSION_REQUIRED"});
  await assert.rejects(()=>graphTemplates(context,"POST",{},(async()=>{throw new Error(context.token);}) as typeof fetch),
    {code:"META_TEMPLATE_REQUEST_OUTCOME_UNKNOWN"});
});
test("status lookup requires same account and exact body with no unsupported components",async()=>{
  const d=draft();
  const remote={id:"789",name:d.meta_template_name,language:"en_US",status:"APPROVED",components:metaPayload(d).components};
  const fetcher=(async()=>json({data:[remote]})) as typeof fetch;
  assert.equal((await lookupTemplate(d,context,fetcher)).status,"APPROVED");
  await assert.rejects(()=>lookupTemplate({...d,meta_account_id:"999"},context,fetcher),{code:"META_ACCOUNT_CHANGED_DUPLICATE_TEMPLATE"});
  await assert.rejects(()=>lookupTemplate(d,context,(async()=>json({data:[{...remote,components:[{type:"BODY",text:"Different approved content"}]}]})) as typeof fetch),
    {code:"META_TEMPLATE_CONTENT_MISMATCH"});
  await assert.rejects(()=>lookupTemplate(d,context,(async()=>json({data:[{...remote,components:[...remote.components,{type:"FOOTER",text:"Extra"}]}]})) as typeof fetch),
    {code:"META_TEMPLATE_CONTENT_MISMATCH"});
});
