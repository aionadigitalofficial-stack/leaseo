import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { registerWhatsAppRoutes } from "./routes.ts";

const env = {
  WHATSAPP_ENABLED: "true", WHATSAPP_API_VERSION: "v24.0",
  WHATSAPP_ACCESS_TOKEN: "synthetic-token", WHATSAPP_PHONE_NUMBER_ID: "12345",
  WHATSAPP_BUSINESS_ACCOUNT_ID: "98765", WHATSAPP_APP_SECRET: "synthetic-secret",
  WHATSAPP_VERIFY_TOKEN: "synthetic-verification", WHATSAPP_TEST_RECIPIENT: "12025550123",
};

// In-process handler tests only: no HTTP server, database, login bypass, or Meta call.
function fixture(options: { failStorage?: boolean; environment?: Record<string, string | undefined> } = {}) {
  const registered = new Map<string, any[]>();
  const persisted: unknown[] = [];
  const sends: any[] = [];
  const app = {
    get(path: string, ...handlers: any[]) { registered.set(`GET ${path}`, handlers); },
    post(path: string, ...handlers: any[]) { registered.set(`POST ${path}`, handlers); },
  };
  registerWhatsAppRoutes(app as any, {
    environment: options.environment ?? env,
    authenticate(req, res, next) {
      if (!(req as any).authenticated) { res.sendStatus(401); return; }
      next();
    },
    requireAdmin(req, res, next) {
      if (!(req as any).admin) { res.sendStatus(403); return; }
      next();
    },
    async saveEvents(events) {
      if (options.failStorage) throw new Error("synthetic DB outage");
      persisted.push(...events);
    },
    async listEvents() { return persisted; },
    async send(input) { sends.push(input); return { messageId: "wamid.fixture", status: "accepted" }; },
    logger: { error() {} },
  });
  return {
    persisted, sends,
    async request(method: string, path: string, request: any = {}) {
      const res = {
        statusCode: 200, body: undefined as unknown, headers: {} as Record<string, unknown>,
        status(code: number) { this.statusCode = code; return this; },
        json(body: unknown) { this.body = body; return this; },
        send(body: unknown) { this.body = body; return this; },
        sendStatus(code: number) { this.statusCode = code; return this; },
        type(value: string) { this.headers["Content-Type"] = value; return this; },
        setHeader(name: string, value: unknown) { this.headers[name] = value; },
      };
      const req = { query: {}, body: {}, get: () => undefined, ...request };
      for (const handler of registered.get(`${method} ${path}`) ?? []) {
        let advanced = false;
        await handler(req, res, () => { advanced = true; });
        if (!advanced) break;
      }
      return res;
    },
  };
}

const admin = { authenticated: true, admin: true };
function signedWebhook() {
  const body = { object: "whatsapp_business_account", entry: [{ id: "98765", changes: [{
    field: "messages", value: { metadata: { phone_number_id: "12345" },
      statuses: [{ id: "wamid.fixture", status: "delivered", timestamp: "1793680000" }] },
  }] }] };
  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = `sha256=${createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex")}`;
  return { body, rawBody, get: () => signature };
}

test("all administration endpoints require authentication and admin access", async () => {
  const app = fixture();
  for (const [method, path] of [
    ["GET", "/api/admin/whatsapp/status"],
    ["GET", "/api/admin/whatsapp/delivery-events"],
    ["POST", "/api/admin/whatsapp/test"],
  ]) {
    assert.equal((await app.request(method, path)).statusCode, 401);
    assert.equal((await app.request(method, path, { authenticated: true })).statusCode, 403);
  }
  assert.equal(app.sends.length, 0);
});

test("configuration status is usable by admins and contains no token values", async () => {
  const res = await fixture().request("GET", "/api/admin/whatsapp/status", admin);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).configured, true);
  assert.ok(!JSON.stringify(res.body).includes(env.WHATSAPP_ACCESS_TOKEN));
});

test("webhook verification echoes the challenge only for the correct token", async () => {
  const app = fixture();
  const query = { "hub.mode": "subscribe", "hub.verify_token": env.WHATSAPP_VERIFY_TOKEN, "hub.challenge": "challenge-fixture" };
  const res = await app.request("GET", "/api/whatsapp/webhook", { query });
  assert.equal(res.body, "challenge-fixture");
  assert.equal(res.headers["Content-Type"], "text/plain");
  assert.equal((await app.request("GET", "/api/whatsapp/webhook", { query: { ...query, "hub.verify_token": "wrong" } })).statusCode, 403);
});

test("unconfigured webhook fails explicitly", async () => {
  const app = fixture({ environment: {} });
  assert.equal((await app.request("GET", "/api/whatsapp/webhook")).statusCode, 503);
  assert.equal((await app.request("POST", "/api/whatsapp/webhook", signedWebhook())).statusCode, 503);
});

test("signed statuses persist before acknowledgement and unsigned statuses never persist", async () => {
  const app = fixture();
  assert.equal((await app.request("POST", "/api/whatsapp/webhook", signedWebhook())).statusCode, 200);
  assert.equal(app.persisted.length, 1);
  assert.equal((await app.request("POST", "/api/whatsapp/webhook",
    { ...signedWebhook(), get: () => "sha256=invalid" })).statusCode, 403);
  assert.equal((await app.request("POST", "/api/whatsapp/webhook",
    { ...signedWebhook(), rawBody: undefined })).statusCode, 403);
  assert.equal(app.persisted.length, 1);
  assert.equal(app.sends.length, 0);
});

test("database failure returns a retryable webhook response, not a false success", async () => {
  const app = fixture({ failStorage: true });
  assert.equal((await app.request("POST", "/api/whatsapp/webhook", signedWebhook())).statusCode, 503);
  assert.equal(app.persisted.length, 0);
});

test("manual test requires consent and uses only the configured recipient", async () => {
  const app = fixture();
  assert.equal((await app.request("POST", "/api/admin/whatsapp/test", admin)).statusCode, 400);
  const res = await app.request("POST", "/api/admin/whatsapp/test", {
    ...admin, body: { consentConfirmed: true, to: "19999999999", templateName: "malicious_override" },
  });
  assert.equal(res.statusCode, 202);
  assert.equal(app.sends[0].to, env.WHATSAPP_TEST_RECIPIENT);
  assert.equal(app.sends[0].templateName, "hello_world");
  const limited = await app.request("POST", "/api/admin/whatsapp/test", {
    ...admin, body: { consentConfirmed: true },
  });
  assert.equal(limited.statusCode, 429);
  assert.ok(Number(limited.headers["Retry-After"]) > 0);
  assert.equal(app.sends.length, 1);
});

test("manual test without a server-configured test recipient cannot send", async () => {
  const app = fixture({ environment: { ...env, WHATSAPP_TEST_RECIPIENT: "" } });
  assert.equal((await app.request("POST", "/api/admin/whatsapp/test",
    { ...admin, body: { consentConfirmed: true } })).statusCode, 503);
  assert.equal(app.sends.length, 0);
});
