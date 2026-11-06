import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { pool } from "../db";
import { ContactError, accountPhone } from "./core";

export const defaults = {
  whatsappProvider: "meta",
  whatsappEnabled: false, smsEnabled: false, emailEnabled: false,
  adminPhone: "", adminEmail: "", adminWhatsappConsent: false, ownerWhatsappConsent: false,
  siteUrl: "", platformName: "Leaseo", smtpHost: "", smtpPort: 587, smtpSecure: false,
  smtpUser: "", smtpFromName: "", smtpFromEmail: "",
};
export type Config = typeof defaults;

function key() {
  const seed = process.env.WHATSAPP_CONFIG_ENCRYPTION_KEY?.trim() || process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!seed || seed.trim().length < 32) throw new ContactError("ENCRYPTION_KEY_REQUIRED", 503);
  return Buffer.from(hkdfSync("sha256", seed, "leaseo-notifications", "smtp-password-v1", 32));
}
export function encryptPassword(password: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  cipher.setAAD(Buffer.from("leaseo-notifications-v1"));
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [nonce, cipher.getAuthTag(), encrypted].map(x => x.toString("base64")).join(".");
}
export function decryptPassword(encoded: string): string {
  try {
    const [nonce, tag, encrypted] = encoded.split(".").map(x => Buffer.from(x, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", key(), nonce);
    decipher.setAAD(Buffer.from("leaseo-notifications-v1"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch { throw new ContactError("SMTP_SECRET_DECRYPTION_FAILED", 503); }
}
export async function loadConfig(query: any = pool): Promise<{settings: Config; encrypted: string | null}> {
  const { rows } = await query.query("SELECT settings,encrypted_secret FROM notification_configuration WHERE id=1");
  if (!rows[0]) throw new ContactError("NOTIFICATION_MIGRATION_REQUIRED", 503);
  return { settings: { ...defaults, ...rows[0].settings }, encrypted: rows[0].encrypted_secret };
}
export function safeConfig(loaded: Awaited<ReturnType<typeof loadConfig>>) {
  return { ...loaded.settings, hasSmtpPassword: Boolean(loaded.encrypted || process.env.SMTP_PASS) };
}
export function validateConfig(input: any): Partial<Config> & {smtpPassword?: string} {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ContactError("INVALID_SETTINGS");
  for (const [k, v] of Object.entries(input)) {
    if (k === "smtpPassword") {
      if (typeof v !== "string" || v.length > 1000 || /[\r\n]/.test(v)) throw new ContactError("INVALID_SMTP_PASSWORD");
    } else if (!(k in defaults) || typeof v !== typeof defaults[k as keyof Config] ||
        (typeof v === "string" && (v.length > 500 || /[\r\n]/.test(v)))) throw new ContactError("INVALID_SETTINGS");
  }
  if (input.whatsappProvider !== undefined && !["meta","wati"].includes(input.whatsappProvider)) throw new ContactError("INVALID_WHATSAPP_PROVIDER");
  if (input.siteUrl) {
    let url: URL;
    try { url = new URL(input.siteUrl); } catch { throw new ContactError("INVALID_SITE_URL"); }
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new ContactError("HTTPS_SITE_URL_REQUIRED");
  }
  for (const field of ["adminEmail","smtpFromEmail"]) {
    if (input[field] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input[field])) throw new ContactError("INVALID_EMAIL");
  }
  if (input.smtpPort !== undefined && (!Number.isInteger(input.smtpPort) || input.smtpPort < 1 || input.smtpPort > 65535)) throw new ContactError("INVALID_SMTP_PORT");
  if (input.adminPhone) input={...input,adminPhone:accountPhone(input.adminPhone)};
  return input;
}
export async function saveConfig(input: any) {
  const validated = validateConfig(input);
  const { smtpPassword, ...partial } = validated;
  const encrypted = smtpPassword?.trim() ? encryptPassword(smtpPassword) : null;
  // Atomic merge preserves concurrent edits and blank secret fields.
  await pool.query(`UPDATE notification_configuration
    SET settings = settings || $1::jsonb,
        encrypted_secret = COALESCE($2,encrypted_secret), updated_at=now() WHERE id=1`,
    [JSON.stringify(partial),encrypted]);
  return safeConfig(await loadConfig());
}
