const safeCodes = new Set([
  "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN",
  "EHOSTUNREACH", "ENETUNREACH", "EPIPE", "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED", "CERT_NOT_YET_VALID", "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "ERR_SSL_WRONG_VERSION_NUMBER",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET", "UND_ERR_ABORTED",
]);

// Error messages may contain request URLs with credentials. Inspect messages
// only for fixed platform phrases and output fixed categories, never text.
export function otpNetworkFailure(error: unknown): string {
  const pending: unknown[] = [error];
  const seen = new Set<unknown>();
  let inspected = 0;
  while (pending.length && inspected++ < 12) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const item = current as { code?: unknown; name?: unknown; message?: unknown; cause?: unknown; errors?: unknown };
    if (typeof item.code === "string" && safeCodes.has(item.code)) return item.code;
    if (typeof item.message === "string") {
      if (/unexpected redirect|redirect count exceeded/i.test(item.message)) return "REDIRECT_BLOCKED";
    }
    if (item.name === "TimeoutError") return "TIMEOUT";
    if (item.name === "AbortError") return "ABORTED";
    if (item.cause) pending.push(item.cause);
    if (Array.isArray(item.errors)) pending.push(...item.errors.slice(0, 8));
  }
  return "UNCLASSIFIED";
}

export function logOtpNetworkFailure(error: unknown, phase: "request" | "response_body") {
  console.info("[BhashSMS OTP network]", JSON.stringify({
    phase, errorCode: otpNetworkFailure(error),
  }));
}
