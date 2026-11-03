import { pool } from "../db";
import { WhatsAppError, sendTemplateMessage, type TemplateMessage } from "./core.ts";
import { decryptSettings, encryptSettings, type LoadedSettings, type WhatsAppEnvironment } from "./settings.ts";

export async function loadWhatsAppSettings(): Promise<LoadedSettings> {
  let result;
  try {
    result = await pool.query("SELECT encrypted_config, updated_at FROM whatsapp_settings WHERE id = 1");
  } catch {
    throw new WhatsAppError("WHATSAPP_SETTINGS_STORAGE_UNAVAILABLE", 503);
  }
  const row = result.rows[0];
  if (!row) return { environment: process.env, source: "environment", updatedAt: null };
  const config = decryptSettings(row.encrypted_config, process.env);
  return {
    environment: { ...process.env, ...config },
    source: "database",
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function persistWhatsAppSettings(config: WhatsAppEnvironment): Promise<LoadedSettings> {
  const encrypted = encryptSettings(config, process.env);
  try {
    const result = await pool.query(
      `INSERT INTO whatsapp_settings (id, encrypted_config, updated_at)
       VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET encrypted_config = EXCLUDED.encrypted_config, updated_at = now()
       RETURNING updated_at`,
      [encrypted],
    );
    return {
      environment: { ...process.env, ...config },
      source: "database",
      updatedAt: new Date(result.rows[0].updated_at).toISOString(),
    };
  } catch {
    throw new WhatsAppError("WHATSAPP_SETTINGS_STORAGE_UNAVAILABLE", 503);
  }
}

/** Use this wrapper for any future triggers so dashboard settings are respected. */
export async function sendConfiguredTemplateMessage(input: TemplateMessage) {
  const loaded = await loadWhatsAppSettings();
  return sendTemplateMessage(input, loaded.environment);
}
