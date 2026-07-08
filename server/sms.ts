// SMS/WhatsApp OTP delivery.
//
// BUG FIX: this used to ONLY ever send through BhashSMS, reading raw
// BHASHSMS_* environment variables - regardless of what an admin configured
// and activated in the "SMS/WhatsApp Providers" admin panel (Twilio, MSG91,
// BhashSMS, or WATI). That whole settings screen had zero effect on actual
// delivery. This now looks up whichever provider is marked active in the
// notificationProviders table and dispatches to it, falling back to the old
// BhashSMS-via-env-vars behavior only if nothing is configured in the DB.
import { db } from "./db";
import { notificationProviders } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function getActiveSmsProvider() {
  const [provider] = await db
    .select()
    .from(notificationProviders)
    .where(and(eq(notificationProviders.providerType, "sms"), eq(notificationProviders.isActive, true)));
  return provider || null;
}

function formatIndianPhone(phone: string): string | null {
  let formatted = phone.replace(/\D/g, "");
  if (formatted.startsWith("91") && formatted.length === 12) {
    formatted = formatted.substring(2);
  }
  return formatted.length === 10 ? formatted : null;
}

async function sendViaTwilio(provider: any, phone: string, message: string): Promise<boolean> {
  const isLive = provider.mode === "live";
  const accountSid = isLive ? provider.accountSid : provider.sandboxAccountSid;
  const authToken = isLive ? provider.authToken : provider.sandboxAuthToken;
  const fromNumber = isLive ? provider.fromNumber : provider.sandboxFromNumber;
  if (!accountSid || !authToken || !fromNumber) {
    console.error("[SMS] Twilio is active but missing credentials for mode:", provider.mode);
    return false;
  }
  try {
    const to = phone.startsWith("+") ? phone : `+91${formatIndianPhone(phone) || phone}`;
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("[SMS] Twilio error:", data);
      return false;
    }
    console.log(`[SMS] Sent via Twilio to ${to}, sid=${data.sid}`);
    return true;
  } catch (error) {
    console.error("[SMS] Twilio request failed:", error);
    return false;
  }
}

