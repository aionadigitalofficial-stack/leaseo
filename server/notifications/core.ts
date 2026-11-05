export const placeholders = [
  "customer_name", "customer_phone", "customer_email", "owner_name", "owner_phone",
  "owner_email", "property_title", "property_id", "property_location", "property_price",
  "property_type", "property_url", "platform_name", "request_date", "request_time",
] as const;

export class ContactError extends Error {
  constructor(public code: string, public status = 400, public retryable = false) {
    super(code);
  }
}

export function renderMessage(text: string, values: Record<string, string>): string {
  const result = text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => {
    if (!placeholders.includes(key as any)) throw new ContactError("UNKNOWN_PLACEHOLDER");
    return String(values[key] || "Not provided");
  });
  if (result.includes("{{") || result.includes("}}")) throw new ContactError("INVALID_PLACEHOLDER");
  return result;
}

/** Stored local numbers use the account country code, never prepend it twice. */
export function accountPhone(phone: string, countryCode = "+91"): string {
  let digits = phone.replace(/[ ()+-]/g, "");
  if (digits.length === 10 && countryCode && !phone.trim().startsWith("+")) digits = countryCode.replace(/\D/g, "") + digits;
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new ContactError("INVALID_PHONE");
  return digits;
}

export function whatsappLink(phone: string, message: string): string {
  const international=phone.replace(/[ ()+-]/g,"");
  if(!/^[1-9]\d{7,14}$/.test(international))throw new ContactError("INVALID_PHONE");
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export function validateTemplate(input: any) {
  const allowed = new Set(["template_name", "subject", "message_body", "is_enabled",
    "meta_template_name", "meta_language", "parameter_keys", "sms_template_id"]);
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(key => !allowed.has(key))) throw new ContactError("INVALID_TEMPLATE");
  for (const [key, value] of Object.entries(input)) {
    if (key === "is_enabled") {
      if (typeof value !== "boolean") throw new ContactError("INVALID_TEMPLATE");
    } else if (key === "parameter_keys") {
      if (!Array.isArray(value) || value.length > 30 ||
          value.some(k => !placeholders.includes(k))) throw new ContactError("INVALID_PARAMETERS");
    } else if (typeof value !== "string" || value.length > (key === "message_body" ? 10000 : 250)) {
      throw new ContactError("INVALID_TEMPLATE");
    }
  }
  if (input.message_body !== undefined) {
    if (!input.message_body.trim()) throw new ContactError("EMPTY_MESSAGE");
    renderMessage(input.message_body, {});
  }
  if (input.subject) {
    if (/[\r\n]/.test(input.subject)) throw new ContactError("INVALID_EMAIL_SUBJECT");
    renderMessage(input.subject, {});
  }
  if (input.meta_template_name && !/^[a-z0-9_]+$/.test(input.meta_template_name)) throw new ContactError("INVALID_META_TEMPLATE");
  if (input.meta_language && !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(input.meta_language)) throw new ContactError("INVALID_LANGUAGE");
  if (input.sms_template_id && !/^[a-zA-Z0-9_-]+$/.test(input.sms_template_id)) throw new ContactError("INVALID_SMS_TEMPLATE");
  return input;
}

export function safeProviderCode(error: any): string {
  const code = error instanceof ContactError ? error.code : error?.code;
  return typeof code === "string" && /^[A-Z0-9_]{1,80}$/.test(code) ? code : "PROVIDER_REQUEST_OUTCOME_UNKNOWN";
}
