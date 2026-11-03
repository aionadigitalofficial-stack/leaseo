# Leaseo: Meta WhatsApp admin settings and backend

## Scope

This adds direct Meta WhatsApp Cloud API messaging and a new **Meta WhatsApp** tab
inside **Admin → SMS/WhatsApp Providers** in the existing Leaseo app.
The WhatsApp button still opens `wa.me`. Search, enquiry, OTP and email behaviour
are unchanged. No automatic notifications or replies are enabled.

**The code is not a connected Meta account.** Your Coolify server needs the Meta
values below before it can send a message. No live credentials are included.

## Start here: deploy the admin settings update

1. Extract the changed-files ZIP into your existing repository root. Replace the
   included files; do not add an extra `leaseo/` parent directory.
2. Back up your database and **rerun `migrations/whatsapp.sql`** against the same
   existing database. The migration is safe to rerun and now also creates the
   encrypted settings table. The previous backend-only migration is not enough.
3. Ensure Coolify has a stable server-side encryption key of at least 32
   characters. Prefer a dedicated `WHATSAPP_CONFIG_ENCRYPTION_KEY`; if absent,
   an existing strong `SESSION_SECRET` (otherwise `JWT_SECRET`) is used.
   Generate a strong key locally, for example with `openssl rand -hex 32`.
   Add it only to Coolify's runtime environment settings, never Git or chat.
   Do not change your existing authentication secrets just for this feature.
4. Redeploy the app in Coolify.
5. Open **Admin → SMS/WhatsApp → Meta WhatsApp**. Enter your Meta Phone Number ID,
   Business Account ID, access token, app secret, chosen webhook verify token,
   Graph API version, test recipient, template name and language.
6. Save first with messaging disabled if you are still preparing Meta. Once all
   required values are present, turn on messaging and save. Saving never sends.
7. Configure Meta's webhook, then confirm the recipient's WhatsApp opt-in and use
   **Send test message**. Template text parameters can be added in order.

Secrets are never returned to the browser. Leave secret inputs blank when editing
to keep the saved values; enter a new value to rotate one. Remember your chosen
verify token in your own secret manager so you can enter it into Meta.

Dashboard settings take precedence over earlier WHATSAPP_* environment variables.
Once a dashboard configuration is saved, **use the dashboard toggle** to disable
messaging. Changing `WHATSAPP_ENABLED` in Coolify will not override saved settings.

The new tab does not select/change the active legacy OTP provider. Twilio, MSG91,
BhashSMS and WATI forms are unchanged. Only the initially displayed UI tab changes.

### Encryption key safety

Back up the stable encryption key securely with your deployment secrets. Keep it
the same across all replicas and future deployments. Changing/losing it makes the
saved configuration unreadable; restore the original key to recover access.
The code never stores the key in PostgreSQL and never falls back to plaintext.
The environment fallback uses SESSION_SECRET before JWT_SECRET, just as described
above; the selected key must be strong. A dedicated key avoids coupling credential
storage to future login-secret rotation.

## Files to deploy to your existing repository

New files:

- `server/whatsapp/core.ts`
- `server/whatsapp/routes.ts`
- `server/whatsapp/store.ts`
- `server/whatsapp/core.test.ts`
- `server/whatsapp/routes.test.ts`
- `server/whatsapp/settings.ts`
- `server/whatsapp/settings-store.ts`
- `server/whatsapp/settings.test.ts`
- `server/whatsapp/admin-contract.md`
- `client/src/components/meta-whatsapp-settings.tsx`
- `migrations/whatsapp.sql`
- `WHATSAPP_SETUP.md`

Modified files:

- `server/routes.ts`: registers WhatsApp routes with existing admin authentication.
- `server/index.ts`: excludes WhatsApp response bodies from request logs.
- `shared/schema.ts`: adds isolated settings and delivery-event tables.
- `client/src/pages/admin.tsx`: adds only the Meta tab/import/default tab selection.
- `.env.example`: lists configuration names; contains no live values.
- `.gitignore`: prevents committing environment files and uploads.
- `package.json`: adds `test:whatsapp` (no new dependencies).

The imported source is in `leaseo/` in this project. In your existing Coolify
repository these paths are relative to its root, **not** an extra `leaseo/` folder.
Existing media, uploads and database data must stay on your current server.
Database exports and nested deployment ZIPs from the upload were not imported.

## 1. Prepare Meta

1. Open your Meta developer app and add/configure the WhatsApp use case.
2. Use the test business number first, with a verified test recipient.
3. Record your **Phone Number ID** and **WhatsApp Business Account ID**. These are
   IDs, not the displayed WhatsApp telephone number.
4. For production, configure your business sender number and an appropriately
   permissioned system-user access token. Sending requires
   `whatsapp_business_messaging`; managing templates/subscriptions may also need
   `whatsapp_business_management`. Assign the WhatsApp account assets to that user.
