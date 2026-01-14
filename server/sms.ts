// BhashSMS Integration for India
// API: http://bhashsms.com/api/sendmsg.php

export async function sendOTPSMS(phone: string, code: string): Promise<boolean> {
  const user = process.env.BHASHSMS_USER;
  const password = process.env.BHASHSMS_PASSWORD;
  const sender = process.env.BHASHSMS_SENDER || "LEASEO";

  if (!user || !password) {
    console.log("[SMS] BhashSMS credentials not configured");
    return false;
  }

  try {
    // Format phone number (remove +91 if present, ensure 10 digits)
    let formattedPhone = phone.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
      formattedPhone = formattedPhone.substring(2); // Remove country code
    }
    if (formattedPhone.length !== 10) {
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

    // BhashSMS returns various response codes
    // Success usually contains "success" or a message ID
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
