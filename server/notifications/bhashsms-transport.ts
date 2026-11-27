import { requestBhashSms } from "../bhashsms-otp-transport";
import { inspectBhashSmsResponse, logBhashSms, logCustomerSmsReply } from "../bhashsms-diagnostics";
import { ContactError } from "./core";

export async function sendBhashEnquiry(
  url: URL,
  customerSource?: "admin_test" | "live_enquiry",
  transport: typeof requestBhashSms = requestBhashSms,
): Promise<{ messageId: string | null; status: "accepted" }> {
  let httpStatus: number | undefined;
  let result: ReturnType<typeof inspectBhashSmsResponse>;
  try {
    // Same one-shot native HTTPS/IPv4 transport as OTP; never retry here.
    const raw = await transport(url, status => { httpStatus = status; });
    if (httpStatus === 429) throw new ContactError("PROVIDER_RATE_LIMITED", 502, true);
    if (httpStatus === undefined || httpStatus < 200 || httpStatus >= 300) {
      throw new ContactError(`PROVIDER_HTTP_${httpStatus ?? 0}`, 502);
    }
    result = inspectBhashSmsResponse(raw);
    if (customerSource && !result.enquiryAccepted) {
      logCustomerSmsReply(raw, null, customerSource);
    }
  } catch (error) {
    logBhashSms("enquiry", httpStatus === undefined ? "request_error"
      : httpStatus >= 300 ? "http_error" : "body_error", httpStatus);
    // Raw network codes must not escape as definite failures: the queue only
    // knows an interrupted send is ambiguous, and must not send it again.
    if (error instanceof ContactError) throw error;
    throw new ContactError("PROVIDER_REQUEST_OUTCOME_UNKNOWN", 502);
  }
  logBhashSms("enquiry", result.enquiryAccepted ? "accepted" : "unrecognized",
    httpStatus, result, url.searchParams.values());
  if (!result.enquiryAccepted) throw new ContactError("BHASHSMS_RESPONSE_OUTCOME_UNKNOWN", 502);
  return { messageId: result.messageId, status: "accepted" };
}
