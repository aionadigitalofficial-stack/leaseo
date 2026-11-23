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