async function sendViaMsg91(provider: any, phone: string, code: string): Promise<boolean> {
  const isLive = provider.mode === "live";
  const apiKey = isLive ? provider.apiKey : provider.sandboxApiKey;
  const senderId = isLive ? provider.accountSid : provider.sandboxAccountSid; // "Sender ID" field
  const templateId = isLive ? provider.fromNumber : provider.sandboxFromNumber; // "Template ID (DLT)" field
  if (!apiKey || !senderId || !templateId) {
    console.error("[SMS] MSG91 is active but missing credentials for mode:", provider.mode);
    return false;
  }
  const formattedPhone = formatIndianPhone(phone);
  if (!formattedPhone) {
    console.error("[SMS] Invalid phone number for MSG91:", phone);
    return false;
  }
  try {
    // MSG91 Flow (template) API. NOTE: "OTP" below is the variable name
    // used by MSG91's own default OTP template - if your registered DLT
    // template uses a different variable name for the code, update the key
    // in this payload to match it exactly, or the SMS will send with a
    // blank/incorrect code.
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "authkey": apiKey },
      body: JSON.stringify({
        template_id: templateId,
        sender: senderId,
        short_url: "0",
        mobiles: `91${formattedPhone}`,
        OTP: code,
      }),
    });
    const data = await response.json();
    if (data.type !== "success") {
      console.error("[SMS] MSG91 error:", data);
      return false;
    }
    console.log(`[SMS] Sent via MSG91 to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error("[SMS] MSG91 request failed:", error);
    return false;
  }
}

async function sendViaWati(provider: any, phone: string, message: string): Promise<boolean> {
  const isLive = provider.mode === "live";
  const apiKey = isLive ? provider.apiKey : provider.sandboxApiKey;
  const tenantId = isLive ? provider.accountSid : provider.sandboxAccountSid; // "Phone Number ID" field, used as WATI tenant id
  if (!apiKey || !tenantId) {
    console.error("[SMS] WATI is active but missing credentials for mode:", provider.mode);
    return false;
  }
  const formattedPhone = formatIndianPhone(phone);
  if (!formattedPhone) {
    console.error("[SMS] Invalid phone number for WATI:", phone);
    return false;
  }
  try {
    // NOTE: WATI's API base URL is tenant-specific
    // (https://live-mt-server.wati.io/{tenantId}/...) - confirm the exact
    // host/tenant id format against your WATI account before relying on this.
    const url = `https://live-mt-server.wati.io/${tenantId}/api/v1/sendSessionMessage/91${formattedPhone}?messageText=${encodeURIComponent(message)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const data = await response.json();
    if (!response.ok || data.result === false) {
      console.error("[SMS] WATI error:", data);
      return false;
    }
    console.log(`[SMS] Sent via WATI to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error("[SMS] WATI request failed:", error);
    return false;
  }
}

async function sendViaBhashSms(
  phone: string,
  code: string,
  creds?: { user: string; password: string; sender: string }
): Promise<boolean> {
  const user = creds?.user || process.env.BHASHSMS_USER;
  const password = creds?.password || process.env.BHASHSMS_PASSWORD;
  const sender = creds?.sender || process.env.BHASHSMS_SENDER || "LEASEO";

  if (!user || !password) {
    console.log("[SMS] BhashSMS credentials not configured");
    return false;
  }

  try {
    const formattedPhone = formatIndianPhone(phone);
    if (!formattedPhone) {
      console.error("[SMS] Invalid phone number format:", phone);
      return false;
    }

    const message = `Your Leaseo verification code is: ${code}. Valid for 10 minutes. Do not share this code with anyone.`;

    const url = new URL("http://bhashsms.com/api/sendmsg.php");
    url.searchParams.append("user", user);
    url.searchParams.append("pass", password);
    url.searchParams.append("sender", sender);
    url.searchParams.append("phone", formattedPhone);
    url.searchParams.append("text", message);
    url.searchParams.append("priority", "ndnd");
    url.searchParams.append("stype", "normal");

    console.log(`[SMS] Sending OTP to ${formattedPhone} via BhashSMS...`);

    const response = await fetch(url.toString());
    const result = await response.text();

    console.log(`[SMS] BhashSMS response: ${result}`);

    if (result.toLowerCase().includes('success') || result.match(/^\d+$/)) {
      console.log(`[SMS] OTP sent successfully to ${formattedPhone}`);
      return true;
    } else {
      console.error(`[SMS] Failed to send OTP: ${result}`);
      return false;
    }
  } catch (error: any) {
    console.error("[SMS] Error sending OTP:", error.message || error);
    return false;
  }
}

export async function sendOTPSMS(phone: string, code: string): Promise<boolean> {
  const message = `Your Leaseo verification code is: ${code}. Valid for 10 minutes. Do not share this code with anyone.`;

  const activeProvider = await getActiveSmsProvider();

  if (activeProvider) {
    switch (activeProvider.providerName) {
      case "twilio":
        return sendViaTwilio(activeProvider, phone, message);
      case "msg91":
        return sendViaMsg91(activeProvider, phone, code);
      case "wati":
        return sendViaWati(activeProvider, phone, message);
      case "bhashsms": {
        const isLive = activeProvider.mode === "live";
        return sendViaBhashSms(phone, code, {
          user: (isLive ? activeProvider.accountSid : activeProvider.sandboxAccountSid) || "",
          password: (isLive ? activeProvider.authToken : activeProvider.sandboxAuthToken) || "",
          sender: (isLive ? activeProvider.fromNumber : activeProvider.sandboxFromNumber) || "LEASEO",
        });
      }
      default:
        console.warn(`[SMS] Unknown active provider "${activeProvider.providerName}", falling back to BhashSMS env vars`);
        return sendViaBhashSms(phone, code);
    }
  }

  // Nothing configured in the admin panel - fall back to legacy env vars
  // so existing deployments keep working exactly as before.
  return sendViaBhashSms(phone, code);
}
