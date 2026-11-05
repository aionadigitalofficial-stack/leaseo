import test from "node:test";
import assert from "node:assert/strict";
import { accountPhone, renderMessage, whatsappLink, validateTemplate, ContactError, safeProviderCode } from "./core";

test("known placeholders use values and missing data has no raw placeholders",()=>{
  assert.equal(renderMessage("Hello {{customer_name}}, {{property_title}} / {{customer_email}}",
    {customer_name:"Asha",property_title:"Flat B"}),"Hello Asha, Flat B / Not provided");
  assert.throws(()=>renderMessage("{{password}}",{}),ContactError);
  assert.throws(()=>renderMessage("{{ broken",{}),ContactError);
});
test("phone country code is not duplicated and chat message is encoded",()=>{
  assert.equal(accountPhone("9876543210","+91"),"919876543210");
  assert.equal(accountPhone("+91 9876543210"),"919876543210");
  assert.equal(accountPhone("+1 (202) 555-0123"),"12025550123");
  assert.equal(accountPhone("+4412345678"),"4412345678");
  assert.equal(whatsappLink("4412345678","Hi"),"https://wa.me/4412345678?text=Hi");
  assert.equal(whatsappLink("+919876543210","A & B"),"https://wa.me/919876543210?text=A%20%26%20B");
  assert.throws(()=>accountPhone("123"),ContactError);
});
test("template updates whitelist columns and validate parameters and placeholders",()=>{
  assert.throws(()=>validateTemplate({id:"x",message_body:"hi"}),ContactError);
  assert.throws(()=>validateTemplate({is_enabled:"true"}),ContactError);
  assert.throws(()=>validateTemplate({parameter_keys:["secret"]}),ContactError);
  assert.throws(()=>validateTemplate({message_body:" "}),ContactError);
  assert.throws(()=>validateTemplate({meta_template_name:"Invalid name"}),ContactError);
  assert.equal(validateTemplate({message_body:"Hello {{owner_name}}",parameter_keys:["owner_name"]}).message_body,"Hello {{owner_name}}");
});
test("provider errors are reduced to safe codes, never raw response text",()=>{
  assert.equal(safeProviderCode(new Error("token=secret")),"PROVIDER_REQUEST_OUTCOME_UNKNOWN");
  assert.equal(safeProviderCode(new ContactError("PROVIDER_HTTP_403")),"PROVIDER_HTTP_403");
});