5. Find the app secret in the app's basic settings.
6. Choose a long random webhook verification token. This is a separate value from
   your access token and app secret. Generate it locally; do not paste it into chat.
7. Complete any verification, billing, app-mode or number-registration steps Meta
   requires for your particular account before production messaging.

Access-token lifetimes vary. Monitor and rotate credentials; do not rely on the
temporary getting-started token for production.

## 2. Add runtime environment values in Coolify

These are optional fallback values before saving credentials in the dashboard.
Only the encryption key must remain server-side. Use your existing application's
server-side environment settings for fallback configuration. Do not put
secrets in source files, frontend settings, `VITE_*` variables or build arguments.

| Variable | Value / purpose |
| --- | --- |
| `WHATSAPP_CONFIG_ENCRYPTION_KEY` | Stable 32+ character encryption key, kept outside the database. Existing strong SESSION_SECRET/JWT_SECRET is used if this is absent. |
| `WHATSAPP_ENABLED` | Start with `false`. Only the literal `true` permits sending. |
| `WHATSAPP_API_VERSION` | A supported Graph API version, for example `v24.0`; update before Meta retires it. |
| `WHATSAPP_ACCESS_TOKEN` | Meta access token. Treat as a secret. |
| `WHATSAPP_PHONE_NUMBER_ID` | Numeric ID for the sending business number. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Numeric WhatsApp Business Account ID. |
| `WHATSAPP_APP_SECRET` | App secret used to verify webhook signatures. |
| `WHATSAPP_VERIFY_TOKEN` | Your random webhook verification token. |
| `WHATSAPP_TEST_RECIPIENT` | Optional test recipient, including country code, e.g. `12025550123`; obtain their opt-in first. |
| `WHATSAPP_TEST_TEMPLATE` | `hello_world` for Meta's test number; for production use an approved template. The dashboard supports positional body text parameters. |
| `WHATSAPP_TEST_LANGUAGE` | Exact approved language, e.g. `en_US`. |

Keep your existing database, authentication, email, SMS and upload settings.
Do not send these values to the browser or share them here.

## 3. Apply the additive database migration

Back up your existing database first. Apply `migrations/whatsapp.sql` to the same
database your deployed Leaseo app already uses, with your normal database tool.
For example, from a shell where `psql` and the existing connection are configured:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/whatsapp.sql
```

This creates two WhatsApp-only tables and two indexes. It does not modify properties, users
or enquiries. Do **not** import `database_export.sql`, replace the database, or run
a broad schema push just to enable this feature.

Merge the files and redeploy using your existing Coolify build configuration.
Nothing in this project has changed or redeployed your running Coolify server.

## 4. Configure the webhook in Meta

- Callback URL: `https://YOUR_EXISTING_LEASEO_DOMAIN/api/whatsapp/webhook`
- Verify token: exactly the value entered in the dashboard's Verify token field
  (or `WHATSAPP_VERIFY_TOKEN` if using environment fallback).
- Subscribe to the `messages` field and ensure the app is subscribed to the
  WhatsApp Business Account. If needed use Meta's documented
  `POST /{WHATSAPP_BUSINESS_ACCOUNT_ID}/subscribed_apps` flow with an appropriately
  permissioned token.
- Use a publicly reachable HTTPS domain with a valid certificate. Do not put the
  webhook behind Coolify preview authentication, a login page or a bot challenge.

Webhook GET verification works while sending is disabled. POST callbacks require
the app secret, business account ID and phone number ID. Invalid signatures get
403. Successful delivery updates are persisted before 200 is returned. Database
failures get 503 so Meta can retry. Exact duplicate status events are ignored.

**Do not remove the `express.json({ verify: ... })` raw-body capture in
`server/index.ts`.** Signature verification requires the exact original bytes.

## 5. Check configuration and make one intentional test

