# Leaseo property WhatsApp contact and enquiry notifications

This extends the existing Leaseo application on Dokploy. It does not replace
PostgreSQL, login, payment, listing, media, or OTP providers. No production
database changes or real notification sends were performed from this workspace.

## Root cause

The original property page treated local `otpVerified` and `revealedPhone`
component state as both verification and property access. It did not reset that
state when the property changed, did not send the logged-in Bearer token in the
old OTP request, and later WhatsApp clicks opened a URL without creating another
property enquiry. OTP completion also did not automatically resume WhatsApp.
The old URL unconditionally prepended 91, potentially duplicating a country code.

Account-level verification now uses the existing `users.phone_verified_at`.
Each customer/property pair has its own contact-access row, existing enquiries
row, immutable event context, and nine channel outcomes. A revisit returns the
existing enquiry without duplicate jobs. A different customer or property gets
an independent enquiry. Contact OTPs are bound to the authenticated account and
its registered phone; email cannot bypass mobile verification.

## Deploy changed files only

1. Back up the existing database and keep existing uploaded media.
2. Extract the supplied changed-files ZIP into the existing repository root.
   Do not add an extra parent directory.
3. Keep the original stable `WHATSAPP_CONFIG_ENCRYPTION_KEY`. It also protects
   the new optional SMTP password with a separate encryption domain.
4. Build/redeploy with the existing Dokploy configuration.
5. In Dokploy's application terminal choose `/bin/sh`, then run:

   ```sh
   cd /app
   node script/migrate-property-contact.cjs
   ```

   This runs both additive migrations with the application's existing `pg`
   dependency. It does not need `psql`. It is safe to rerun; it never resets
   edited templates or credentials. If the image omits migration sources,
   include `migrations/` and `script/migrate-property-contact.cjs` in the image.
   A read-only readiness check is:

   ```sh
   cd /app
   node script/migrate-property-contact.cjs --check
   ```

6. Open **Admin → Notification Templates → Settings**. Enter the public HTTPS
   site URL, platform name, and admin notification recipients.
7. Review all templates and provider configuration before enabling channels.
   All nine automated templates and all three channels initially default OFF.
   The separately editable customer-to-owner WhatsApp chat template is ON.

**Do not use `drizzle-kit push --force` on production.** Use the additive SQL
migration above. It adds tables/indexes and reuses existing users/enquiries.

## Customer flow

An unauthenticated customer uses the existing login redirect back to the
property. The contact dialog asks consent to share the customer's account
details with that property's owner and receive related notifications.
Unverified accounts receive a six-digit SMS on their registered phone. Codes
are cryptographically generated, bcrypt-hashed, valid for 10 minutes, one-use,
and allow five attempts. Resend delay is 60 seconds with five requests/hour.
Additional account rate limits use database-backed minute windows.

Verification persists across properties and sessions. It has no arbitrary
periodic expiry: changing the number must clear the old verification. The
profile fallback that changes an unverified number now explicitly clears it.
For a missing phone, the page directs the customer to the existing profile flow.

After verification, the server creates/reuses the property enquiry, atomically
records jobs, returns the authorized phone and a server-rendered `wa.me` URL,
then the page opens WhatsApp. The customer reviews and sends the message.
Leaseo cannot press WhatsApp's Send button or confirm the user actually sent
that manually composed chat. Enquiry registration is the notification event.

Property/account navigation resets contact state and invalidates late responses.
There is a visible link fallback if the browser blocks the WhatsApp window.
Public listing responses omit internal owner contact fields. The old
anonymous OTP property-reveal path is blocked. Existing enquiry list/status
endpoints are now admin-only to prevent leaking new customer contact records;
tenant/owner dashboards keep their existing authenticated scoped endpoints.

## Admin templates and settings

The section contains customer, owner, and admin categories with WhatsApp, SMS,
and email templates, plus the separate customer-to-owner chat template.
Names, email subjects, bodies, enablement, approved provider template mappings,
ordered parameter keys, placeholder insertion, database-context previews, and
real test queueing are editable without redeployment.

All message content is loaded from database rows. The migration only seeds
defaults on first run. Missing dynamic fields render as `Not provided`, never
unexpanded placeholders. Unknown/malformed placeholders are rejected.
Chat and plain-text email wording take effect immediately; queued notifications
load the latest saved template just before dispatch.

### WhatsApp

Reuse **Admin → SMS/WhatsApp → Meta WhatsApp** credentials. Configure an approved
Meta template name and language in each automated WhatsApp template, with
`parameter_keys` matching its positional **body** parameter order.
This implementation supports text body parameters, not media headers, dynamic
buttons, or named Meta parameter components.

**Meta sends approved template wording, not arbitrary text in Leaseo's editor.**
The editor body is the local preview/DLT-style source; when changing static
WhatsApp wording, also update and get approval for the provider template in
Meta. Parameter values always come from the correct enquiry's stored event
context. Never map customer/owner/admin templates to unrelated `hello_world`.
Use the test sender only for its allowed test recipients/templates; production
needs your business number, correct account IDs, production token, and any
verification/billing requirements Meta imposes.

