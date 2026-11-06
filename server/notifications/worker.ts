import { pool } from "../db";
import { loadConfig } from "./config";
import { deliver } from "./providers";
import { safeProviderCode } from "./core";
import { reconcileWati } from "./wati-store";

let busy=false;
let lastWarning=0;

export async function processNotifications(send:typeof deliver=deliver){
  if(busy)return;
  busy=true;
  try{
    // Lost processes may have sent before crashing. Do not automatically resend.
    await pool.query(`UPDATE notification_jobs SET status='unknown',retryable=false,
      error_code='WORKER_INTERRUPTED_OUTCOME_UNKNOWN',updated_at=now()
      WHERE status='processing' AND updated_at<now()-interval '5 minutes'`);
    // Delivery history remains authoritative and cannot regress on late callbacks.
    await pool.query(`UPDATE notification_jobs j SET status=e.status,updated_at=now(),
        error_code=CASE WHEN e.status='failed' THEN COALESCE('META_DELIVERY_' || e.error_code::text,'META_DELIVERY_FAILED') ELSE NULL END
      FROM (SELECT DISTINCT ON(message_id) message_id,status,error_code
        FROM whatsapp_delivery_events
        ORDER BY message_id,CASE status WHEN 'read' THEN 5 WHEN 'delivered' THEN 4
          WHEN 'failed' THEN 3 WHEN 'sent' THEN 2 ELSE 1 END DESC,event_timestamp DESC) e
      WHERE j.channel='whatsapp' AND j.provider_message_id=e.message_id
        AND j.status IN ('accepted','sent','delivered','failed')
        AND CASE e.status WHEN 'read' THEN 5 WHEN 'delivered' THEN 4 WHEN 'failed' THEN 3 WHEN 'sent' THEN 2 ELSE 1 END
          > CASE j.status WHEN 'read' THEN 5 WHEN 'delivered' THEN 4 WHEN 'failed' THEN 3 WHEN 'sent' THEN 2 ELSE 0 END`);
    // An absent additive WATI migration must not stop existing Meta/SMS/email jobs.
    const reconcile = async () => {
      try { await reconcileWati(); } catch (e: any) {
        if (e?.code !== "42P01") throw e;
      }
    };
    await reconcile();
    for(let i=0;i<5;i++){
      const {rows:[job]}=await pool.query(`UPDATE notification_jobs SET status='processing',attempts=attempts+1,updated_at=now()
        WHERE id=(SELECT id FROM notification_jobs WHERE status='pending' AND next_attempt_at<=now()
          ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`);
      if(!job)break;
      let providerAccepted=false;
      try{
        const {settings,encrypted}=await loadConfig();
        const {rows:[template]}=await pool.query("SELECT * FROM notification_templates WHERE id=$1",[job.template_id]);
        const {rows:[contact]}=await pool.query("SELECT context,consent_confirmed FROM property_contact_access WHERE enquiry_id=$1",[job.enquiry_id]);
        const consent=job.recipient_type==="customer"?contact?.consent_confirmed:
          job.recipient_type==="owner"?settings.ownerWhatsappConsent:settings.adminWhatsappConsent;
        if(!contact || !template?.is_enabled || !settings[`${job.channel}Enabled` as keyof typeof settings] ||
          (job.channel==="whatsapp" && !consent)){
          await pool.query("UPDATE notification_jobs SET status='skipped',error_code='DISABLED_OR_CONSENT_REVOKED',updated_at=now() WHERE id=$1",[job.id]);
          continue;
        }
        const sent=await send(job,template,contact.context,settings,encrypted);
        providerAccepted=true;
        await pool.query(`UPDATE notification_jobs SET status=$2,provider_message_id=$3,sent_at=now(),
          error_code=NULL,retryable=false,updated_at=now() WHERE id=$1`,[job.id,sent.status,sent.messageId]);
      }catch(e:any){
        const code=providerAccepted?"ACCEPTED_BUT_PERSISTENCE_FAILED_OUTCOME_UNKNOWN":safeProviderCode(e);
        const unknown=code.includes("UNKNOWN");
        const retryable=!unknown && (e.retryable===true || code==="META_RATE_LIMITED");
        const retry=retryable && job.attempts<3;
        await pool.query(`UPDATE notification_jobs SET status=$2,error_code=$3,retryable=$4,
          next_attempt_at=now()+($5 * interval '1 second'),updated_at=now() WHERE id=$1`,
          [job.id,unknown?"unknown":retry?"pending":"failed",code,retryable,Math.pow(2,job.attempts)*30]);
      }
    }
    await reconcile();
  }catch{
    if(Date.now()-lastWarning>300000){
      console.error("[notifications] Queue unavailable. Check database and property-contact migration.");
      lastWarning=Date.now();
    }
  }finally{busy=false;}
}

export function startNotificationWorker(){
  const timer=setInterval(()=>void processNotifications(),5000);
  timer.unref();
  return ()=>clearInterval(timer);
}
