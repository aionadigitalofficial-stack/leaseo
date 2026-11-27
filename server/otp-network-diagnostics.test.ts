import assert from "node:assert/strict";
import test from "node:test";
import { logOtpNetworkFailure, otpNetworkFailure } from "./otp-network-diagnostics";

test("identifies safe fetch, DNS, TLS, timeout and redirect error categories", () => {
  for (const [error, expected] of [
    [{ cause: { code: "ENOTFOUND" } }, "ENOTFOUND"],
    [{ cause: { code: "CERT_HAS_EXPIRED" } }, "CERT_HAS_EXPIRED"],
    [{ cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }, "UND_ERR_CONNECT_TIMEOUT"],
    [{ cause: { errors: [{ code: "ECONNREFUSED" }] } }, "ECONNREFUSED"],
    [{ cause: { message: "unexpected redirect" } }, "REDIRECT_BLOCKED"],
    [{ name: "TimeoutError" }, "TIMEOUT"],
    [{ name: "AbortError" }, "ABORTED"],
    [null, "UNCLASSIFIED"],
    ["private error", "UNCLASSIFIED"],
    [{ code: "unknown-secret", message: "sensitive details" }, "UNCLASSIFIED"],
  ] as const) {
    assert.equal(otpNetworkFailure(error), expected);
  }
  const cyclic: { cause?: unknown } = {};
  cyclic.cause = cyclic;
  assert.equal(otpNetworkFailure(cyclic), "UNCLASSIFIED");
});

test("never logs the error, URL, credentials, phone, or OTP", (t) => {
  const info = t.mock.method(console, "info", (_label: string, _payload: string) => {});
  logOtpNetworkFailure({
    message: "fetch failed https://example.invalid/?pass=fakeSecret&phone=919000000001&otp=123456",
    cause: { code: "ECONNRESET", address: "privateAddress" },
    stack: "privateStack",
  }, "request");
  assert.deepEqual(info.mock.calls[0].arguments, [
    "[BhashSMS OTP network]", '{"phase":"request","errorCode":"ECONNRESET"}',
  ]);
});
