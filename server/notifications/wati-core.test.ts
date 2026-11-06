import test from "node:test";
import assert from "node:assert/strict";
import { watiHost, watiSettingsInput, watiPayload, watiResult, watiEvent, sameSecret } from "./wati-core";

test("WATI restricts hosts and rejects credential-bearing or non-HTTPS URLs", () => {
  assert.equal(watiHost("https://live-mt-server.wati.io/"), "https://live-mt-server.wati.io");
  for (const host of ["http://live-mt-server.wati.io", "https://localhost", "https://wati.io.evil.invalid",
    "https://127.0.0.1", "https://live-mt-server.wati.io/12345", "https://a:b@live-mt-server.wati.io",
    "https://live-mt-server.wati.io:8443", "https://live-mt-server.wati.io?token=secret"]) {
    assert.throws(() => watiHost(host), { code: "WATI_API_HOST_INVALID" });
  }
});
test("WATI validates settings and never accepts provider activation or injected keys", () => {
  const input = { apiHost: "https://live-mt-server.wati.io", channel: "919000000001", apiToken: "" };
  assert.deepEqual(watiSettingsInput(input), input);
  assert.throws(() => watiSettingsInput({ ...input, apiToken: "Bearer secret" }), { code: "WATI_TOKEN_INVALID" });
  assert.throws(() => watiSettingsInput({ ...input, channel: "+919000000001" }), { code: "WATI_CHANNEL_INVALID" });
  assert.throws(() => watiSettingsInput({ ...input, whatsappEnabled: true }), { code: "WATI_SETTINGS_INVALID" });
});
test("WATI V3 payload binds actual named values and never sends a session message", () => {
  const data = watiPayload("attempt", "9000000002",
    { meta_template_name: "leaseo_customer_enquiry", parameter_keys: ["customer_name", "property_title", "customer_name"] },
    { customer_name: "Sample Customer", property_title: "Test Office" }, "919000000001");
  assert.equal(data.channel, "919000000001");
  assert.equal(data.recipients[0].target, "919000000002");
  assert.deepEqual(data.recipients[0].custom_params, [
    { name: "customer_name", value: "Sample Customer" }, { name: "property_title", value: "Test Office" },
  ]);
  assert.throws(() => watiPayload("id","9000000002",{ meta_template_name:"",parameter_keys:[] },{},""),
    { code:"WATI_APPROVED_TEMPLATE_REQUIRED" });
  assert.throws(() => watiPayload("id","9000000002",{ meta_template_name:"enquiry",parameter_keys:["property_title"] },{},""),
    { code:"WATI_TEMPLATE_VALUE_MISSING_OR_TOO_LONG" });
});
test("WATI distinguishes accepted, business rejection, partial and unknown outcomes", () => {
  const good = { success:true,broadcast_id:"broadcast",recipients:[{ local_message_id:"id",target:"919000000002",errors:[] }] };
  assert.equal(watiResult(good,"id","919000000002"),"broadcast");
  assert.throws(() => watiResult({success:false,error:"private raw provider text"},"id","919000000002"), {code:"WATI_SEND_REJECTED"});
  for (const bad of [{...good,recipients:[]}, {...good,broadcast_id:null},
    {...good,recipients:[{local_message_id:"another",errors:[]}]}]) {
    assert.throws(() => watiResult(bad,"id","919000000002"),{code:"WATI_SEND_OUTCOME_UNKNOWN"});
  }
  assert.throws(() => watiResult({...good,recipients:[{local_message_id:"id",errors:["not allowed"]}]},"id","919000000002"),
    {code:"WATI_RECIPIENT_REJECTED"});
});
test("WATI authenticates callbacks and only keeps safe correlation data", () => {
  assert.equal(sameSecret("test-secret","test-secret"),true);
  assert.equal(sameSecret(["test-secret"],"test-secret"),false);
  assert.equal(sameSecret("wrong","test-secret"),false);
  const body = {eventType:"sentMessageDELIVERED_v2",localMessageId:"local",id:"wati-id",channelPhoneNumber:"919000000001",text:"private body",operatorEmail:"private@example.invalid"};
  const first = watiEvent(body,"919000000001")!;
  assert.equal(first.status,"delivered");
  assert.equal(JSON.stringify(first).includes("private"),false);
  assert.equal(first.key,watiEvent({...body,timestamp:"1234"},"919000000001")!.key);
  assert.notEqual(first.key,watiEvent({...body,eventType:"sentMessageREAD_v2"},"919000000001")!.key);
  assert.equal(watiEvent({eventType:"message"},""),null);
  assert.throws(() => watiEvent(body,"919000000099"),{code:"WATI_CHANNEL_MISMATCH"});
  assert.throws(() => watiEvent({eventType:"sentMessageREAD_v2"},""),{code:"WATI_EVENT_IDENTIFIERS_REQUIRED"});
  assert.equal(watiEvent({eventType:"templateMessageFailed",localMessageId:"id",failedCode:"131026"},"")!.error,"WATI_DELIVERY_131026");
});
