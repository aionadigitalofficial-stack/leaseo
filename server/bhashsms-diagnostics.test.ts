import assert from "node:assert/strict";
import test from "node:test";
import { inspectBhashSmsResponse, logBhashSms } from "./bhashsms-diagnostics";

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
