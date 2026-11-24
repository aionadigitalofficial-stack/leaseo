export const BHASH_SMS_ENDPOINT = "https://bhashsms.com/api/sendmsg.php";

type Flow = "otp" | "enquiry";
type ResponseKind = "tracking_reference" | "success_text" | "empty" | "unrecognized";

export function inspectBhashSmsResponse(raw: string) {
  const result = raw.trim();
  const messageId = /^(?:S\.)?\d+$/i.test(result) ? result : null;
  const otpSuccess = result.toLowerCase().includes("success");
  const enquirySuccess = /^success\b/i.test(result);
  const responseKind: ResponseKind = messageId ? "tracking_reference"
    : otpSuccess || enquirySuccess ? "success_text"
    : result ? "unrecognized" : "empty";
  return { messageId, responseKind, otpAccepted: Boolean(messageId) || otpSuccess,
    enquiryAccepted: Boolean(messageId) || enquirySuccess };
}

// Only output fixed labels and booleans. Provider replies can echo the whole
// request (including credentials), so never emit snippets, JSON keys, or IDs here.
export function describeBhashSmsReply(raw: string, contentType: string | null) {
  const mime = contentType?.split(";", 1)[0].trim().toLowerCase();
  const media = mime === "application/json" || mime?.endsWith("+json") ? "json"
    : mime === "text/html" ? "html"
    : mime === "text/plain" ? "text"
    : mime ? "other" : "unspecified";
  const text = raw.trim();
  if (text.length > 8192) return { media, format: "oversized" };

  let format = "text";
  if (!text) {
    format = "empty";
  } else if (/^(?:<!doctype\s+html\b|<html\b|<body\b|<head\b|<br\b|<pre\b)/i.test(text)) {
    format = "html";
  } else if (/^[{["]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      format = Array.isArray(parsed) ? "json_array"
        : typeof parsed === "string" ? "json_string" : "json_object";
    } catch {
      format = media === "json" ? "invalid_json" : "text";
    }
  }

  const references = [...text.matchAll(/(?<![a-z0-9_])S\.\d+(?![a-z0-9_])/gi)];
  const firstReference = references[0];
  const trackingShape = references.length === 0 ? "none"
    : references.length > 1 ? "multiple"
    : firstReference.index === 0 ? "leading"
    : firstReference.index! + firstReference[0].length === text.length ? "trailing" : "embedded";

  return {
    media, format, trackingShape,
    multiline: /[\r\n]/.test(text),
    hasSuccessWord: /\b(?:success|successful|accepted|queued|sent)\b/i.test(text),
    hasErrorWord: /\b(?:error|fail|failed|failure|invalid|rejected|expired|denied|unsuccessful)\b/i.test(text),
  };
}

export function logCustomerSmsReply(raw: string, contentType: string | null, source: "admin_test" | "live_enquiry") {
  console.info("[BhashSMS Customer SMS reply]", JSON.stringify({
    source,
    ...describeBhashSmsReply(raw, contentType),
  }));
}

export function logBhashSms(
  flow: Flow,
  outcome: "accepted" | "unrecognized" | "http_error" | "request_error" | "body_error" | "not_configured" | "invalid_recipient",
  httpStatus?: number,
  response?: ReturnType<typeof inspectBhashSmsResponse>,
  requestValues: Iterable<string> = [],
) {
  const id = response?.messageId;
  const digits = id?.replace(/^S\./i, "");
  // A numeric reply could echo an OTP, phone, or other outbound value.
  // Only log the documented tracking shape, and omit values found in the request.
  const safeReference = digits && /^S\.\d{1,24}$/i.test(id || "") &&
    !Array.from(requestValues).some(value => value.replace(/\D/g, "").includes(digits))
    ? id : undefined;
  console.info("[BhashSMS]", JSON.stringify({
    flow, outcome, httpStatus, responseKind: response?.responseKind, trackingReference: safeReference,
  }));
}
