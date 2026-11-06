import { createHash, timingSafeEqual } from "node:crypto";
import { ContactError, accountPhone, placeholders } from "./core";

/** Restrict credentials to WATI-controlled HTTPS hosts; no arbitrary admin URL fetches. */
export function watiHost(value: unknown): string {
  let url: URL;
  try { url = new URL(String(value)); } catch { throw new ContactError("WATI_API_HOST_INVALID"); }
  if (url.protocol !== "https:" || !/^(?:[a-z0-9-]+\.)+wati\.io$/.test(url.hostname) ||
      url.username || url.password || url.port || url.search || url.hash || !["", "/"].includes(url.pathname)) {
    throw new ContactError("WATI_API_HOST_INVALID");
  }
  return url.origin;
}

export function watiSettingsInput(input: any) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(k => !["apiHost", "channel", "apiToken"].includes(k))) {
    throw new ContactError("WATI_SETTINGS_INVALID");
  }
  const apiHost = watiHost(input.apiHost);
  if (typeof input.channel !== "string" || !/^(?:[1-9]\d{7,14})?$/.test(input.channel)) {
    throw new ContactError("WATI_CHANNEL_INVALID");
  }
  const apiToken = input.apiToken ?? "";
  if (typeof apiToken !== "string" || apiToken.length > 8192 || /[\s]/.test(apiToken)) {
    throw new ContactError("WATI_TOKEN_INVALID");
  }
  return { apiHost, channel: input.channel, apiToken };
}

export function watiPayload(id: string, to: string, template: any, values: Record<string, string>, channel: string) {
  if (!/^[a-z0-9_]{1,250}$/.test(template.meta_template_name || "")) {
    throw new ContactError("WATI_APPROVED_TEMPLATE_REQUIRED");
  }
  const keys = template.parameter_keys;
  if (!Array.isArray(keys) || keys.some(k => !placeholders.includes(k))) throw new ContactError("INVALID_PARAMETERS");
  // WATI binds named parameters, not their positions. Duplicates in old Meta mappings are collapsed.
  const params = Array.from(new Set<string>(keys)).map(name => {
    const value = values[name];
    if (typeof value !== "string" || !value.trim() || value.length > 1024) {
      throw new ContactError("WATI_TEMPLATE_VALUE_MISSING_OR_TOO_LONG");
    }
    return { name, value };
  });
  return {
    ...(channel ? { channel } : {}),
    template_name: template.meta_template_name,
    broadcast_name: `Leaseo enquiry ${id}`,
    recipients: [{ target: accountPhone(to), local_message_id: id, custom_params: params }],
  };
}

export function watiResult(data: any, id: string, target: string) {
  if (data?.success !== true) throw new ContactError("WATI_SEND_REJECTED");
  if (typeof data.broadcast_id !== "string" || !data.broadcast_id ||
      !Array.isArray(data.recipients) || data.recipients.length !== 1) {
    throw new ContactError("WATI_SEND_OUTCOME_UNKNOWN", 502);
  }
  const recipient = data.recipients[0];
  if (recipient?.local_message_id !== id ||
      (recipient.target && recipient.target !== target) ||
      (recipient.phone_number && recipient.phone_number.replace(/^\+/, "") !== target)) {
    throw new ContactError("WATI_SEND_OUTCOME_UNKNOWN", 502);
  }
  if (recipient.errors != null && (!Array.isArray(recipient.errors) || recipient.errors.length)) {
    throw new ContactError("WATI_RECIPIENT_REJECTED");
  }
  return data.broadcast_id as string;
}

export function sameSecret(actual: unknown, expected: string) {
  if (typeof actual !== "string" || actual.length > 256) return false;
  return timingSafeEqual(createHash("sha256").update(actual).digest(), createHash("sha256").update(expected).digest());
}

const statuses: Record<string, string> = {
  templateMessageSent: "sent", templateMessageSent_v2: "sent",
  sentMessageDELIVERED: "delivered", sentMessageDELIVERED_v2: "delivered",
  sentMessageREAD: "read", sentMessageREAD_v2: "read", templateMessageFailed: "failed",
};
export function watiEvent(body: any, expectedChannel: string) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ContactError("WATI_EVENT_INVALID");
  const status = Object.hasOwn(statuses, body.eventType) ? statuses[body.eventType] : null;
  if (!status) return null; // Incoming chat messages never create enquiries or notifications.
  const text = (value: any) => typeof value === "string" && value.length <= 512 && !/[\r\n]/.test(value) ? value : "";
  const local = text(body.localMessageId), wati = text(body.id), whatsapp = text(body.whatsappMessageId);
  const channel = text(body.channelPhoneNumber).replace(/^\+/, "");
  if (expectedChannel && channel && channel !== expectedChannel) throw new ContactError("WATI_CHANNEL_MISMATCH", 403);
  if (!local && !wati && !whatsapp) throw new ContactError("WATI_EVENT_IDENTIFIERS_REQUIRED");
  const error = status === "failed" ?
    (/^\d{1,12}$/.test(String(body.failedCode)) ? `WATI_DELIVERY_${body.failedCode}` : "WATI_DELIVERY_FAILED") : null;
  // Store only correlation/status data, never message bodies or contact details.
  const key = createHash("sha256").update(JSON.stringify([expectedChannel, local, wati, whatsapp, status, error])).digest("hex");
  return { key, local: local || null, wati: wati || null, whatsapp: whatsapp || null, channel, status, error };
}
