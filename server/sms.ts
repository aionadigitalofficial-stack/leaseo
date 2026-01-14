import twilio from "twilio";

let client: twilio.Twilio | null = null;
let lastAccountSid: string | null = null;

function getTwilioClient(): twilio.Twilio | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.log("[SMS] Twilio credentials not configured");
    return null;
  }
  
  if (!client || lastAccountSid !== accountSid) {
    console.log(`[SMS] Initializing Twilio client with SID: ${accountSid.substring(0, 6)}...`);
    client = twilio(accountSid, authToken);
    lastAccountSid = accountSid;
  }
  return client;
}

export async function sendOTPSMS(phone: string, code: string): Promise<boolean> {
  const twilioClient = getTwilioClient();
  
  if (!twilioClient) {
    console.log("[SMS] Twilio client not available - SMS not sent");
    return false;
  }

  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!twilioPhoneNumber) {
    console.log("[SMS] Twilio phone number not configured");
    return false;
  }

  try {
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    
    const message = await twilioClient.messages.create({
      body: `Your Leaseo verification code is: ${code}. Valid for 10 minutes. Do not share this code with anyone.`,
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log(`[SMS] OTP sent to ${formattedPhone}, SID: ${message.sid}`);
    return true;
  } catch (error: any) {
    console.error("[SMS] Failed to send OTP:", error.message || error);
    return false;
  }
}
