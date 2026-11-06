import { randomBytes, randomUUID } from "node:crypto";
import { pool } from "../db";
import { encryptPassword, decryptPassword } from "./config";
import { ContactError } from "./core";
import { watiSettingsInput, watiPayload, watiResult, watiHost } from "./wati-core";

export async function loadWati(query: any = pool) {
  const { rows: [row] } = await query.query("SELECT * FROM wati_notification_settings WHERE id=1");
  if (!row) throw new ContactError("WATI_MIGRATION_REQUIRED", 503);
  return row;
}
export function safeWati(row: any) {
  return { apiHost: row.api_host, channel: row.channel, hasApiToken: Boolean(row.encrypted_token),
    configured: Boolean(row.api_host && row.encrypted_token),
    hasWebhookSecret: Boolean(row.encrypted_webhook_secret) };
}
export async function saveWati(input: any) {
  const data = watiSettingsInput(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [old] } = await client.query("SELECT * FROM wati_notification_settings WHERE id=1 FOR UPDATE");
    if (!old) throw new ContactError("WATI_MIGRATION_REQUIRED", 503);
    if (!data.apiToken && !old.encrypted_token) throw new ContactError("WATI_TOKEN_REQUIRED");
    if (old.api_host && old.api_host !== data.apiHost && !data.apiToken) throw new ContactError("WATI_TOKEN_REQUIRED_FOR_NEW_HOST");
    const token = data.apiToken ? encryptPassword(data.apiToken) : old.encrypted_token;
    // Changing the account/channel invalidates the old callback URL.
    const secret = !old.encrypted_webhook_secret || old.api_host !== data.apiHost || old.channel !== data.channel ?
      encryptPassword(randomBytes(32).toString("hex")) : old.encrypted_webhook_secret;
    const { rows: [row] } = await client.query(`UPDATE wati_notification_settings SET api_host=$1,channel=$2,
      encrypted_token=$3,encrypted_webhook_secret=$4,updated_at=now() WHERE id=1 RETURNING *`,
      [data.apiHost, data.channel, token, secret]);
    await client.query("COMMIT");
    return safeWati(row);
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}
export function watiSecret(encoded: string | null): string {
  if (!encoded) throw new ContactError("WATI_CREDENTIALS_MISSING", 503);
  try { return decryptPassword(encoded); } catch { throw new ContactError("WATI_SECRET_DECRYPTION_FAILED", 503); }
}

export async function sendWati(job: any, template: any, values: Record<string, string>,
  request: typeof fetch = fetch, query: any = pool) {
  if (!job.consent_confirmed) throw new ContactError("WHATSAPP_CONSENT_REQUIRED");
  const settings = await loadWati(query);
  const host = watiHost(settings.api_host), token = watiSecret(settings.encrypted_token);
  const id = randomUUID();
  const payload = watiPayload(id, job.recipient, template, values, settings.channel);
  // Persist caller correlation BEFORE any network write, including for uncertain responses.
  await query.query(`INSERT INTO wati_notification_attempts(id,job_id,api_host,channel) VALUES($1,$2,$3,$4)`,
    [id, job.id, host, settings.channel]);
  let response: Response;
  try {
    response = await request(`${host}/api/ext/v3/messageTemplates/send`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload), redirect: "error", signal: AbortSignal.timeout(15000),
    });
  } catch { throw new ContactError("WATI_SEND_OUTCOME_UNKNOWN", 502); }
  if (response.status === 401) throw new ContactError("WATI_AUTHORIZATION_FAILED", 502);
  if (response.status === 403) throw new ContactError("WATI_PERMISSION_OR_PLAN_REQUIRED", 502);
  if (response.status === 429) throw new ContactError("WATI_RATE_OR_USAGE_LIMIT", 502);
  if (response.status >= 500) throw new ContactError("WATI_SEND_OUTCOME_UNKNOWN", 502);
  if (!response.ok) throw new ContactError("WATI_REQUEST_REJECTED", 502);
  let data: any;
  try { data = await response.json(); } catch { throw new ContactError("WATI_SEND_OUTCOME_UNKNOWN", 502); }
  const broadcast = watiResult(data, id, payload.recipients[0].target);
  try { await query.query("UPDATE wati_notification_attempts SET broadcast_id=$2 WHERE id=$1", [id, broadcast]); }
  catch { throw new ContactError("WATI_ACCEPTED_PERSISTENCE_OUTCOME_UNKNOWN", 503); }
  // This is a Leaseo correlation reference, not a WhatsApp provider message ID.
  return { messageId: `wati:${id}`, status: "accepted" as const };
}

/** Latest attempt only; late/repeated callbacks cannot downgrade delivery or affect a new retry. */
export async function reconcileWati(query: any = pool) {
  await query.query(`UPDATE wati_notification_attempts a SET
    wati_message_id=COALESCE(a.wati_message_id,e.wati_message_id),
    whatsapp_message_id=COALESCE(a.whatsapp_message_id,e.whatsapp_message_id)
    FROM wati_notification_events e WHERE e.local_id=a.id::text AND e.api_host=a.api_host
      AND (e.channel='' OR a.channel='' OR e.channel=a.channel)
      AND ((a.wati_message_id IS NULL AND e.wati_message_id IS NOT NULL)
        OR (a.whatsapp_message_id IS NULL AND e.whatsapp_message_id IS NOT NULL))`);
  await query.query(`WITH latest AS (
      SELECT DISTINCT ON(job_id) * FROM wati_notification_attempts ORDER BY job_id,created_at DESC,id DESC
    ), ranked AS (
      SELECT a.job_id,e.status,e.error_code,
        CASE e.status WHEN 'read' THEN 5 WHEN 'delivered' THEN 4 WHEN 'failed' THEN 3 ELSE 2 END AS rank,
        row_number() OVER(PARTITION BY a.job_id ORDER BY
          CASE e.status WHEN 'read' THEN 5 WHEN 'delivered' THEN 4 WHEN 'failed' THEN 3 ELSE 2 END DESC) AS n
      FROM latest a JOIN wati_notification_events e ON
        (e.local_id=a.id::text OR (e.wati_message_id IS NOT NULL AND e.wati_message_id=a.wati_message_id)
          OR (e.whatsapp_message_id IS NOT NULL AND e.whatsapp_message_id=a.whatsapp_message_id))
        AND e.api_host=a.api_host AND (e.channel='' OR a.channel='' OR e.channel=a.channel)
    ) UPDATE notification_jobs j SET status=r.status,error_code=r.error_code,
      retryable=false,updated_at=now() FROM ranked r
      WHERE j.id=r.job_id AND j.channel='whatsapp' AND r.n=1
        AND j.status IN ('processing','unknown','accepted','sent','failed','delivered')
        AND r.rank > CASE j.status WHEN 'read' THEN 5 WHEN 'delivered' THEN 4 WHEN 'failed' THEN 3 WHEN 'sent' THEN 2 ELSE 0 END`);
}
