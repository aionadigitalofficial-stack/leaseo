# WATI enquiry notifications — Dokploy

This update connects the existing property-enquiry queue to WATI V3. It does not
change BhashSMS, login OTP, SMTP, consent, property access, or duplicate-enquiry rules.
Meta remains the default until you explicitly select WATI. Saving keys sends nothing.

## 1. Upload and deploy

Upload the files in the changed-files ZIP to their matching paths in your Git repo.
Back up the existing production database before running the additive migration.
Deploy using your normal Dokploy process, then open the application container terminal
using `/bin/sh`:

```sh
cd /app
node script/migrate-property-contact.cjs
node script/migrate-property-contact.cjs --check
```

The helper reruns the existing migrations safely and adds:
`wati_notification_settings`, `wati_notification_attempts`, `wati_notification_events`.
It does not replace existing templates, credentials or enquiry records. Do not use
`db:push` or import a database dump.

Keep your existing stable `WHATSAPP_CONFIG_ENCRYPTION_KEY` (or strong existing
SESSION_SECRET/JWT_SECRET fallback) unchanged. No new server secret is required:
the WATI API token and a random webhook secret are encrypted using the existing key.
Changing that key can make saved credentials unreadable.

## 2. Save the WATI connection privately

Leaseo Admin → SMS/WhatsApp → WATI, or Notification Templates → Channel settings.

- **API host:** copy the HTTPS API host from WATI’s API request example. For example
  `https://live-mt-server.wati.io`. No tenant ID, `/api` suffix, query string, or login URL.
  Only WATI-controlled `.wati.io` HTTPS hosts are accepted. If WATI provides a different
  domain, do not substitute a guessed host: have the allowlist reviewed first.
- **Sender number:** the new WATI-connected business number in full international
  digits, without `+`. This is NOT a Meta Phone Number ID or WATI tenant ID.
  Blank uses WATI’s default sender; set explicitly if the workspace has multiple numbers.
- **API key:** paste the raw key, without `Bearer`. The server adds that prefix.
  Blank preserves the existing encrypted key. Never upload a real key to Git or chat.
- Use a token authorized for V3 template sending (`messagetemplatev3:write` or
  another documented equivalent). Check its expiry and your WATI API/usage eligibility.

Save. “Credentials saved” means stored, not live API verification.
The older WATI tab's misleading Phone Number ID and SMS activation controls are replaced.
No existing SMS provider record is changed. Keep your working BhashSMS SMS provider active.

## 3. Configure the three canonical WhatsApp templates

Wait for actual **Approved** status in WATI; Submitted/Pending is not approval.
Create/manage templates in WATI, not Leaseo's direct-Meta draft submission workflow.

In Leaseo → Notification Templates, select each recipient's **WhatsApp** template.
Copy the exact approved wording into the local body for an accurate preview, using
Leaseo `{{variable_name}}` notation (without WATI editor prefixes). The sent wording
comes from the approved WATI template, not the local body.

| Recipient | WATI template name | Parameter keys |
| --- | --- | --- |
| Customer | leaseo_customer_enquiry | customer_name, property_title |
| Property owner | leaseo_owner_enquiry | owner_name, property_title, customer_name, customer_phone |
| Admin | leaseo_admin_enquiry | property_title, customer_name, customer_phone |

Use your actual names if different. Each WATI parameter name must exactly match
the corresponding Leaseo key. The same keys in both systems are required by this
integration; arbitrary aliases and media/header/button parameters are not supported.
Use the text-only templates prepared for this setup. Meta uses ordered parameters;
WATI uses named parameters and duplicate keys are sent only once.
For WATI, language is selected by the WATI template; the Meta-only language field
does not override it. Make sure you select the intended language version in WATI.

Template Library → “Submit to Meta” and approval/apply actions remain for direct
Meta only. They do not submit WATI templates or transfer approvals between accounts.

## 4. Configure the delivery webhook

On the saved WATI settings card, click **Show webhook URL**. Copy the full private
URL, including its `?key=...` query, using your real public HTTPS website origin.
If copied from a local/staging preview, replace the origin with your production site.
Never publish this URL in screenshots, Git or public documents.

