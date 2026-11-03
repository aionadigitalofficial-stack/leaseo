import { createHmac, timingSafeEqual } from "node:crypto";

type Environment = Record<string, string | undefined>;

export class WhatsAppError extends Error {
  code: string;
  httpStatus: number;
  retryable: boolean;

  constructor(code: string, httpStatus = 400, retryable = false) {
    super(code);
    this.name = "WhatsAppError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable;
  }
}

const requiredKeys = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_API_VERSION",
] as const;

export function configurationStatus(env: Environment = process.env) {
  const missing = requiredKeys.filter(key => !env[key]?.trim());
  const invalid: string[] = [];
  if (env.WHATSAPP_API_VERSION && !/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION)) {
    invalid.push("WHATSAPP_API_VERSION");
  }
  for (const key of ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_BUSINESS_ACCOUNT_ID"]) {
    if (env[key] && !/^\d+$/.test(env[key]!)) invalid.push(key);
  }
  if (env.WHATSAPP_ENABLED && !["true", "false"].includes(env.WHATSAPP_ENABLED)) {
    invalid.push("WHATSAPP_ENABLED");
  }
  return {
    enabled: env.WHATSAPP_ENABLED === "true",
    configured: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    testRecipientConfigured: Boolean(env.WHATSAPP_TEST_RECIPIENT),
    webhookPath: "/api/whatsapp/webhook",
    automaticNotifications: false,
  };
}

/** Require an explicit country code. Never guess +91 or rewrite a foreign number. */
export function normalizePhone(value: string): string {
  const normalized = value.trim().replace(/[ ()-]/g, "").replace(/^\+/, "");
  if (!/^[1-9]\d{7,14}$/.test(normalized)) {
    throw new WhatsAppError("INVALID_INTERNATIONAL_PHONE");
  }
  return normalized;
}

export function secretMatches(actual: string, expected: string): boolean {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  appSecret: string,
): boolean {
  if (!appSecret || !signature || !/^sha256=[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return secretMatches(signature.slice(7).toLowerCase(), expected);
}

export type TemplateMessage = {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
  /** Caller must verify a stored, current WhatsApp opt-in before setting this. */
  consentConfirmed: boolean;
};

/**
 * Sending is deliberately NOT wired to search, enquiries, or the WhatsApp button.
 * An accepted Meta response is not proof of delivery; use webhook events.
 */
export async function sendTemplateMessage(
  input: TemplateMessage,
  env: Environment = process.env,
  fetcher: typeof fetch = fetch,
): Promise<{ messageId: string; status: "accepted" }> {
  const status = configurationStatus(env);
  if (!status.enabled) throw new WhatsAppError("WHATSAPP_DISABLED", 503);
  if (!status.configured) throw new WhatsAppError("WHATSAPP_NOT_CONFIGURED", 503);
  if (input.consentConfirmed !== true) throw new WhatsAppError("WHATSAPP_OPT_IN_REQUIRED");
  const to = normalizePhone(input.to);
  if (!/^[a-z0-9_]{1,512}$/.test(input.templateName)) {
    throw new WhatsAppError("INVALID_TEMPLATE_NAME");
  }
  if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(input.languageCode)) {
    throw new WhatsAppError("INVALID_TEMPLATE_LANGUAGE");
  }
  const values = input.bodyParameters ?? [];
  if (!Array.isArray(values) || values.length > 30 ||
      values.some(value => typeof value !== "string" || !value.trim() || value.length > 1024)) {
    throw new WhatsAppError("INVALID_TEMPLATE_PARAMETERS");
  }

  let response: Response;
  try {
    response = await fetcher(
      `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: input.templateName,
            language: { code: input.languageCode },
            ...(values.length ? {
              components: [{
                type: "body",
                parameters: values.map(text => ({ type: "text", text })),
              }],
            } : {}),
          },
        }),
        signal: AbortSignal.timeout(15_000),
        redirect: "error",
      },
    );
  } catch {
    // Meta may have accepted a timed-out request. Do not retry blindly.
    throw new WhatsAppError("META_REQUEST_OUTCOME_UNKNOWN", 502);
  }

  if (!response.ok) {
    // Do not expose provider payloads: they may contain recipient data or credentials.
    const code = response.status === 401 || response.status === 403
      ? "META_AUTHORIZATION_FAILED"
      : response.status === 429 ? "META_RATE_LIMITED" : "META_SEND_REJECTED";
    throw new WhatsAppError(code, 502, response.status === 429);
  }
  let result: { messages?: { id?: unknown }[] };
  try {
    result = await response.json();
  } catch {
    throw new WhatsAppError("META_INVALID_RESPONSE", 502);
  }
  const messageId = result?.messages?.[0]?.id;
  if (typeof messageId !== "string" || !messageId.startsWith("wamid.")) {
    throw new WhatsAppError("META_INVALID_RESPONSE", 502);
  }
  return { messageId, status: "accepted" };
}

export type DeliveryEvent = {
  messageId: string;
  status: string;
  eventTimestamp: string;
  errorCode: number | null;
};

/** Keep only delivery metadata; never store message text, names, or phone numbers. */
export function parseDeliveryEvents(payload: unknown, phoneNumberId: string, businessAccountId: string): DeliveryEvent[] {
  const body = payload as any;
  if (body?.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
    throw new WhatsAppError("INVALID_WEBHOOK_PAYLOAD");
  }
  const events: DeliveryEvent[] = [];
  for (const entry of body.entry) {
    if (entry?.id !== businessAccountId || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (change?.field !== "messages" || change.value?.metadata?.phone_number_id !== phoneNumberId) continue;
      const statuses = change.value.statuses;
      if (statuses === undefined) continue; // Incoming messages intentionally do not trigger replies.
      if (!Array.isArray(statuses) || statuses.length > 1000) throw new WhatsAppError("INVALID_WEBHOOK_PAYLOAD");
      for (const status of statuses) {
        if (!status || typeof status.id !== "string" || status.id.length > 512 ||
            !["sent", "delivered", "read", "failed", "deleted"].includes(status.status) ||
            typeof status.timestamp !== "string" || !/^\d{1,12}$/.test(status.timestamp)) {
          throw new WhatsAppError("INVALID_WEBHOOK_STATUS");
        }
        const code = status.errors?.[0]?.code;
        events.push({
          messageId: status.id,
          status: status.status,
          eventTimestamp: status.timestamp,
          errorCode: Number.isSafeInteger(code) && code >= 0 && code <= 2147483647 ? code : null,
        });
      }
    }
  }
  return events;
}
