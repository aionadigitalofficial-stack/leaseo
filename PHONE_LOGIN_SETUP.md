# Single-screen phone login

## What changed

- The property WhatsApp contact flow keeps the existing sharing/notification consent notice.
- After **Agree & continue**, guests see a login popup on the property page.
- The popup starts with **mobile number only**, followed by the OTP field on that form.
- Returning accounts sign in immediately after OTP verification, without typing their
  name, user type, email or city again.
- Only a genuinely new number is shown the profile fields after verification:
  required name and user type, optional email and optional city. These remain in the
  same popup. Select **Save details & continue**; a second OTP is not required.
- User types: Property Owner, Tenant, Builder / Developer, Buyer.
- **Send verification code** uses the existing SMS OTP provider. The OTP field appears
  on that same form; phone changes reset the code.
- Successful login (or profile save for a new account) reloads the
  same property and resumes the consented enquiry once. No WhatsApp redirect and
  no separate profile-completion page are required for this enquiry.
- Closing the popup cancels the pending enquiry intent. Merely opening it does not
  create an enquiry or send customer/owner/admin notifications.
- `/login` uses the same phone form. Existing email/password login remains available.
- Returning accounts keep their existing identity, email, role and profile values.
- Account existence is not disclosed before OTP verification. New-account verification
  uses a short-lived, single-use signup proof, kept only in memory. It cannot be used
  as a normal login session or reused to create another account.
- Optional email is stored as **unverified**, never used to merge accounts or grant access.
  City is stored in the existing account metadata.
- Posting listings still uses the existing verified-profile checks. This update
  does not mark an unverified email as verified or relax listing requirements.
- WATI, BhashSMS, email, notification templates and duplicate-enquiry rules are unchanged.

## Changed/new files only

1. `client/src/components/phone-login-form.tsx`
2. `client/src/pages/login.tsx`
3. `client/src/pages/property-detail.tsx`
4. `client/src/pages/profile-complete.tsx`
5. `server/phone-login.ts`
6. `server/phone-login.test.ts`
7. `server/routes.ts`
8. `shared/phone-login.ts`
9. `shared/schema.ts`
10. `migrations/phone-login.sql`
11. `script/migrate-phone-login.cjs`
12. `PHONE_LOGIN_SETUP.md`
13. `server/index.ts`
14. `server/phone-signup-token.ts`

Upload these files to their matching paths in the existing repository. Do not replace
the database, media, environment, provider settings or the entire project.
The verification harness and generated build files are not included.

## Dokploy database step

If the earlier single-screen login update and Buyer migration are already installed,
this returning-user improvement needs **no additional database migration**. Upload the
updated files and rebuild/redeploy. The full package also includes the previous popup
changes so it can be applied even if that earlier package was not installed.

Back up the existing database first. After these files are available in the
application image, open its application-container terminal (`/bin/sh`):

```sh
cd /app
node script/migrate-phone-login.cjs
node script/migrate-phone-login.cjs --check
```

This adds `buyer` to the existing PostgreSQL `user_type` enum. It does not delete or
rewrite users and can be run again safely. No new environment variables or credentials
are required. If your deployment uses a release/migration command, run this script there
before directing traffic to the new image. Otherwise run it in the newly built
application container immediately after deployment, before testing Buyer signup.

Rebuild/redeploy the existing Dokploy application using its normal process. Do not run
`db:push` against production. Do not import a development database.

## Verification

Backend regression tests use a dedicated disposable database only:

```sh
LEASEO_TEST_DATABASE_URL=<dedicated_database_ending_in_test> \
  npx tsx --test server/phone-login.test.ts server/notifications/pending-contact.test.ts
```

The database must already have the application schema. The test suite creates synthetic
accounts and consumes synthetic OTPs. Do not point it at a live database.

Production smoke check after deployment:

1. In a private browser window, open a property not previously enquired about with
   the test customer.
2. Choose WhatsApp, read the consent notice, and select **Agree & continue**.
3. Confirm the popup stays on the property page and asks only for mobile number.
4. Send an OTP to a number you control; this uses the configured real SMS service.
5. Enter the code and select **Verify & continue**.
6. For an existing account, confirm immediate login without profile fields. For a new
   number, complete name/user type, optionally leave email/city blank, and select
   **Save details & continue** in that same popup.
7. Confirm enquiry completion without a second WhatsApp click, second OTP or consent.
8. Check notification results separately in Delivery log. This feature does not
   approve provider templates, enable channels, or guarantee handset delivery.
9. Repeating the same account/property enquiry must not send duplicate notifications.
10. Log out, open a different property, and verify that the newly registered account
    now needs only mobile and OTP. Its original name/user type must remain unchanged.

Local verification did not send real SMS, WhatsApp or email. Browser verification uses
a synthetic OTP sender, the real login/enquiry handlers and an isolated test database.
