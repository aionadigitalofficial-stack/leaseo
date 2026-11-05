import { randomInt, randomUUID } from "node:crypto";
import { pool } from "../db";
import { hashPassword, verifyPassword } from "../auth";
import { sendOTPSMS } from "../sms";
import { loadConfig } from "./config";
import { accountPhone, ContactError, renderMessage, whatsappLink } from "./core";

export async function verification(userId:string, query:any=pool) {
  const {rows} = await query.query("SELECT phone,country_code,phone_verified_at,is_active FROM users WHERE id=$1",[userId]);
  const user = rows[0];
  if (!user || !user.is_active) throw new ContactError("ACCOUNT_UNAVAILABLE",403);
  return {verified:Boolean(user.phone && user.phone_verified_at),phone:user.phone,
    verifiedAt:user.phone_verified_at,verificationExpiry:null};
}

export async function requestOtp(userId:string, send:typeof sendOTPSMS=sendOTPSMS) {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const {rows:[user]} = await client.query("SELECT phone,country_code,phone_verified_at FROM users WHERE id=$1 FOR UPDATE",[userId]);
    if (!user?.phone) throw new ContactError("ADD_REGISTERED_PHONE_IN_PROFILE");
    if (user.phone_verified_at) {
      await client.query("COMMIT");
      return {success:true,alreadyVerified:true,expiresIn:0};
    }
    const phone = accountPhone(user.phone,user.country_code);
    const {rows:[previous]} = await client.query("SELECT * FROM property_contact_otps WHERE user_id=$1",[userId]);
    const now=Date.now();
    if (previous && now-new Date(previous.requested_at).getTime()<60000) throw new ContactError("OTP_RESEND_WAIT_60_SECONDS",429);
    const sameWindow=previous && now-new Date(previous.window_start).getTime()<3600000;
    if (sameWindow && previous.send_count>=5) throw new ContactError("OTP_HOURLY_LIMIT",429);
    const code=String(randomInt(100000,1000000));
    const hash=await hashPassword(code);
    await client.query(`INSERT INTO property_contact_otps(user_id,phone,code_hash,expires_at,send_count,window_start)
      VALUES($1,$2,$3,now()+interval '10 minutes',$4,$5)
      ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,code_hash=excluded.code_hash,
      attempts=0,expires_at=excluded.expires_at,consumed_at=NULL,requested_at=now(),
      send_count=excluded.send_count,window_start=excluded.window_start`,
      [userId,phone,hash,sameWindow?previous.send_count+1:1,sameWindow?previous.window_start:new Date()]);
    // Keep the account lock until delivery returns: concurrent resends cannot bypass limits.
    const sent = await send(`+${phone}`,code);
    if (!sent) {
      await client.query("UPDATE property_contact_otps SET consumed_at=now() WHERE user_id=$1",[userId]);
      await client.query("COMMIT"); // Failed sends still count toward the throttle.
      throw new ContactError("OTP_DELIVERY_FAILED_CHECK_SMS_PROVIDER",503);
    }
    await client.query("COMMIT");
    return {success:true,expiresIn:600};
  } catch(e) {await client.query("ROLLBACK");throw e;}
  finally{client.release();}
}

export async function verifyOtp(userId:string,code:string) {
  if (typeof code!=="string" || !/^\d{6}$/.test(code)) throw new ContactError("INVALID_OTP");
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const {rows:[user]}=await client.query("SELECT phone,country_code FROM users WHERE id=$1 FOR UPDATE",[userId]);
    const {rows:[otp]}=await client.query("SELECT * FROM property_contact_otps WHERE user_id=$1 FOR UPDATE",[userId]);
    if (!otp || otp.consumed_at || new Date(otp.expires_at).getTime()<=Date.now()) throw new ContactError("OTP_EXPIRED_OR_CONSUMED");
    if (!user?.phone || accountPhone(user.phone,user.country_code)!==otp.phone) throw new ContactError("REGISTERED_PHONE_CHANGED");
    if (otp.attempts>=5) throw new ContactError("OTP_ATTEMPTS_EXCEEDED",429);
    if (!await verifyPassword(code,otp.code_hash)){
      await client.query("UPDATE property_contact_otps SET attempts=attempts+1 WHERE user_id=$1",[userId]);
      await client.query("COMMIT");
      throw new ContactError("INVALID_OTP");
    }
    await client.query("UPDATE property_contact_otps SET consumed_at=now() WHERE user_id=$1",[userId]);
    await client.query("UPDATE users SET phone_verified_at=now(),updated_at=now() WHERE id=$1",[userId]);
    await client.query("COMMIT");
    return {verified:true};
  }catch(e){await client.query("ROLLBACK");throw e;}
  finally{client.release();}
}

