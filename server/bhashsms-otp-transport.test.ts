import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import https from "node:https";
import test, { type TestContext } from "node:test";
import { requestBhashOtp } from "./bhashsms-otp-transport";

const endpoint = () => new URL("https://bhashsms.com/api/sendmsg.php?user=test&pass=fake&phone=9000000001");

function mockRequest(t: TestContext, mode: "success" | "redirect" | "network" | "pending" | "oversized" | "aborted" | "http_error") {
  let calls = 0;
  let receivedUrl = "";
  let options: unknown;
  const request = new EventEmitter() as EventEmitter & { end: () => void; destroy: (error?: Error) => void };
  request.destroy = error => { if (error) request.emit("error", error); };
  const response = new EventEmitter() as EventEmitter & { statusCode: number; destroy: () => void };
  response.statusCode = mode === "redirect" ? 302 : mode === "http_error" ? 503 : 200;
  response.destroy = () => {};
  t.mock.method(https, "request", ((...args: unknown[]) => {
    calls++;
    receivedUrl = String(args[0]);
    options = args[1];
    const callback = args[2] as (value: typeof response) => void;
    request.end = () => queueMicrotask(() => {
      if (mode === "pending") return;
      if (mode === "network") {
        request.emit("error", Object.assign(new Error("Test network error"), { code: "ECONNREFUSED" }));
        return;
      }
      callback(response);
      if (mode === "redirect") return;
      if (mode === "aborted") { response.emit("aborted"); return; }
      response.emit("data", Buffer.from(mode === "oversized" ? "x".repeat(65537) : "S.123456"));
      response.emit("end");
    });
    return request;
  }) as typeof https.request);
  return { get calls() { return calls; }, get options() { return options; }, get receivedUrl() { return receivedUrl; } };
}

test("uses one IPv4 HTTPS request with unchanged query and certificate checks", async t => {
  const fake = mockRequest(t, "success");
  const statuses: number[] = [];
  const url = endpoint();
  assert.equal(await requestBhashOtp(url, status => statuses.push(status)), "S.123456");
  assert.equal(fake.receivedUrl, url.toString());
  assert.equal(fake.calls, 1);
  assert.deepEqual(fake.options, { method: "GET", family: 4, agent: false, rejectUnauthorized: true });
  assert.deepEqual(statuses, [200]);
});

test("reports HTTP errors to the caller without retrying", async t => {
  const fake = mockRequest(t, "http_error");
  let status = 0;
  await requestBhashOtp(endpoint(), value => { status = value; });
  assert.equal(status, 503);
  assert.equal(fake.calls, 1);
});

for (const mode of ["redirect", "network", "oversized", "aborted"] as const) {
  test(`fails safely on ${mode} without another request`, async t => {
    const fake = mockRequest(t, mode);
    await assert.rejects(requestBhashOtp(endpoint(), () => {}));
    assert.equal(fake.calls, 1);
  });
}

test("bounds the entire request to 30 seconds and never retries on timeout", async t => {
  const fake = mockRequest(t, "pending");
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const result = assert.rejects(requestBhashOtp(endpoint(), () => {}), { code: "ETIMEDOUT" });
  t.mock.timers.tick(30000);
  await result;
  assert.equal(fake.calls, 1);
});

test("rejects HTTP or unexpected endpoints before sending credentials", async t => {
  const fake = mockRequest(t, "success");
  for (const url of ["http://bhashsms.com/api/sendmsg.php", "https://example.invalid/api/sendmsg.php"]) {
    await assert.rejects(requestBhashOtp(new URL(url), () => {}));
  }
  assert.equal(fake.calls, 0);
});
