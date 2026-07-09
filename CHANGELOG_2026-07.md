# Leaseo — Deployment Update Changelog

This update fixes the 4 issues from the July 2026 developer issue brief, plus
a full security/bug audit of the rest of the codebase. Full details below.
See DEPLOYMENT_STEPS.md for how to safely apply this to leaseo.in.

## Database changes (all additive — nothing dropped or renamed)
Run `npm run db:push` after deploying. This adds:
- `users`: `user_type`, `is_flagged`, `flagged_at`, `flag_reason`, `warned_at`
- `properties`: `deleted_at`, `deleted_by`, `deleted_by_role`,
  `broker_declaration_confirmed`, `broker_declaration_at`, `submission_ip`,
  `submission_user_agent`
- New table `listing_audit_logs` — permanent history of every listing action
- New table `property_documents` — optional supporting docs per listing
- New enum value `broker_listing` on `report_reason`

## Issue #1 — Listings disappearing after posting
Root cause: new listings were force-set to `status: "pending"`, and the
public listings query only ever returns `status: "active"`. Fixed: listings
go live immediately. Moderation moved from a pre-publish gate to post-publish
(admin gets emailed on every new listing, full audit trail, and can still
deactivate/edit anything).

## Issue #2 — No data retained on delete
Root cause: `DELETE /api/properties/:id` did a real SQL `DELETE`, with no
auth on the route at all. Fixed: deleting now soft-deletes (marks inactive,
records who/when/role) and requires login + ownership. Every listing action
(create/update/delete/restore) is now logged permanently to
`listing_audit_logs`, viewable in Admin → Properties → Deleted tab.

## Issue #3 — No mandatory profile before posting
Root cause: the "Complete Your Profile" page never called any API — it was a
`setTimeout()` mockup. Fixed: real page with actual OTP verification for
both email and phone, a required user-type selection (Owner/Tenant/
Builder-Developer), and a real `PATCH /api/auth/profile` endpoint. Posting a
listing now requires a completed, verified profile (403 with a clear message
+ redirect if not).

## Issue #4 — No broker detection
Fixed: mandatory "I am the owner, not a broker" declaration checkbox on
every new listing; max 2 active listings per account; a real, working
"Report this listing" button on the public listing page (previously only
existed in the dashboard and didn't call the API); a dedicated
"posted by a broker" report reason; automatic account flagging with an
Admin → Flagged Accounts screen (Clear/Warn/Deactivate actions).

## New: optional property documents
Owners can now optionally attach supporting documents (ownership proof, tax
receipt, etc.) when listing — never required. Visible to admin only, under
Admin → Properties → Edit → Supporting Documents.

## Security fixes (found during the audit, not in the original brief)
- `DELETE /api/properties/:id` — was fully unauthenticated
- `GET/PATCH /api/reports` — commented "admin only", had zero auth
- `/api/owner/properties`, `/api/owner/enquiries`, `/api/tenant/enquiries` —
  anyone could view any user's listings/enquiries via `?ownerId=<any id>`
- `/api/shortlists` (GET/POST/DELETE) — same IDOR pattern
- `PATCH /api/feature-flags/:id` — anyone could toggle site-wide flags
- `PATCH /api/blog/:id` (legacy route) — unauthenticated, and unsanitized;
  combined with unsanitized `dangerouslySetInnerHTML` on the blog page, this
  was a stored-XSS + defacement path. Route removed (it was unused), and
  blog content is now sanitized both on save and on render.
- Unauthenticated arbitrary file upload — `/api/uploads/request-url` +
  `/api/upload/direct` (the endpoints the app's own image uploader uses) had
  no auth, no file-type check, and no size limit. Now requires login,
  validates type/size, and the upload URL is single-use and tied to the
  requesting user.
- Boost/payment flow: `(req as any).userId` was never set by the auth
  middleware (should have been `req.user.id`), so boosting a listing was
  completely broken for real users. Also fixed: payment status is now
  verified server-side against Instamojo's API instead of trusting the
  `payment_status` query param / webhook body, which could previously be
  set by hand to mark a boost "paid" for free.
- Admin's "Payment Gateway" and "SMS/WhatsApp Providers" settings screens
  had zero effect on real behavior — both only ever read raw environment
  variables. Now wired to actually use whichever provider is configured
  active in the admin panel (Twilio/MSG91/BhashSMS/WATI for SMS,
  Instamojo sandbox/live for payments), falling back to env vars if nothing
  is configured.
- Property image management (`set-primary`/delete) required admin auth even
  though property owners use those same endpoints to manage their own
  listing photos — owners were silently getting 403s. Fixed to allow
  owner-or-admin.
- `post-property.tsx` and the property PATCH route both checked
  `activeRoleId === "admin"` / `.includes("owner")` — `activeRoleId` is a
  random UUID, so these checks could never actually match. Fixed to use the
  correct `isAdmin` / `activeRoleName` fields.
- No server-side password strength check on registration (only client-side,
  and only 6 characters). Now enforced server-side, matching the
  reset-password rules (8+ chars, upper/lower/digit).
- The public property-detail page showed a **hardcoded fake phone number**
  (`+91 98765 43210`) whenever a real owner phone wasn't already on the
  payload — which was always, since that endpoint never included it. Fixed:
  the real number is only ever revealed after a visitor completes OTP
  verification for that specific listing.
- Newsletter CSV export didn't escape commas/quotes, silently corrupting
  rows; also hardened against formula injection when opened in Excel.
- Removed `server/routes1.ts`, a dead, unused 3,590-line duplicate of the
  live routes file.
- Removed a duplicate, always-shadowed `POST /api/uploads/request-url`
  registration in the old Replit object-storage integration.
- `sendWelcomeEmail()` existed but was never called — now sent on
  registration.
- Removed `/api/auth/verification-status` — unused, and let anyone check
  whether an email/phone was registered (enumeration).

## Functional fixes
- Tenant Dashboard's "Saved Properties" and "Enquiries" tabs were rendering
  hardcoded mock data for every user. Now wired to the real (already
  correct) API, enriched server-side with property/owner details.
- "Remove from shortlist" and the dashboard's report-submit button were both
  no-ops that only showed a success toast. Both now actually call the API.
- `getOwnerEnquiries` fetched every enquiry in the system and filtered in
  JavaScript instead of filtering in the database query.

## Still worth deciding
- Listings now publish immediately per the brief's explicit wording. If you
  want a hard pre-publish approval gate instead, that's a straightforward
  follow-up — flag it and it can be added as an admin-configurable toggle.
- The default seeded admin login (`admin@leaseo.in` / `Admin@123`) is
  documented in `DEPLOYMENT.md` in plain text. Please change it.
