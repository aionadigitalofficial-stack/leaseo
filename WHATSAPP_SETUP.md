# Leaseo: Meta WhatsApp backend setup

## Scope

This adds the direct Meta WhatsApp Cloud API backend to the existing Leaseo app.
The WhatsApp button still opens `wa.me`. Search, enquiry, OTP and email behaviour
are unchanged. No automatic notifications or replies are enabled.

**The code is not a connected Meta account.** Your Coolify server needs the Meta
values below before it can send a message. No live credentials are included.

## Files to deploy to your existing repository

New files:

- `server/whatsapp/core.ts`
- `server/whatsapp/routes.ts`
- `server/whatsapp/store.ts`
- `server/whatsapp/core.test.ts`
- `server/whatsapp/routes.test.ts`
- `migrations/whatsapp.sql`
- `WHATSAPP_SETUP.md`

Modified files:

- `server/routes.ts`: registers WhatsApp routes with existing admin authentication.
- `server/index.ts`: excludes WhatsApp response bodies from request logs.
- `shared/schema.ts`: adds the delivery-event table.
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

Use your existing application's server-side environment settings. Do not put
secrets in source files, frontend settings, `VITE_*` variables or build arguments.

| Variable | Value / purpose |
| --- | --- |
| `WHATSAPP_ENABLED` | Start with `false`. Only the literal `true` permits sending. |
| `WHATSAPP_API_VERSION` | A supported Graph API version, for example `v24.0`; update before Meta retires it. |
| `WHATSAPP_ACCESS_TOKEN` | Meta access token. Treat as a secret. |
| `WHATSAPP_PHONE_NUMBER_ID` | Numeric ID for the sending business number. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Numeric WhatsApp Business Account ID. |
| `WHATSAPP_APP_SECRET` | App secret used to verify webhook signatures. |
| `WHATSAPP_VERIFY_TOKEN` | Your random webhook verification token. |
| `WHATSAPP_TEST_RECIPIENT` | Optional test recipient, including country code, e.g. `12025550123`; obtain their opt-in first. |
| `WHATSAPP_TEST_TEMPLATE` | `hello_world` for Meta's test number; for a production number use an approved template with no variables for this test endpoint. |
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

This creates one new table and two indexes. It does not modify properties, users
or enquiries. Do **not** import `database_export.sql`, replace the database, or run
a broad schema push just to enable this feature.

Merge the files and redeploy using your existing Coolify build configuration.
Nothing in this project has changed or redeployed your running Coolify server.

## 4. Configure the webhook in Meta

- Callback URL: `https://YOUR_EXISTING_LEASEO_DOMAIN/api/whatsapp/webhook`
- Verify token: exactly the server's `WHATSAPP_VERIFY_TOKEN`.
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
no new admin screen and no new login system.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/admin/whatsapp/status` | Missing/invalid variable names and enablement; never secret values. |
| `POST /api/admin/whatsapp/test` | Sends one template to the server-configured test recipient only. |
| `GET /api/admin/whatsapp/delivery-events` | Latest 50 delivery events, newest event timestamp first. |
| `GET /api/whatsapp/webhook` | Meta's verification challenge. |
| `POST /api/whatsapp/webhook` | Signed delivery callbacks; no automatic replies. |

Once configuration is complete, the migration is applied, and the recipient has
opted in:

1. Set `WHATSAPP_ENABLED=true` in Coolify and redeploy/restart.
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
5. If you want everything inactive afterwards, set `WHATSAPP_ENABLED=false`.
   Delivery webhooks may still arrive for messages already sent.

The test endpoint cannot choose arbitrary recipients, templates, message bodies
or template variables from a request. Its template must have no dynamic variables.
For future application workflows use the reusable backend sender below.

## Future notification integration — deliberately not connected yet

`sendTemplateMessage` in `server/whatsapp/core.ts` accepts:

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
stored in `whatsapp_delivery_events`. Incoming message bodies, names and phone
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

## Local checks

Using the original app's installed dependencies:

```sh
npm run test:whatsapp
npm run check
```

Tests use synthetic credentials and stubbed Meta responses. They do not send any
live messages. A passing local test does not verify your Meta account or Coolify.

Verification of this implementation: all 18 focused sender/handler checks passed,
and the backend bundled successfully. The full repository typecheck reports eight
pre-existing errors, also reproduced against the unmodified upload: property
typing in the admin/detail pages, missing `pg` declarations, obsolete storage
calls in legacy route copies, and an undeclared `nanoid` import in the Vite helper.
No WhatsApp-specific type errors were reported. The existing database and full
signed-in UI were not run or verified here.

## Official references

- [Webhook verification, signature validation, retries](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/)
- [Template fundamentals](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)
- [Meta developer apps](https://developers.facebook.com/apps)
