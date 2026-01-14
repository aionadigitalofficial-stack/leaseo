import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio | null {
  if (!accountSid || !authToken) {
    console.log("[SMS] Twilio credentials not configured");
    return null;
  }
  if (!client) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

export async function sendOTPSMS(phone: string, code: string): Promise<boolean> {
  const twilioClient = getTwilioClient();
  
  if (!twilioClient) {
    console.log("[SMS] Twilio client not available - SMS not sent");
    return false;
  }

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
