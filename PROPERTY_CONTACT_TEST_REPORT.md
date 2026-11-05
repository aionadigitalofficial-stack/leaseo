# Property contact and notification verification

## Results

- Notification/core/PostgreSQL suite: **25 passed, 0 failed, 0 skipped**.
- Existing Meta WhatsApp suite: **29 passed, 0 failed**.
- Total: **54 automated tests passed**.
- Frontend Vite production build: passed.
- Backend production esbuild bundle: passed.
- Additive migration and read-only readiness script: passed on isolated PostgreSQL;
  rerunning preserved existing rows and edited templates.
- Signed-in browser pass: passed for the flows below. Initial mobile issues were
  corrected and the focused 390×844 regression pass passed.
- Full repository `tsc`: seven pre-existing errors remain: three admin property
  field typings, missing `pg` typings, two obsolete deleteProperty references
  in historical routes, and undeclared nanoid in the old dev server.
  No errors were reported in the new notification code. The existing property
  detail priceOptions interface typing was corrected while updating that file.

## How tests were isolated

Used a disposable local PostgreSQL database, not the application's configured
database or Dokploy. Synthetic customers, owners, property details, tokens and
credentials only. Transport stubs tested OTP and multi-channel outcomes in the
automated suite. Browser tests used the real local API/database, with all
notification channels disabled. No live WhatsApp, SMS or SMTP sends occurred.

The unverified browser test deliberately had no SMS provider configured and
verified a real 503 error rather than pretending that an OTP was sent.
Successful OTP delivery/verification was exercised with a transport stub in the
backend suite, not a real SMS provider.

## Required scenario matrix

| Requested scenario | Verification |
| --- | --- |
| 1. New customer OTP → verification → enquiry → notifications | Backend: stored hash, verification and nine jobs passed using stub OTP transport. Real SMS receipt still needs configured provider. |
| 2. Same customer, second property, no repeated OTP | Backend and browser passed. |
| 3. Same customer, third property | Backend and browser passed; independent enquiry ID and correct title. |
| 4. Different customer's verification is independent | Backend passed; browser unverified account denied access and correctly reported SMS unavailable. |
| 5. Verified revisit needs no OTP | Browser returned existing enquiry, no duplicate jobs. |
| 6. Customer personalised messages | Database context/template rendering passed. Live channel delivery not exercised. |
| 7. Owner gets correct customer details | Stored context and template mapping passed. Live channel delivery not exercised. |
| 8. Admin gets property enquiry details | Admin template/context and nine-outcome tests passed. Live channel delivery not exercised. |
| 9. Customer-to-owner chat has property information | Browser verified server-returned property-specific URLs and success states. Customer still presses Send in WhatsApp. |
| 10. No Property A/B data mixing | Backend and browser passed for separate property titles and enquiries; stale-response guards added. |
| 11. Admin edits apply without deployment | Browser edited/saved/reloaded email template and previewed real enquiry context successfully. Meta-approved static wording remains provider-managed. |
| 12. Disabled template does not send | Backend dispatch skip and browser saved toggle persistence passed. |
| 13. WhatsApp failure leaves SMS/email running | Backend transport-stub isolation test passed. |
| 14. SMS failure leaves WhatsApp/email running | Backend transport-stub isolation test passed. |
| 15. Email failure leaves WhatsApp/SMS running | Backend transport-stub isolation test passed. |
| 16. Duplicate clicks do not duplicate records | Real PostgreSQL concurrent first-click and revisit tests passed; browser revisit returned created:false. |
| 17. Unverified users cannot get protected phone | API auth/verification checks and browser failed-OTP flow passed. Public listing responses now omit internal owner contact fields. |
| 18. Notification delivery logs maintained | Browser saw nine skipped outcomes per new enquiry; backend linked signed-history statuses to jobs without regression. Live receipt callbacks require Meta configuration. |

## Additional checks

- OTP resend cooldown, hourly limit, attempt limit, expiry and replay rejection.
- Registered number changed while a challenge is active: verification rejected.
- Failed OTP delivery invalidates the challenge and never returns a false success.
- Consent required; self-enquiries and unavailable properties rejected.
- Admin authorization, template whitelist, unknown placeholder rejection.
- SMTP password encrypted at rest; blank preserves; secret never returned.
- Latest saved template read at dispatch; disabled channels produce explicit skips.
- Temporary rejection backoff; no automatic resend after uncertain acceptance.
- Manual retries limited, duplicate retry requests rejected, unknown results denied.
- Desktop: nine templates plus the separate chat template, settings and logs.
- Mobile: admin document width exactly 390px; wide log table scrolls inside its
  own container; contact dialog stays within viewport; exactly one error alert.

## Still requires the operator's production configuration

- Active SMS provider and approved OTP/enquiry DLT/Flow templates where required.
- Production Meta sender/account/token and approved recipient-specific templates,
  exact language and parameter mappings, recipient opt-in and signed webhook.
- Working SMTP account, verified sender/domain and TLS configuration.
- Real device/provider checks for OTP receipt, outbound notifications and receipts.

Successful compilation and local tests do not certify live Meta/SMS/SMTP
configuration. SMS/email statuses currently confirm provider acceptance only;
there are no SMS delivery receipts or email bounce/delivery callbacks in this
feature.