These endpoints use your existing Leaseo **admin Bearer authentication**. There is
also accessible through the new Meta WhatsApp tab. There is no new login system.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/admin/whatsapp/settings` | Safe saved fields plus secret-presence flags; never secret values. |
| `PUT /api/admin/whatsapp/settings` | Validates and encrypts dashboard settings; blank secrets keep prior values. |
| `GET /api/admin/whatsapp/status` | Missing/invalid variable names and enablement; never secret values. |
| `POST /api/admin/whatsapp/test` | Sends one template to the saved test recipient only. |
| `GET /api/admin/whatsapp/delivery-events` | Latest 50 delivery events, newest event timestamp first. |
| `GET /api/whatsapp/webhook` | Meta's verification challenge. |
| `POST /api/whatsapp/webhook` | Signed delivery callbacks; no automatic replies. |

Once configuration is complete, the migration is applied, and the recipient has
opted in:

1. Enable messaging and save in the dashboard (or use `WHATSAPP_ENABLED=true` in
   Coolify only if you have not saved a dashboard configuration).
2. From an authenticated API client send:

   ```http
   POST /api/admin/whatsapp/test
   Authorization: Bearer <your-existing-admin-login-token>
   Content-Type: application/json

   {"consentConfirmed": true}
   ```

3. This makes a **real outbound request** and may incur Meta charges. It is limited
   to one attempt per minute per server process. In a replicated deployment,
   enforce a shared rate limit at your gateway if needed.
4. A `202` with `status: "accepted"` means Meta accepted the request, **not** that
   the recipient received it. Check `sent`, `delivered`, `read` or `failed` webhook
   events. Read receipts depend on recipient settings.
5. To make sending inactive afterwards, disable it and save in the dashboard.
   Delivery webhooks may still arrive for messages already sent.

The test endpoint cannot choose arbitrary recipients, templates or message bodies
from a request. It accepts optional `bodyParameters` as positional text values.
For future application workflows use the reusable backend sender below.

## Future notification integration — deliberately not connected yet

Use `sendConfiguredTemplateMessage` in `server/whatsapp/settings-store.ts` for
future server workflows so they respect dashboard settings. It wraps
`sendTemplateMessage` from `core.ts` and accepts:

- `to`: full international number, with country code;
- `templateName`: exact Meta-approved template name;
- `languageCode`: exact approved language;
- optional `bodyParameters`: positional text values in the template's order;
- `consentConfirmed: true`: only after the caller verifies a stored, current
  WhatsApp opt-in for that recipient and purpose.

The sender currently supports text-only positional body parameters. Headers,
media, named parameters, authentication templates and dynamic buttons are not
implemented. Approve templates matching this supported format.

Opt-in must be real and revocable. A customer's property search or WhatsApp-button
click is **not** a stored opt-in for future automated messages. This backend setup
does not add consent collection or a consent database. Add those controls and
opt-out handling before connecting automatic messages for admins, customers or
property owners. Meta templates are required outside the customer-service window;
this sender deliberately uses approved templates for every outbound message.

No automatic retry is attempted for sending. A timeout may occur after Meta has
accepted the message: blindly retrying can send duplicates. Add a durable outbox,
business-event deduplication and appropriate retry handling when automatic
notification triggers are decided.

## Storage and operations

Only message ID, status, event timestamp, numeric error code and receipt time are
stored in `whatsapp_delivery_events`. Settings, including configured phone numbers,
are stored separately as AES-256-GCM ciphertext in `whatsapp_settings`.
Incoming message bodies, names and phone
numbers are not stored here. Incoming messages are acknowledged but do not reply.
Meta webhook retries are deduplicated by message ID + status + event timestamp.
History remains append-only so late events do not overwrite newer statuses.
Define your retention policy and schedule cleanup in your normal database tools.

Common responses:

- `WHATSAPP_DISABLED`: sending flag is not `true`.
- `WHATSAPP_NOT_CONFIGURED`: check the protected status endpoint.
- `META_AUTHORIZATION_FAILED`: token permissions, expiry or asset assignment.
- `META_SEND_REJECTED`: check approved template, language, sender status and
  recipient eligibility in Meta. Provider payloads are intentionally not exposed.
- `META_REQUEST_OUTCOME_UNKNOWN`: check delivery history before retrying.
- `WHATSAPP_EVENT_STORAGE_UNAVAILABLE`: check migration/database availability.
- `WHATSAPP_SETTINGS_STORAGE_UNAVAILABLE`: rerun the supplied migration; it now
  creates both WhatsApp tables.
- `WHATSAPP_ENCRYPTION_KEY_REQUIRED`: configure a strong stable server encryption key.
- `WHATSAPP_SETTINGS_DECRYPTION_FAILED`: restore the original encryption key.

## Local checks

Using the original app's installed dependencies:

```sh
npm run test:whatsapp
npm run check
```

Tests use synthetic credentials and stubbed Meta responses. They do not send any
live messages. A passing local test does not verify your Meta account or Coolify.

All 29 focused sender, handler and encryption checks passed with synthetic
credentials. The production frontend built and the backend bundled successfully.
The full repository typecheck has eight
pre-existing errors, also reproduced against the unmodified upload: property
typing in the admin/detail pages, missing `pg` declarations, obsolete storage
calls in legacy route copies, and an undeclared `nanoid` import in the Vite helper.
The actual signed-in Coolify admin, production database and Meta account have not
been accessed or browser-tested. Run one intentional opted-in test after deploying
and configuring.

## Official references

- [Webhook verification, signature validation, retries](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/)
- [Template fundamentals](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)
- [Meta developer apps](https://developers.facebook.com/apps)
