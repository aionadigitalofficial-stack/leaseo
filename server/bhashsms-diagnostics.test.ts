import assert from "node:assert/strict";
import test from "node:test";
import { describeBhashSmsReply, inspectBhashSmsResponse, logBhashSms, logCustomerSmsReply } from "./bhashsms-diagnostics";

test("response inspection preserves the separate OTP and enquiry acceptance rules", () => {
  for (const [body, otp, enquiry, kind] of [
    [" S.83471\n", true, true, "tracking_reference"],
    ["172354", true, true, "tracking_reference"],
    ["Success: queued", true, true, "success_text"],
    ["Request success", true, false, "success_text"],
    ["\n", false, false, "empty"],
    ["Error: invalid template", false, false, "unrecognized"],
  ] as const) {
    const result = inspectBhashSmsResponse(body);
    assert.deepEqual([result.otpAccepted, result.enquiryAccepted, result.responseKind], [otp, enquiry, kind]);
  }
});

test("unknown reply diagnostics distinguish envelope and tracking-reference position", () => {
  for (const [body, mime, expected] of [
    ["S.1234\nqueued", "text/plain", ["text", "text", "leading", true]],
    ["Queued: S.1234", null, ["unspecified", "text", "trailing", false]],
    ['{"request_id":"S.1234"}', "application/json; charset=utf-8", ["json", "json_object", "embedded", false]],
    ['["S.1234","S.5678"]', null, ["unspecified", "json_array", "multiple", false]],
    ['"S.1234"', "application/problem+json", ["json", "json_string", "embedded", false]],
    ["{bad", "application/json", ["json", "invalid_json", "none", false]],
    ["<html>Unavailable</html>", "text/html", ["html", "html", "none", false]],
    ["\r\n", null, ["unspecified", "empty", "none", false]],
  ] as const) {
    const reply = describeBhashSmsReply(body, mime);
    assert.deepEqual([reply.media, reply.format, reply.trackingShape, reply.multiline], expected);
  }
  assert.deepEqual(describeBhashSmsReply("x".repeat(8193), null), {
    media: "unspecified", format: "oversized",
  });
});

test("Customer SMS diagnostics do not echo any reply content or header data", (t) => {
  const info = t.mock.method(console, "info", (_label: string, _payload: string) => {});
  logCustomerSmsReply(JSON.stringify({
    hiddenKey: "Error: https://example.invalid/send?pass=secretValue&phone=919000000001&text=privateMessage",
    ref: "S.123456",
  }), "text/private-header", "live_enquiry");
  assert.deepEqual(info.mock.calls[0].arguments, [
    "[BhashSMS Customer SMS reply]",
    JSON.stringify({
      source: "live_enquiry", media: "other", format: "json_object", trackingShape: "embedded",
      multiline: false, hasSuccessWord: false, hasErrorWord: true,
    }),
  ]);
});

test("diagnostics only log status, categories, and a non-echoed tracking reference", (t) => {
  const info = t.mock.method(console, "info", (_label: string, _payload: string) => {});
  const requestValues = ["Your code is 123456", "919000000001", "fakepassword83714"];
  for (const body of [
    "Error: fakepassword83714 919000000001 123456",
    "123456", "S.123456", "S.9000000001", "S.83714", "S.921845",
  ]) {
    logBhashSms("otp", "unrecognized", 200, inspectBhashSmsResponse(body), requestValues);
  }
  const entries = info.mock.calls.map(call => JSON.parse(call.arguments[1]));
  assert.ok(entries.slice(0, -1).every(entry => entry.trackingReference === undefined));
  assert.deepEqual(entries.at(-1), {
    flow: "otp", outcome: "unrecognized", httpStatus: 200,
    responseKind: "tracking_reference", trackingReference: "S.921845",
  });
  assert.doesNotMatch(JSON.stringify(entries), /123456|9000000001|fakepassword|83714/);
});
