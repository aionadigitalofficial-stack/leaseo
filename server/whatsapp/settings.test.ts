import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptSettings, encryptSettings, encryptionReady, parseSettingsUpdate, safeSettings } from "./settings.ts";

const key = { WHATSAPP_CONFIG_ENCRYPTION_KEY: "synthetic-encryption-key-not-for-production-123456" };
const values = {
  WHATSAPP_ENABLED: "true", WHATSAPP_API_VERSION: "v24.0",
  WHATSAPP_PHONE_NUMBER_ID: "123", WHATSAPP_BUSINESS_ACCOUNT_ID: "456",
  WHATSAPP_ACCESS_TOKEN: "synthetic-token", WHATSAPP_APP_SECRET: "synthetic-secret",
  WHATSAPP_VERIFY_TOKEN: "synthetic-verify", WHATSAPP_TEST_RECIPIENT: "12025550123",
  WHATSAPP_TEST_TEMPLATE: "hello_world", WHATSAPP_TEST_LANGUAGE: "en_US",
};
const update = {
  enabled: true, apiVersion: "v24.0", phoneNumberId: "123", businessAccountId: "456",
  testRecipient: "12025550123", testTemplate: "hello_world", testLanguage: "en_US",
};

test("settings use authenticated randomized encryption and round-trip", () => {
  const a = encryptSettings(values, key), b = encryptSettings(values, key);
  assert.notEqual(a, b);
  assert.ok(!a.includes("synthetic-token"));
  assert.deepEqual(decryptSettings(a, key), values);
});

test("wrong key or corrupted ciphertext cannot expose credentials", () => {
  const encoded = encryptSettings(values, key);
  const other = { WHATSAPP_CONFIG_ENCRYPTION_KEY: "another-synthetic-encryption-key-1234567890" };
  assert.throws(() => decryptSettings(encoded, other), { message: "WHATSAPP_SETTINGS_DECRYPTION_FAILED" });
  const pieces = encoded.split(".");
  pieces[2] = Buffer.alloc(16).toString("base64");
  assert.throws(() => decryptSettings(pieces.join("."), key), { message: "WHATSAPP_SETTINGS_DECRYPTION_FAILED" });
});

test("strong existing server secret can be used, empty/short keys fail closed", () => {
  assert.equal(encryptionReady({}), false);
  assert.equal(encryptionReady({ SESSION_SECRET: "short" }), false);
  assert.equal(encryptionReady({ WHATSAPP_CONFIG_ENCRYPTION_KEY: "", SESSION_SECRET: key.WHATSAPP_CONFIG_ENCRYPTION_KEY }), true);
  assert.throws(() => encryptSettings(values, {}), { message: "WHATSAPP_ENCRYPTION_KEY_REQUIRED" });
});

test("blank secret inputs keep existing credentials; explicit rotations update only that value", () => {
  const next = parseSettingsUpdate({ ...update, accessToken: "", appSecret: "" }, values);
  assert.equal(next.WHATSAPP_ACCESS_TOKEN, values.WHATSAPP_ACCESS_TOKEN);
  assert.equal(next.WHATSAPP_APP_SECRET, values.WHATSAPP_APP_SECRET);
  const rotated = parseSettingsUpdate({ ...update, accessToken: "rotated-synthetic-token" }, values);
  assert.equal(rotated.WHATSAPP_ACCESS_TOKEN, "rotated-synthetic-token");
  assert.equal(rotated.WHATSAPP_VERIFY_TOKEN, values.WHATSAPP_VERIFY_TOKEN);
});

test("enabled config requires valid IDs/credentials; disabled drafts may be incomplete", () => {
  assert.throws(() => parseSettingsUpdate(update, {}), { message: "INVALID_WHATSAPP_SETTINGS" });
  const draft = parseSettingsUpdate({ ...update, enabled: false, phoneNumberId: "", businessAccountId: "" }, {});
  assert.equal(draft.WHATSAPP_ENABLED, "false");
  for (const invalid of [
    { apiVersion: "../bad" }, { enabled: "true" }, { accessToken: "••••1234" },
    { accessToken: "token\nheader" }, { randomField: true }, { testRecipient: "bad-number" },
  ]) assert.throws(() => parseSettingsUpdate({ ...update, ...invalid }, values));
});

test("safe settings returns only secret-presence flags and no encryption material", () => {
  const result = safeSettings({ environment: values, source: "database", updatedAt: "fixture" }, key);
  const text = JSON.stringify(result);
  for (const secret of [values.WHATSAPP_ACCESS_TOKEN, values.WHATSAPP_APP_SECRET, values.WHATSAPP_VERIFY_TOKEN, key.WHATSAPP_CONFIG_ENCRYPTION_KEY]) {
    assert.ok(!text.includes(secret));
  }
  assert.equal(result.settings.hasAccessToken, true);
  assert.equal(result.status.encryptionReady, true);
});
