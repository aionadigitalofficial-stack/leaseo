# Changed/new files package

The ZIP contains **35 files**, at repository-root paths. It is a cumulative
update against the originally uploaded Leaseo repository, including the earlier
Meta settings implementation for compatibility. It is not a full repository.
It contains no real credentials, `.env` file, database exports, media,
`node_modules`, generated bundles, or Replit workflow configuration.

## Modified original files

- `.gitignore` — excludes credential files.
- `package.json` — notification and existing WhatsApp test commands; no new dependencies.
- `client/src/pages/admin.tsx` — notification section and existing Meta settings tab.
- `client/src/pages/property-detail.tsx` — authenticated property contact/OTP/chat flow.
- `server/index.ts` — omits sensitive contact/notification responses from logs.
- `server/routes.ts` — route registration, legacy reveal guard, contact-field
  redaction, enquiry authorization, phone-change invalidation, safe provider-save response.
- `shared/schema.ts` — additive WhatsApp/contact/notification models.

## Notification feature files

- `client/src/components/notification-management.tsx`
- `server/notifications/config.ts`
- `server/notifications/contact-store.ts`
- `server/notifications/core.ts`
- `server/notifications/providers.ts`
- `server/notifications/routes.ts`
- `server/notifications/worker.ts`
- `server/notifications/core.test.ts`
- `server/notifications/integration.test.ts`
- `migrations/property-contact.sql`
- `script/migrate-property-contact.cjs`
- `script/notification-test-fixture.ts` — isolated development/browser fixtures only.

## Base WhatsApp integration files included

- `.env.example`
- `client/src/components/meta-whatsapp-settings.tsx`
- `server/whatsapp/core.ts`
- `server/whatsapp/routes.ts`
- `server/whatsapp/store.ts`
- `server/whatsapp/settings.ts`
- `server/whatsapp/settings-store.ts`
- `server/whatsapp/core.test.ts`
- `server/whatsapp/routes.test.ts`
- `server/whatsapp/settings.test.ts`
- `server/whatsapp/admin-contract.md`
- `migrations/whatsapp.sql`

## Instructions and results

- `PROPERTY_CONTACT_FILES.md`
- `PROPERTY_CONTACT_SETUP.md`
- `PROPERTY_CONTACT_TEST_REPORT.md`
- `WHATSAPP_SETUP.md` — base credentials/webhook guide; the property-contact guide
  supersedes the older future-trigger scope.

## Database additions

The new contact migration adds six tables:
`property_contact_otps`, `property_contact_access`, `notification_templates`,
`notification_jobs`, `notification_configuration`, `notification_rate_limits`.
It reuses existing `users.phone_verified_at` and `enquiries` rather than creating
a second user/enquiry module. The base migration adds `whatsapp_settings` and
`whatsapp_delivery_events`. All migrations are additive and safe to rerun.

Back up first. In Dokploy's `/bin/sh` application terminal:

```sh
cd /app
node script/migrate-property-contact.cjs
```

Read `PROPERTY_CONTACT_SETUP.md` before enabling any notification channels.
