import nodemailer from "nodemailer";
import { pool } from "../db";
import { sendConfiguredTemplateMessage, loadWhatsAppSettings } from "../whatsapp/settings-store";
import { configurationStatus, normalizePhone } from "../whatsapp/core";
import { ContactError, accountPhone, renderMessage } from "./core";
import { decryptPassword, type Config } from "./config";

type Delivery = { messageId: string | null; status: "accepted" };

async function providerRequest(url: string, init: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, {...init, redirect: "error", signal: AbortSignal.timeout(15000)});
    if (!response.ok) {
      if (response.status === 429) throw new ContactError("PROVIDER_RATE_LIMITED", 502, true);
      throw new ContactError(`PROVIDER_HTTP_${response.status}`, 502);
    }
    return response;
  } catch (e) {
    if (e instanceof ContactError) throw e;
    // A timeout can occur AFTER acceptance. Never blindly retry.
    throw new ContactError("PROVIDER_REQUEST_OUTCOME_UNKNOWN", 502);
  }
}

async function activeSms() {
  const { rows } = await pool.query("SELECT * FROM notification_providers WHERE provider_type='sms' AND is_active=true ORDER BY updated_at DESC LIMIT 1");
  return rows[0];
}

export async function providerStatus(config: Config, encrypted: string | null) {
  let whatsapp = {configured:false,enabled:false};
  try {
    const s = configurationStatus((await loadWhatsAppSettings()).environment);
    whatsapp = {configured:s.configured,enabled:s.enabled};
  } catch { /* visibly unconfigured; settings screen exposes its detailed error */ }
  const sms = await activeSms();
  const live = sms?.mode === "live";
  const sid = sms && (live ? sms.account_sid : sms.sandbox_account_sid);
  const auth = sms && (live ? sms.auth_token : sms.sandbox_auth_token);
  const apiKey = sms && (live ? sms.api_key : sms.sandbox_api_key);
  const from = sms && (live ? sms.from_number : sms.sandbox_from_number);
  const smsReady = sms ? (
    sms.provider_name === "twilio" ? Boolean(sid && auth && from) :
    sms.provider_name === "msg91" ? Boolean(apiKey && sid) :
    sms.provider_name === "bhashsms" ? Boolean(sid && auth && from && process.env.BHASHSMS_ENTITY_ID) : false
  ) : Boolean(process.env.BHASHSMS_USER && process.env.BHASHSMS_PASSWORD &&
    process.env.BHASHSMS_SENDER && process.env.BHASHSMS_ENTITY_ID);
  return { whatsapp,
    sms:{configured: smsReady},
    email:{configured: Boolean((config.smtpHost || process.env.SMTP_HOST) &&
      (config.smtpUser || process.env.SMTP_USER) && (encrypted || process.env.SMTP_PASS) &&
      (config.smtpFromEmail || process.env.SMTP_FROM_EMAIL))},
  };
}