Customer consent is recorded with the enquiry. Owner/admin WhatsApp sends also
require the corresponding explicit operator confirmation in Settings; enable
it only after obtaining and recording actual recipient opt-in outside this
screen. These are business-operated confirmations, not an automated consent
collection system. Turning them off prevents queued sends. Do not use these
notifications for unsolicited marketing.

Configure `https://YOUR_DOMAIN/api/whatsapp/webhook` and subscribe `messages`.
The signed existing webhook records status history. The queue links WhatsApp
message IDs to that history and updates sent/delivered/read/failed status.

### SMS

Reuse the active provider/mode/credentials under **SMS/WhatsApp**. OTP delivery
still uses the existing OTP dispatcher and its approved OTP wording. Enquiry
SMS uses a separate adapter, never the OTP template:

- Twilio: active sender/account/token; submits the rendered text.
- MSG91 Flow: configured API key/sender plus each template's Flow ID and named
  variable keys; the Flow's approved wording is authoritative.
- BhashSMS: configured sender/user/password, environment `BHASHSMS_ENTITY_ID`,
  each template's approved DLT ID, and text matching the approved DLT wording.
  Uses HTTPS and fails explicitly if that endpoint/configuration is unavailable.
- WATI is a WhatsApp provider, not an SMS transport; enquiry SMS reports an
  explicit unsupported-provider failure rather than pretending to send.

Indian DLT registration, approved templates and route eligibility remain
provider-side requirements. Existing OTP templates must NOT be reused for
enquiry messages.

### Email

Uses the existing nodemailer dependency and SMTP environment configuration as
fallback: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`,
`SMTP_FROM_NAME`. Alternatively configure notification-specific SMTP in this
admin section; the password is encrypted at rest and never returned to clients.
Blank password preserves it. This does not change the original login/OTP or
other pre-existing email flows. New enquiry mail uses plain text to prevent
placeholder data injecting HTML; TLS certificate validation is not disabled.
Configure sender/domain verification, SMTP authentication and appropriate TLS.

## Jobs, failures, delivery status

Jobs are committed in the same transaction as enquiry creation. A worker in the
existing Node server checks every five seconds and claims rows with
`FOR UPDATE SKIP LOCKED`, allowing safe multi-replica processing. It does not
need Redis, a separate application, or another production service.

Each recipient/channel has its own result. Disabled templates/channels, missing
recipients or absent WhatsApp opt-in are visibly skipped. One provider failure
cannot stop another channel. Logs never store raw provider payloads or secrets.
`accepted` means provider acceptance, not proof of delivery. SMS/email do not
currently have delivery-receipt callbacks: do not claim those were delivered.

Known temporary rejections (HTTP 429 / SMTP temporary rejection) get exponential
backoff, up to three attempts. Timeouts or interrupted in-flight workers are
`unknown`, not blindly retried: the provider might already have accepted them.
Manual retry is allowed only for a recorded retryable failed job, up to a total
of six attempts including the automatic attempts. Provider failures requiring new credentials/templates must be
corrected before an intentional new test. Disabled/skipped jobs are not
retroactively sent when a channel is enabled.

## APIs

All property contact endpoints require the existing Bearer authentication.
Identity, property-owner relationships, phone, context and timestamps are
server-derived. All notification management endpoints additionally require admin.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/property-contact/status` | Account phone verification state |
| POST | `/api/property-contact/otp/request` | Send registered-phone OTP |
| POST | `/api/property-contact/otp/verify` | Consume `{code}` |
| GET | `/api/properties/:id/contact` | Existing authorized contact access |
| POST | `/api/properties/:id/contact` | Create/reuse enquiry, `{consentConfirmed:true}` |
| GET | `/api/admin/notifications` | Templates, safe settings/status and recent logs |
| PUT | `/api/admin/notifications/settings` | Channel/site/admin/SMTP configuration |
| POST | `/api/admin/notifications/templates` | Create a missing canonical recipient/channel template |
| PATCH | `/api/admin/notifications/templates/:id` | Edit/enable/disable template |
| POST | `/api/admin/notifications/templates/:id/preview` | Preview `{enquiryId}` or explicit sample `{values}` |
| POST | `/api/admin/notifications/templates/:id/test` | Queue a real consented test with enquiry ID/recipient |
| GET | `/api/admin/notifications/enquiries` | Recent contacts for test/preview selection |
| GET | `/api/admin/notifications/logs` | Latest 100 outcomes |
| POST | `/api/admin/notifications/retry/:id` | Retry only safe transient failures |

## Verification and limitations

`npm run test:notifications` runs pure tests. PostgreSQL integration tests skip
unless `LEASEO_TEST_DATABASE_URL` points to a disposable test database with the
base Leaseo schema. Never set that to production. `npm run test:whatsapp` checks
the existing Meta core/routes/settings. Tests use synthetic fixtures/provider
stubs, never real messages. Live OTP/SMS/SMTP/Meta sends must be checked after
the operator configures real approved templates, recipients and credentials.

Test coverage includes account OTP persistence/replay/resend limits, separate
properties/customers, concurrent duplicate clicks, correct personalised chat,
nine outcomes, role authorization, database-backed edits, disabled templates,
channel failure isolation, bounded retry and webhook status ordering.
An isolated signed-in browser pass checks property/admin interactions separately.
See the delivery summary for the actual results and any unverified scenarios.