In WATI → Webhooks:
- Paste the full URL.
- Enable the subscription.
- Select **templateMessageSent_v2**, **sentMessageDELIVERED_v2**,
  **sentMessageREAD_v2**, **templateMessageFailed**.
- Save and test using an actual permitted message.

This integration uses a generated 256-bit callback-URL secret because the documented
WATI event contract does not promise a universal HMAC header. Use HTTPS, protect the
WATI administrator account, and configure Dokploy/reverse-proxy access logs to omit or
redact query strings. Never expose or reuse the API token as a webhook key.
Leaseo logs only the fixed request path, not this query string.

Host/sender changes rotate the callback secret; update the WATI subscription afterwards.
Incoming chat events are ignored; they do not create enquiries or send notifications.
The sent-template event supplies message-ID correlation for later events that omit
`localMessageId`, so subscribe to it as well as delivered/read/failure events.
The receiver stores only correlation/status data, not message bodies or contact details.
Events are persisted before acknowledging. Repeats deduplicate; late sent/failed events
cannot downgrade delivered/read. Events arriving before the send response are retained.
Unknown outcomes can resolve when WATI provides a correlatable callback.

## 5. Switch only when ready

In Notification Templates → Channel settings:
1. Select **WATI** as WhatsApp enquiry provider.
2. Keep SMS/Email settings unchanged.
3. Enable WhatsApp, confirm the admin phone, and attest owner/admin consent only
   where consent was actually obtained.
4. Save channel settings.
5. Enable/save each intended customer, owner and admin WhatsApp template.

Switching providers affects pending jobs when they are processed. Avoid switching
while messages are pending or processing; pause the WhatsApp channel first if needed.
Never select WATI as an SMS/OTP gateway. There is no automatic Meta fallback, which
could duplicate messages or send from the wrong business number.

## 6. Test once, then inspect results

Use a WhatsApp template's existing **Test notification** action, an existing enquiry,
your own full international phone number, and explicit consent. This sends a real
message and may cost money.

Check Delivery log. Accepted is not delivered. The worker runs every five seconds;
delivered/read require real WATI callbacks. A `wati:...` reference is Leaseo's
attempt correlation ID, not a WhatsApp WAMID.

Then test one NEW customer/property combination on the live website. Repeating
the same customer+property does not send again, intentionally. Verify each recipient
and SMS/email separately. WATI credentials, live approvals and handset delivery cannot
be verified from the source ZIP.

### Errors
- WATI_MIGRATION_REQUIRED: run the migration in the deployed app container.
- WATI_API_HOST_INVALID: use the documented WATI API HTTPS host only.
- WATI_AUTHORIZATION_FAILED: check expiry, workspace and regional host.
- WATI_PERMISSION_OR_PLAN_REQUIRED: check token permissions, channel and API eligibility.
- WATI_REQUEST_REJECTED / WATI_SEND_REJECTED / WATI_RECIPIENT_REJECTED: inspect the
  corresponding WATI log and confirm approval, exact name, variables and recipient eligibility.
- WATI_TEMPLATE_VALUE_MISSING_OR_TOO_LONG: fix the mapping/website value before sending.
- WATI_RATE_OR_USAGE_LIMIT: check WATI limits; this does not automatically resend.
- WATI_SEND_OUTCOME_UNKNOWN: do not blindly resend. Check WATI logs and callbacks first.
- WATI_DELIVERY_<number>: WATI/Meta reported final delivery failure; inspect provider logs.

Timeouts, network loss, malformed/incomplete responses and server errors are treated
as unknown, not safe-to-retry failures. Neither local_message_id nor broadcast_name
is assumed to be an idempotency key.

## Synthetic verification

```sh
npx tsx --test server/notifications/wati-core.test.ts
```

Database integration tests additionally require `LEASEO_TEST_DATABASE_URL` pointing to
a dedicated disposable database whose name ends `_test`. They never use production
credentials or send real WhatsApp messages.

The delivery was checked with 81 passing synthetic tests (including the existing
Meta, enquiry and draft suites), the production client/server build, and a signed-in
admin settings browser check against disposable data. The provider tab row now wraps
on narrow screens. No real WATI token or production database was used.
The full TypeScript check still reports seven pre-existing issues unrelated to WATI;
those were intentionally not changed as part of this update.
