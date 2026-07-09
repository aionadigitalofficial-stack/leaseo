# Leaseo — Round 2 fixes (July 9, 2026)

Covers the 10 issues reported after the first deployment. Read the
"IMPORTANT" note at the top before redeploying — it explains why several of
these showed up.

## IMPORTANT: your live site is running an older build

I checked #9 (tenant dashboard fake data) and #10 (document upload) against
this codebase specifically, and **both were already fixed/built in the code
you were given last time** — meaning the currently-live site isn't actually
running that code. Somewhere in the last deploy, the database got migrated
correctly (that's why the site came back up), but the actual application
code that went live appears to be an older version.

Before redeploying this update, please confirm with whoever manages the
Dokploy deployment that it's building fresh from this exact source folder,
not reusing a cached image or an older git commit. After deploying, the
fastest way to confirm the NEW code is actually live: check whether "Blog"
appears in the top navigation menu — if it's still missing after this
deploy, the build didn't pick up the changes.

## Fixed in code (this update)

**#1 - Forgot password 404.** This page and its backend never existed —
`login.tsx` has always linked to `/forgot-password`, but there was no route
registered and no server endpoint for resetting a password while logged
out (the only existing "reset password" flow requires already being logged
in). Built both from scratch: request a code by email, verify it, set a new
password.

**#3 - Owner contact showing a fake "...1234" number.** This was a
*second*, separate hardcoded fallback I hadn't caught in the first pass —
distinct from the one already fixed. The "Call Owner" button's *pre-verification*
label was generating a fake masked number (always ending in the same fake
digits) because it tried to mask a phone number that's intentionally never
sent to the browser before verification. Now just says "Show Phone Number"
until verified, then reveals the real number.

**#4 - Property listing fails at the very last step with a generic error.**
Root cause: posting a listing now requires a fully completed profile
(mandatory since the last update) — but this page's own older, separate
"Verify Your Identity" step (single-channel OTP) doesn't satisfy that
requirement, so a user could fill out the entire form, see "Ready to
Publish / Verified", and only then get blocked. Fixed by checking profile
completeness immediately when the page loads, before any time is spent on
the form, with a clear message and a direct link to finish their profile.

**#7 - Blog missing from the main menu.** Confirmed genuinely missing from
the shared navigation component (both desktop and mobile) — added.

## Needs your configuration, not more code

**#2 / #5 - OTP not arriving.** I found the actual cause: your live site's
email and SMS delivery are **both currently failing**, and the fallback
that exists for local development (show the code directly instead of
sending it) was firing on your real production site — meaning verification
codes were readable in the browser's network tab instead of actually being
delivered. I've disabled that fallback in production (see security fix
below), but this means **OTPs will not work at all until you configure a
real delivery method**:

- Email: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `SMTP_FROM_EMAIL` as environment variables on your VPS/Dokploy app.
- SMS: either set `BHASHSMS_USER` / `BHASHSMS_PASSWORD` / `BHASHSMS_SENDER`
  as environment variables, or configure and activate a provider
  (Twilio/MSG91/BhashSMS/WATI) in Admin → SMS/WhatsApp Providers — that
  panel is now actually wired up (from the last update) to use whatever
  you activate there.

Until one of these is set up, no OTP-gated action will work: login via
phone, profile verification, posting a listing, or revealing an owner's
contact number.

## Security fix (found while investigating #2/#5)

The OTP endpoint returned the real verification code directly in the API
response whenever delivery failed — meant only as a local-dev convenience,
but it was firing live on production because delivery is currently broken
(see above). Fixed: that fallback is now disabled whenever
`NODE_ENV=production`. Confirm that environment variable is actually set to
`production` on your Dokploy app - if it isn't, this fix won't take effect.

## Needs a decision before I build anything (not bugs — design questions)

**#6 - Home search bar layout.** The screenshots show a different structure
than what's currently live (radio-style single-select BHK vs. the current
checkbox multi-select, free-text Min/Max vs. the current preset range
dropdown). This is a real UI rework, not a quick fix - let me know if you
want it to match the screenshots exactly and I'll scope it properly.

**#8 - Commercial dropdown.** Your screenshot shows the Commercial menu
expanding to just "Rent / Buy". The current site instead shows Commercial
property sub-types (Office, Shop, Warehouse, Co-working, Industrial, Land) -
matching how the Rent and Buy menus work. Let me know which structure you
actually want for Commercial and I'll make it consistent.
