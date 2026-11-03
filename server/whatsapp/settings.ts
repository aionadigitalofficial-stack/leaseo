import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { configurationStatus, normalizePhone, WhatsAppError } from "./core.ts";

export type WhatsAppEnvironment = Record<string, string | undefined>;
export type LoadedSettings = {
  environment: WhatsAppEnvironment;
  source: "database" | "environment";
  updatedAt: string | null;
};

const stringFields = {
  apiVersion: "WHATSAPP_API_VERSION",
  phoneNumberId: "WHATSAPP_PHONE_NUMBER_ID",
  businessAccountId: "WHATSAPP_BUSINESS_ACCOUNT_ID",
  testRecipient: "WHATSAPP_TEST_RECIPIENT",
  testTemplate: "WHATSAPP_TEST_TEMPLATE",
  testLanguage: "WHATSAPP_TEST_LANGUAGE",
} as const;
const secretFields = {
  accessToken: "WHATSAPP_ACCESS_TOKEN",
  appSecret: "WHATSAPP_APP_SECRET",
  verifyToken: "WHATSAPP_VERIFY_TOKEN",
} as const;
const allowedKeys = new Set([
  "WHATSAPP_ENABLED", ...Object.values(stringFields), ...Object.values(secretFields),
]);

export function encryptionReady(env: WhatsAppEnvironment): boolean {
  const seed = env.WHATSAPP_CONFIG_ENCRYPTION_KEY?.trim() || env.SESSION_SECRET || env.JWT_SECRET;
  return typeof seed === "string" && seed.trim().length >= 32;
}

function encryptionKey(env: WhatsAppEnvironment): Buffer {
  if (!encryptionReady(env)) throw new WhatsAppError("WHATSAPP_ENCRYPTION_KEY_REQUIRED", 503);
  const seed = env.WHATSAPP_CONFIG_ENCRYPTION_KEY?.trim() || env.SESSION_SECRET || env.JWT_SECRET;
  return Buffer.from(hkdfSync("sha256", seed!, "leaseo-whatsapp", "settings-aes-gcm-v1", 32));
}

function selectConfig(env: WhatsAppEnvironment): Record<string, string> {
  return Object.fromEntries(Array.from(allowedKeys).map(key => [key, env[key] ?? ""]));
}

/** All stored fields are authenticated/encrypted. The key stays outside the DB. */
export function encryptSettings(env: WhatsAppEnvironment, keyEnv: WhatsAppEnvironment): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyEnv), nonce);
  cipher.setAAD(Buffer.from("leaseo-whatsapp-settings-v1"));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(selectConfig(env)), "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSettings(encoded: string, keyEnv: WhatsAppEnvironment): Record<string, string> {
  const key = encryptionKey(keyEnv);
  try {
    const [version, iv, tag, data, extra] = encoded.split(".");
    if (version !== "v1" || !iv || !tag || !data || extra !== undefined) throw new Error("invalid format");
    const nonce = Buffer.from(iv, "base64");
    const authTag = Buffer.from(tag, "base64");
    if (nonce.length !== 12 || authTag.length !== 16) throw new Error("invalid format");
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAAD(Buffer.from("leaseo-whatsapp-settings-v1"));
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]);
    const parsed = JSON.parse(plaintext.toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
        Object.entries(parsed).some(([k, v]) => !allowedKeys.has(k) || typeof v !== "string")) {
      throw new Error("invalid content");
    }
    return selectConfig(parsed);
  } catch {
    // Never include plaintext, key material or crypto diagnostics in responses.
    throw new WhatsAppError("WHATSAPP_SETTINGS_DECRYPTION_FAILED", 503);
  }
}

export class SettingsValidationError extends WhatsAppError {
  missing: string[];
  invalid: string[];
  constructor(missing: string[] = [], invalid: string[] = []) {
    super("INVALID_WHATSAPP_SETTINGS");
    this.missing = missing;
    this.invalid = invalid;
  }
}

export function parseSettingsUpdate(body: unknown, previous: WhatsAppEnvironment): Record<string, string> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new SettingsValidationError();
  const input = body as Record<string, unknown>;
  const allowedInput = new Set(["enabled", ...Object.keys(stringFields), ...Object.keys(secretFields)]);
  if (Object.keys(input).some(key => !allowedInput.has(key))) throw new SettingsValidationError();
  if (typeof input.enabled !== "boolean") throw new SettingsValidationError([], ["enabled"]);
  const next = selectConfig(previous);
  next.WHATSAPP_ENABLED = String(input.enabled);
  for (const [field, key] of Object.entries(stringFields)) {
    const value = input[field];
    if (typeof value !== "string" || value.length > 512 || /[\r\n]/.test(value)) {
      throw new SettingsValidationError([], [field]);
    }
    next[key] = value.trim();
  }
  for (const [field, key] of Object.entries(secretFields)) {
    const value = input[field];
    if (value === undefined || value === "") continue;
    if (typeof value !== "string" || value.length > 8192 || /[\r\n]/.test(value)) {
      throw new SettingsValidationError([], [field]);
    }
    const secret = value.trim();
    if (secret) {
      if (/[•●]/.test(secret)) throw new SettingsValidationError([], [field]);
      next[key] = secret;
    }
  }
  const status = configurationStatus(next);
  const invalid = [...status.invalid];
  if (next.WHATSAPP_TEST_RECIPIENT) {
    try { next.WHATSAPP_TEST_RECIPIENT = normalizePhone(next.WHATSAPP_TEST_RECIPIENT); }
    catch { invalid.push("WHATSAPP_TEST_RECIPIENT"); }
  }
  if (next.WHATSAPP_TEST_TEMPLATE && !/^[a-z0-9_]{1,512}$/.test(next.WHATSAPP_TEST_TEMPLATE)) invalid.push("WHATSAPP_TEST_TEMPLATE");
  if (next.WHATSAPP_TEST_LANGUAGE && !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(next.WHATSAPP_TEST_LANGUAGE)) invalid.push("WHATSAPP_TEST_LANGUAGE");
  if (invalid.length || (input.enabled && status.missing.length)) {
    throw new SettingsValidationError(input.enabled ? status.missing : [], invalid);
  }
  return next;
}

export function safeSettings(loaded: LoadedSettings, keyEnv: WhatsAppEnvironment) {
  const env = loaded.environment;
  return {
    settings: {
      enabled: env.WHATSAPP_ENABLED === "true",
      apiVersion: env.WHATSAPP_API_VERSION || "v24.0",
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || "",
      businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
      testRecipient: env.WHATSAPP_TEST_RECIPIENT || "",
      testTemplate: env.WHATSAPP_TEST_TEMPLATE || "hello_world",
      testLanguage: env.WHATSAPP_TEST_LANGUAGE || "en_US",
      hasAccessToken: Boolean(env.WHATSAPP_ACCESS_TOKEN),
      hasAppSecret: Boolean(env.WHATSAPP_APP_SECRET),
      hasVerifyToken: Boolean(env.WHATSAPP_VERIFY_TOKEN),
    },
    status: {
      ...configurationStatus(env),
      encryptionReady: encryptionReady(keyEnv),
      source: loaded.source,
    },
    updatedAt: loaded.updatedAt,
  };
}