export async function propertyContext(userId:string,propertyId:string,query:any=pool) {
  const {rows:[p]}=await query.query(`SELECT p.*,u.first_name AS owner_first,u.last_name AS owner_last,
    u.phone AS account_owner_phone,u.email AS account_owner_email,u.country_code AS owner_country
    FROM properties p LEFT JOIN users u ON p.owner_id=u.id
    WHERE p.id=$1 AND p.deleted_at IS NULL AND p.status='active'`,[propertyId]);
  if(!p)throw new ContactError("PROPERTY_UNAVAILABLE",404);
  const {rows:[customer]}=await query.query("SELECT * FROM users WHERE id=$1",[userId]);
  if(!customer?.is_active || !customer.phone || !customer.phone_verified_at)throw new ContactError("MOBILE_VERIFICATION_REQUIRED",403);
  if(p.owner_id===userId)throw new ContactError("CANNOT_ENQUIRE_OWN_PROPERTY",403);
  // Explicit listing contact is authoritative for staff-posted properties.
  const ownerPhone=accountPhone(p.owner_contact_phone || p.account_owner_phone || "",p.owner_country || "+91");
  const {settings}=await loadConfig(query);
  if(!settings.siteUrl)throw new ContactError("ADMIN_MUST_CONFIGURE_SITE_URL",503);
  const now=new Date();
  const values:Record<string,string>={
    customer_name:[customer.first_name,customer.last_name].filter(Boolean).join(" ") || "Customer",
    customer_phone:accountPhone(customer.phone,customer.country_code),customer_email:customer.email || "",
    owner_name:p.owner_contact_name || [p.owner_first,p.owner_last].filter(Boolean).join(" ") || "Property owner",
    owner_phone:ownerPhone,owner_email:p.owner_contact_email || p.account_owner_email || "",
    property_title:p.title,property_id:p.id,property_location:[p.address,p.city,p.state].filter(Boolean).join(", "),
    property_price:`₹${Number(p.price).toLocaleString("en-IN")}${p.listing_type==="rent"?`/${p.price_unit || "month"}`:""}`,
    property_type:p.property_type,property_url:`${settings.siteUrl.replace(/\/$/,"")}/properties/${encodeURIComponent(p.id)}`,
    platform_name:settings.platformName,request_date:now.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata"}),
    request_time:now.toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata"}),
  };
  return {p,customer,values,settings};
}

async function chatResult(query:any,phone:string,values:Record<string,string>){
  const {rows:[template]}=await query.query("SELECT * FROM notification_templates WHERE id='customer_owner_chat'");
  if(!template?.is_enabled)throw new ContactError("CONTACT_CHAT_TEMPLATE_DISABLED",503);
  return {ownerPhone:phone,whatsappUrl:whatsappLink(phone,renderMessage(template.message_body,values))};
}

export async function getContact(userId:string,propertyId:string){
  const {p,values}=await propertyContext(userId,propertyId);
  const {rows:[access]}=await pool.query("SELECT enquiry_id FROM property_contact_access WHERE customer_id=$1 AND property_id=$2",[userId,p.id]);
  if(!access)return {hasAccess:false};
  return {hasAccess:true,enquiryId:access.enquiry_id,...await chatResult(pool,values.owner_phone,values)};
}

export async function createContact(userId:string,propertyId:string,consent:boolean){
  if(consent!==true)throw new ContactError("CONTACT_AND_NOTIFICATION_CONSENT_REQUIRED");
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`${userId}:${propertyId}`]);
    const {p,customer,values,settings}=await propertyContext(userId,propertyId,client);
    const chat=await chatResult(client,values.owner_phone,values);
    const {rows:[existing]}=await client.query("SELECT * FROM property_contact_access WHERE customer_id=$1 AND property_id=$2",[userId,propertyId]);
    if(existing){
      await client.query("COMMIT");
      return {enquiryId:existing.enquiry_id,created:false,notificationStatus:"existing",...chat};
    }
    const enquiryId=randomUUID();
    const {rows:[enquiryTemplate]}=await client.query("SELECT message_body FROM notification_templates WHERE id='customer_owner_chat'");
    await client.query(`INSERT INTO enquiries(id,property_id,user_id,name,email,phone,message,status)
      VALUES($1,$2,$3,$4,$5,$6,$7,'new')`,
      [enquiryId,p.id,userId,values.customer_name,values.customer_email,values.customer_phone,renderMessage(enquiryTemplate.message_body,values)]);
    await client.query(`INSERT INTO property_contact_access(id,enquiry_id,customer_id,property_id,owner_id,verified_phone,consent_confirmed,context)
      VALUES($1,$2,$3,$4,$5,$6,true,$7::jsonb)`,
      [randomUUID(),enquiryId,userId,p.id,p.owner_id,values.customer_phone,JSON.stringify(values)]);
    const {rows:templates}=await client.query("SELECT * FROM notification_templates WHERE channel<>'chat' AND event_type='property_contact'");
    for(const t of templates){
      const recipient=t.recipient_type==="customer" ? (t.channel==="email"?customer.email:values.customer_phone) :
        t.recipient_type==="owner" ? (t.channel==="email"?values.owner_email:values.owner_phone) :
        (t.channel==="email"?settings.adminEmail:settings.adminPhone);
      const channelEnabled=settings[`${t.channel}Enabled` as keyof typeof settings];
      const approvedConsent=t.recipient_type==="customer" ? true :
        t.recipient_type==="owner" ? settings.ownerWhatsappConsent : settings.adminWhatsappConsent;
      const error=!channelEnabled?"CHANNEL_DISABLED":!t.is_enabled?"TEMPLATE_DISABLED":!recipient?"RECIPIENT_MISSING":
        t.channel==="whatsapp" && !approvedConsent?"WHATSAPP_CONSENT_REQUIRED":null;
      await client.query(`INSERT INTO notification_jobs(id,enquiry_id,customer_id,property_id,recipient_type,recipient_id,
        recipient,channel,template_id,consent_confirmed,status,error_code)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
        [randomUUID(),enquiryId,userId,p.id,t.recipient_type,t.recipient_type==="customer"?userId:t.recipient_type==="owner"?p.owner_id:null,
          recipient||"",t.channel,t.id,approvedConsent,error?"skipped":"pending",error]);
    }
    await client.query("COMMIT");
    return {enquiryId,created:true,notificationStatus:"queued",...chat};
  }catch(e){await client.query("ROLLBACK");throw e;}
  finally{client.release();}
}
