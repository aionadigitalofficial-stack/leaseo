import https from "node:https";

// A single request, never retried: a timeout may happen after provider acceptance.
// Keep certificate validation enabled and never redirect credential-bearing URLs.
export function requestBhashSms(url: URL, onStatus: (status: number) => void): Promise<string> {
  if (url.protocol !== "https:" || url.hostname !== "bhashsms.com" ||
    url.port || url.username || url.password || url.pathname !== "/api/sendmsg.php") {
    return Promise.reject(new Error("Invalid OTP endpoint"));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error, body = "") => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) reject(error);
      else resolve(body);
    };
    const request = https.request(url, {
      method: "GET",
      family: 4,
      agent: false,
      rejectUnauthorized: true,
    }, response => {
      const status = response.statusCode ?? 0;
      onStatus(status);
      if (status >= 300 && status < 400) {
        finish(new Error("Unexpected redirect"));
        response.destroy();
        request.destroy();
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > 65536) {
          finish(new Error("OTP response exceeds size limit"));
          response.destroy();
          request.destroy();
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => finish(undefined, Buffer.concat(chunks).toString("utf8")));
      response.on("error", error => finish(error));
      response.on("aborted", () => finish(Object.assign(new Error("Response aborted"), { code: "ECONNRESET" })));
    });
    // This bounds connection and response time, not just idle sockets.
    timer = setTimeout(() => {
      const error = Object.assign(new Error("OTP request timed out"), { code: "ETIMEDOUT" });
      finish(error);
      request.destroy(error);
    }, 30000);
    request.on("error", error => finish(error));
    request.end();
  });
}
