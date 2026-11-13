import { createHmac } from "node:crypto";
import jwt from "jsonwebtoken";

// A signup proof must never be accepted as a normal authenticated session.
function signupKey() {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("Authentication configuration missing");
  return createHmac("sha256", secret).update("leaseo:verified-phone-signup:v1").digest("hex");
}
const options = { issuer: "leaseo-phone-login", audience: "leaseo-phone-signup" };

export function createPhoneSignupToken(phone: string, otpId: string) {
  return jwt.sign({ purpose: "phone-signup", phone, otpId }, signupKey(), {
    ...options, algorithm: "HS256", expiresIn: "10m",
  });
}

export function readPhoneSignupToken(token: string): { phone: string; otpId: string } | null {
  try {
    const claims = jwt.verify(token, signupKey(), { ...options, algorithms: ["HS256"] });
    if (typeof claims === "string" || claims.purpose !== "phone-signup" ||
        typeof claims.phone !== "string" || !/^[6-9]\d{9}$/.test(claims.phone) ||
        typeof claims.otpId !== "string") return null;
    return { phone: claims.phone, otpId: claims.otpId };
  } catch { return null; }
}
