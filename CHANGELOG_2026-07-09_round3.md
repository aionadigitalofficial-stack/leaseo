# Leaseo — Round 3 fixes (July 9, 2026)

## The big one: phone verification was a complete dead end

This was the real reason you couldn't post a property no matter what you
did. Your server log confirms it precisely:

```
POST /api/auth/otp/send ... "emailSent":true,"smsSent":false
```

Email delivery works now (great - SMTP is configured correctly). **SMS does
not** - no provider is set up yet. Combined with last round's security fix
(the OTP code is no longer shown as a fallback in production), phone
verification had become **impossible to complete for anyone** - every user
would type their phone number, request a code, and simply never receive
one, with no way to proceed.

Fixed properly: the app now checks whether SMS delivery is actually
configured. If it isn't, phone *verification* is temporarily not required
to complete your profile or post a listing - your phone number is still
collected and saved, just marked unverified until SMS is set up. The moment
you configure a real SMS provider (Admin → SMS/WhatsApp Providers, or the
`BHASHSMS_*` environment variables), phone verification becomes mandatory
again automatically, with no further code changes needed.

**This means you can post a listing right now**, even before SMS is
configured. Once you do configure SMS, existing users with an unverified
phone will be asked to verify it the next time something requires it.

## Found something else while investigating: a real account got deactivated

Your log shows:
```
POST /api/auth/login 401 "Account is deactivated" - namrata@creativebrain.co.in
```

I checked - nothing I've written touches `is_active` for a login or
password reset, so this isn't something the recent changes caused. But it's
a real account being blocked, so please check it directly:

```sql
SELECT email, is_active FROM users WHERE email = 'namrata@creativebrain.co.in';
```

If it shows `false` (or blank/null) and you don't know why, this restores it:
```sql
UPDATE users SET is_active = true WHERE email = 'namrata@creativebrain.co.in';
```

Worth also checking if any other real accounts are unexpectedly in this
state:
```sql
SELECT email, is_active FROM users WHERE is_active IS DISTINCT FROM true;
```

## Home page search bar + Commercial menu - now matches your screenshots

Since this was asked for twice, I went ahead and implemented it directly
against your reference screenshots rather than waiting for further
confirmation:

- BHK selector is now a single-select dropdown (was multi-select checkboxes)
- Price is now free-text Min ₹ / Max ₹ inputs (was a preset range dropdown)
- Commercial tab now has its own Rent/Buy toggle
- Commercial menu in the header now expands to "Rent / Buy" (was a list of
  property sub-types like Office/Shop/Warehouse)

## On Blog / Tenant Dashboard / Document upload "still not showing"

I checked the source code again specifically for these three - all three
are genuinely present and correct in what's being deployed. Here's the
thing that makes me confident this round's build DID reach your browser:
**your own log shows `/api/auth/forgot-password/request` and
`/api/auth/forgot-password/reset` succeeding** - that page didn't exist in
any earlier version, so if you were able to use it, your browser was
loading the new frontend bundle at that point.

My best guess: browser cache on a tab that was already open before the
deploy finished, or a CDN/proxy cache in front of the static assets. Could
you try this specific test and let me know what you see - it'll tell us a
lot:

1. Open an **incognito/private window** (guarantees zero cache)
2. Go to leaseo.in
3. Check: is "Blog" in the top menu?
4. Log in, go to your dashboard, check "Saved Properties" / "Enquiries" - do
   they show real data (or an empty state), not the same demo listings
   every time?
5. Go to post a property, get to the Photos step - is there a "Supporting
   Documents (Optional)" section below the video URL field?

If all three show correctly in incognito, it was caching, and normal
browsing will need a hard refresh (Ctrl+Shift+R / Cmd+Shift+R) once. If any
of them are still missing even in a clean incognito window, tell me exactly
which one and I'll dig further - at that point it'd be a genuinely new
finding, not a repeat of what's already fixed in the code.
