# Meta WhatsApp admin API

All `/api/admin/whatsapp/*` endpoints use the existing admin Bearer authentication.
Use `apiRequest` from `@/lib/queryClient` and parse the returned Response with `.json()`.

## GET /api/admin/whatsapp/settings

Returns:

```
{
  settings: {
    enabled: boolean, apiVersion: string, phoneNumberId: string,
    businessAccountId: string, testRecipient: string, testTemplate: string,
    testLanguage: string,
    hasAccessToken: boolean, hasAppSecret: boolean, hasVerifyToken: boolean
  },
  status: {
    enabled: boolean, configured: boolean, missing: string[], invalid: string[],
    encryptionReady: boolean, source: "database" | "environment",
    testRecipientConfigured: boolean, webhookPath: "/api/whatsapp/webhook",
    automaticNotifications: false
  },
  updatedAt: string | null
}
```

Never returns secret values. `encryptionReady:false` means the server needs a
stable `WHATSAPP_CONFIG_ENCRYPTION_KEY` (32+ characters) or an existing strong
SESSION_SECRET/JWT_SECRET in Coolify before settings can be saved.

## PUT /api/admin/whatsapp/settings

Body: the seven non-secret settings fields above, plus optional string fields
`accessToken`, `appSecret`, `verifyToken`. Blank or omitted secret fields KEEP the
previous secret. Never submit masked strings or values from browser storage.
Password fields must start empty and be cleared after a successful save.

Returns the same safe response as GET. Settings persist encrypted in PostgreSQL.
Enabling requires complete, valid credentials. Disabled drafts may be incomplete.
Settings saved in the dashboard override earlier WHATSAPP_* Coolify values.
Save does not send a message.

## POST /api/admin/whatsapp/test

Body: `{consentConfirmed:true, bodyParameters?:string[]}`.
Recipient, template name and language come from SAVED settings only.
Optional body parameters are positional text values in template order, max 30,
each non-empty, max 1024 chars. This is a real outbound message and can be charged.
Do not send automatically. Explicit consent checkbox required. Explain that
`hello_world` is for Meta's test sender and a production sender needs its own
approved template. Disabled until saved settings are enabled/configured and have
a test recipient. Pending unsaved edits must not be presented as saved settings.

Returns 202 `{messageId:string,status:"accepted"}`. Accepted is NOT delivered.
One attempt/minute/process; error JSON contains an `error` code, optionally retryable.

## GET /api/admin/whatsapp/delivery-events

Returns `{events:[{messageId:string,status:string,eventTimestamp:string,
errorCode:number|null,receivedAt:string}]}`. Latest 50. Refresh after test and
periodically while this component is mounted; reflect empty/loading/error states.

## Error responses

Safe JSON: `{error:string,missing?:string[],invalid?:string[]}`.
`WHATSAPP_SETTINGS_STORAGE_UNAVAILABLE` means apply/rerun migrations/whatsapp.sql.
`WHATSAPP_ENCRYPTION_KEY_REQUIRED` means configure a strong stable encryption key.
`WHATSAPP_SETTINGS_DECRYPTION_FAILED` means the key changed; restore the old key.
Never expose tokens, app secret, verify token, raw provider errors or message text.

## Frontend placement and scope

Add a Meta WhatsApp tab inside the EXISTING Admin > SMS/WhatsApp Providers section
in client/src/pages/admin.tsx. Add a focused standalone component; only import,
new TabsTrigger, and new TabsContent should change in admin.tsx. Existing provider
forms, OTP sending, enquiries, property search, payments and the wa.me button must
remain unchanged. Match the current app's components and UI conventions; no new
routes or broad redesign. Make new tab the initial provider selection so users
can find it after deployment. Do not mark Meta active in the old OTP provider list.