async function sendSms(to: string, body: string, template: any, values: Record<string,string>): Promise<Delivery> {
  const p = await activeSms();
  const live = p?.mode === "live";
  const sid = p ? (live ? p.account_sid : p.sandbox_account_sid) : process.env.BHASHSMS_USER;
  const token = p ? (live ? p.auth_token : p.sandbox_auth_token) : process.env.BHASHSMS_PASSWORD;
  const from = p ? (live ? p.from_number : p.sandbox_from_number) : process.env.BHASHSMS_SENDER;
  const apiKey = p && (live ? p.api_key : p.sandbox_api_key);
  const name = p?.provider_name || "bhashsms";
  const phone = normalizePhone(to);
  if (name === "twilio") {
    if (!sid || !token || !from) throw new ContactError("SMS_CREDENTIALS_MISSING");
    const r = await providerRequest(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{
      method:"POST",headers:{"Authorization":`Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({To:`+${phone}`,From:from,Body:body}),
    });
    const data:any = await r.json();
    if (!data.sid) throw new ContactError("SMS_INVALID_RESPONSE");
    return {messageId:data.sid,status:"accepted"};
  }
  if (!template.sms_template_id) throw new ContactError("SMS_APPROVED_TEMPLATE_ID_REQUIRED");
  if (name === "msg91") {
    if (!apiKey || !sid) throw new ContactError("SMS_CREDENTIALS_MISSING");
    // Flow template variable names are the same named keys shown in admin.
    const params = Object.fromEntries(template.parameter_keys.map((k:string) => [k, values[k] || "Not provided"]));
    const r = await providerRequest("https://control.msg91.com/api/v5/flow/",{
      method:"POST",headers:{"Content-Type":"application/json",authkey:apiKey},
      body:JSON.stringify({template_id:template.sms_template_id,sender:sid,recipients:[{mobiles:phone,...params}]}),
    });
    const data:any = await r.json();
    if (data.type !== "success") throw new ContactError("SMS_PROVIDER_REJECTED");
    return {messageId:data.request_id || null,status:"accepted"};
  }
  if (name === "bhashsms") {
    if (!sid || !token || !from || !process.env.BHASHSMS_ENTITY_ID) throw new ContactError("SMS_DLT_CONFIGURATION_REQUIRED");
    if (!/^91\d{10}$/.test(phone)) throw new ContactError("SMS_INDIAN_NUMBER_REQUIRED");
    const url = new URL("https://bhashsms.com/api/sendmsg.php");
    const params = {user:sid,pass:token,sender:from,phone:phone.slice(2),text:body,
      priority:"ndnd",stype:"normal",entityid:process.env.BHASHSMS_ENTITY_ID,tempid:template.sms_template_id};
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v!));
    const r = await providerRequest(url.toString(),{method:"GET"});
    const result = (await r.text()).trim();
    if (!/^\d+$/.test(result) && !/^S\.\d+$/i.test(result) && !/^success\b/i.test(result)) throw new ContactError("SMS_PROVIDER_REJECTED");
    return {messageId:/^(?:S\.)?\d+$/i.test(result)?result:null,status:"accepted"};
  }
  // WATI is WhatsApp, not a general SMS transport. Do not report fake success.
  throw new ContactError("SMS_PROVIDER_NOT_SUPPORTED_FOR_ENQUIRIES");
}

export async function deliver(job:any, template:any, values:Record<string,string>,
  config:Config, encrypted:string|null):Promise<Delivery> {
  const body = renderMessage(template.message_body,values);
  if (job.channel === "whatsapp") {
    if (!template.meta_template_name) throw new ContactError("META_APPROVED_TEMPLATE_REQUIRED");
    if (!job.consent_confirmed) throw new ContactError("WHATSAPP_CONSENT_REQUIRED");
    const result = await sendConfiguredTemplateMessage({
      to:normalizePhone(job.recipient),templateName:template.meta_template_name,
      languageCode:template.meta_language,
      bodyParameters:template.parameter_keys.map((k:string)=>values[k] || "Not provided"),
      consentConfirmed:true,
    });
    return result;
  }
  if (job.channel === "sms") return sendSms(job.recipient,body,template,values);
  if (job.channel !== "email") throw new ContactError("INVALID_CHANNEL");
  const host = config.smtpHost || process.env.SMTP_HOST;
  const user = config.smtpUser || process.env.SMTP_USER;
  const pass = encrypted ? decryptPassword(encrypted) : process.env.SMTP_PASS;
  const from = config.smtpFromEmail || process.env.SMTP_FROM_EMAIL;
  if (!host || !user || !pass || !from) throw new ContactError("SMTP_CONFIGURATION_REQUIRED");
  const custom = Boolean(config.smtpHost);
  const port = custom ? config.smtpPort : Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({host,port,secure:custom ? config.smtpSecure : port===465,
    auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  try {
    const result = await transport.sendMail({from:{name:config.smtpFromName || process.env.SMTP_FROM_NAME || config.platformName,address:from},
      to:job.recipient,subject:renderMessage(template.subject,values).replace(/[\r\n]+/g," "),text:body});
    if (!result.accepted?.length) throw new ContactError("EMAIL_RECIPIENT_REJECTED");
    return {messageId:result.messageId || null,status:"accepted"};
  } catch(e:any) {
    if (e instanceof ContactError) throw e;
    if (e.responseCode >=400 && e.responseCode<500) throw new ContactError("SMTP_TEMPORARY_REJECTION",502,true);
    if (e.responseCode>=500) throw new ContactError("SMTP_REJECTED",502);
    throw new ContactError("PROVIDER_REQUEST_OUTCOME_UNKNOWN",502);
  } finally { transport.close(); }
}
