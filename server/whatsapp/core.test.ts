import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  configurationStatus, normalizePhone, parseDeliveryEvents,
  sendTemplateMessage, verifyWebhookSignature, WhatsAppError,
} from "./core.ts";

// Synthetic fixtures only; no live calls or application environment secrets.
const env = {
  WHATSAPP_ENABLED: "true",
  WHATSAPP_API_VERSION: "v24.0",
  WHATSAPP_ACCESS_TOKEN: "synthetic-test-value",
  WHATSAPP_PHONE_NUMBER_ID: "12345",
  WHATSAPP_BUSINESS_ACCOUNT_ID: "98765",
  WHATSAPP_APP_SECRET: "synthetic-app-value",
  WHATSAPP_VERIFY_TOKEN: "synthetic-verify-value",
};
const input = {
  to: "+1 202 555 0123", templateName: "hello_world",
  languageCode: "en_US", consentConfirmed: true,
};
const statusPayload = (status = "delivered", phone = "12345", account = "98765") => ({
  object: "whatsapp_business_account",
  entry: [{ id: account, changes: [{ field: "messages", value: {
    metadata: { phone_number_id: phone },
    statuses: [{ id: "wamid.fixture", status, timestamp: "1793680000",
      recipient_id: "12025550123", errors: [{ code: 131026, title: "not stored" }] }],
  } }] }],
});

test("configuration is disabled and missing secrets by default", () => {
  const status = configurationStatus({});
  assert.equal(status.enabled, false);
  assert.equal(status.configured, false);
  assert.equal(status.missing.length, 6);
  assert.equal(status.automaticNotifications, false);
});

test("configuration reports names, never secret values", () => {
  const result = configurationStatus(env);
  assert.equal(result.configured, true);
  assert.ok(!JSON.stringify(result).includes(env.WHATSAPP_ACCESS_TOKEN));
  assert.ok(!JSON.stringify(result).includes(env.WHATSAPP_APP_SECRET));
  assert.deepEqual(configurationStatus({ ...env, WHATSAPP_API_VERSION: "../bad" }).invalid, ["WHATSAPP_API_VERSION"]);
});

test("phone normalization preserves explicit country codes", () => {
  assert.equal(normalizePhone(input.to), "12025550123");
  assert.equal(normalizePhone("+91 (98765) 43210"), "919876543210");
  for (const phone of ["", "0123456789", "12abc3456789", "123", "+1234567890123456"]) {
    assert.throws(() => normalizePhone(phone), WhatsAppError);
  }
});

test("outbound requests require enabled, complete configuration and opt-in", async () => {
  let calls = 0;
  const fetcher = (async () => { calls++; throw new Error("must not call"); }) as typeof fetch;
  for (const [values, message, code] of [
    [{ ...env, WHATSAPP_ENABLED: "false" }, input, "WHATSAPP_DISABLED"],
    [{ ...env, WHATSAPP_ACCESS_TOKEN: "" }, input, "WHATSAPP_NOT_CONFIGURED"],
    [env, { ...input, consentConfirmed: false }, "WHATSAPP_OPT_IN_REQUIRED"],
    [env, { ...input, templateName: "../bad" }, "INVALID_TEMPLATE_NAME"],
    [env, { ...input, bodyParameters: [""] }, "INVALID_TEMPLATE_PARAMETERS"],
  ] as const) {
    await assert.rejects(sendTemplateMessage(message, values, fetcher), { message: code });
  }
  assert.equal(calls, 0);
});

test("template sending uses Meta's endpoint, bearer header, and positional body values", async () => {
  let calls = 0;
  const fetcher = (async (url, init) => {
    calls++;
    assert.equal(url, "https://graph.facebook.com/v24.0/12345/messages");
    assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`);
    const body = JSON.parse(init?.body as string);
    assert.equal(body.to, "12025550123");
    assert.equal(body.messaging_product, "whatsapp");
    assert.equal(body.template.name, "hello_world");
    assert.deepEqual(body.template.components[0].parameters, [{ type: "text", text: "Sample listing" }]);
    assert.equal(init?.redirect, "error");
    return new Response(JSON.stringify({ messages: [{ id: "wamid.fixture" }] }), { status: 200 });
  }) as typeof fetch;
  assert.deepEqual(await sendTemplateMessage({ ...input, bodyParameters: ["Sample listing"] }, env, fetcher),
    { messageId: "wamid.fixture", status: "accepted" });
  assert.equal(calls, 1);
});

test("provider errors are sanitized and not silently retried", async () => {
  for (const [status, code] of [[401, "META_AUTHORIZATION_FAILED"], [429, "META_RATE_LIMITED"], [500, "META_SEND_REJECTED"]] as const) {
    let calls = 0;
    const fetcher = (async () => {
      calls++;
      return new Response(JSON.stringify({ error: { message: "private provider details" } }), { status });
    }) as typeof fetch;
    await assert.rejects(sendTemplateMessage(input, env, fetcher), (error: any) => {
      assert.equal(error.code, code);
      assert.equal(error.retryable, status === 429);
      assert.ok(!error.message.includes("private"));
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("timeouts have unknown outcome and malformed provider replies fail", async () => {
  await assert.rejects(sendTemplateMessage(input, env, (async () => {
    throw new Error("network timeout");
  }) as typeof fetch), { message: "META_REQUEST_OUTCOME_UNKNOWN" });
  for (const body of ["not-json", "{}", '{"messages":[{"id":42}]}']) {
    await assert.rejects(sendTemplateMessage(input, env,
      (async () => new Response(body)) as typeof fetch), { message: "META_INVALID_RESPONSE" });
  }
});

test("webhook validation uses exact raw bytes and rejects forged or malformed signatures", () => {
  const raw = Buffer.from('{"example": 1}');
  const signature = `sha256=${createHmac("sha256", env.WHATSAPP_APP_SECRET).update(raw).digest("hex")}`;
  assert.equal(verifyWebhookSignature(raw, signature, env.WHATSAPP_APP_SECRET), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{"example":1}'), signature, env.WHATSAPP_APP_SECRET), false);
  for (const bad of [undefined, "", "sha256=x", `sha256=${"0".repeat(64)}`]) {
    assert.equal(verifyWebhookSignature(raw, bad, env.WHATSAPP_APP_SECRET), false);
  }
  assert.equal(verifyWebhookSignature(raw, signature, ""), false);
});

test("delivery parsing retains metadata only and filters other senders/accounts", () => {
  assert.deepEqual(parseDeliveryEvents(statusPayload(), "12345", "98765"), [{
    messageId: "wamid.fixture", status: "delivered", eventTimestamp: "1793680000", errorCode: 131026,
  }]);
  assert.deepEqual(parseDeliveryEvents(statusPayload("read", "another"), "12345", "98765"), []);
  assert.deepEqual(parseDeliveryEvents(statusPayload("read", "12345", "another"), "12345", "98765"), []);
  assert.throws(() => parseDeliveryEvents(statusPayload("made_up"), "12345", "98765"), WhatsAppError);
  assert.throws(() => parseDeliveryEvents({}, "12345", "98765"), WhatsAppError);
});

test("inbound messages do not create notifications or retain message text", () => {
  const payload = statusPayload();
  const value: any = payload.entry[0].changes[0].value;
  delete value.statuses;
  value.messages = [{ text: { body: "do not store me" } }];
  assert.deepEqual(parseDeliveryEvents(payload, "12345", "98765"), []);
});
