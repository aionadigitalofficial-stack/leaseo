import assert from "node:assert/strict";
import test from "node:test";
import { sendBhashEnquiry } from "./bhashsms-transport";

const endpoint = () => new URL("https://bhashsms.com/api/sendmsg.php?pass=fakeSecret&text=privateMessage");

test("accepts single and multiple references with an unchanged enquiry URL", async t => {
  t.mock.method(console, "info", () => {});
  for (const [body, id] of [["S.123456", "S.123456"], ["S.123456,S.987654", null]]) {
    const url = endpoint();
    let calls = 0;
    const result = await sendBhashEnquiry(url, undefined, async (actual, onStatus) => {
      calls++;
      assert.equal(actual.toString(), url.toString());
      onStatus(200);
      return body!;
    });
    assert.deepEqual(result, { messageId: id, status: "accepted" });
    assert.equal(calls, 1);
  }
});

test("unknown network outcomes are non-retryable for each recipient path", async t => {
  t.mock.method(console, "info", () => {});
  for (const source of [undefined, "admin_test", "live_enquiry"] as const) {
    let calls = 0;
    await assert.rejects(sendBhashEnquiry(endpoint(), source, async () => {
      calls++;
      throw Object.assign(new Error("Private request details"), { code: "ETIMEDOUT" });
    }), { code: "PROVIDER_REQUEST_OUTCOME_UNKNOWN", retryable: false });
    assert.equal(calls, 1);
  }
});

test("ambiguous and mixed replies remain unknown rather than falsely accepted", async t => {
  const info = t.mock.method(console, "info", () => {});
  for (const body of ["privateMessage fakeSecret", "S.123456, S.456789 ERROR"]) {
    await assert.rejects(sendBhashEnquiry(endpoint(), "live_enquiry", async (_, onStatus) => {
      onStatus(200);
      return body;
    }), { code: "BHASHSMS_RESPONSE_OUTCOME_UNKNOWN", retryable: false });
  }
  assert.doesNotMatch(JSON.stringify(info.mock.calls), /privateMessage|fakeSecret/);
});

test("keeps explicit HTTP rejection and rate-limit handling", async t => {
  t.mock.method(console, "info", () => {});
  for (const [status, code, retryable] of [
    [400, "PROVIDER_HTTP_400", false],
    [503, "PROVIDER_HTTP_503", false],
    [429, "PROVIDER_RATE_LIMITED", true],
  ] as const) {
    await assert.rejects(sendBhashEnquiry(endpoint(), undefined, async (_, onStatus) => {
      onStatus(status);
      return "S.123456";
    }), { code, retryable });
  }
});
