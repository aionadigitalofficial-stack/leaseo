export type SmsDeliveryStatus = "accepted" | "unknown" | "failed";

export function classifyBhashSmsOutcome(
  httpStatus: number | undefined,
  acceptedReply: boolean,
  requestFailed = false,
): SmsDeliveryStatus {
  if (httpStatus === undefined) return requestFailed ? "unknown" : "failed";
  if (httpStatus < 200 || httpStatus >= 300) return "failed";
  return acceptedReply ? "accepted" : "failed";
}
