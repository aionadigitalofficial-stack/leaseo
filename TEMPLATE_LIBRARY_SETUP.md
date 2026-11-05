# Add WhatsApp templates, SMS templates and email drafts from Leaseo

## Deploy this update on Dokploy

Upload the changed/new files at your existing repository root, commit and
redeploy using your existing build. Back up the database first. In the
application's `/bin/sh` terminal:

```sh
cd /app
node script/migrate-property-contact.cjs
node script/migrate-property-contact.cjs --check
```

The helper now also runs `migrations/template-drafts.sql`, creating the additional
`notification_template_drafts` table. It preserves existing provider settings,
drafts, users, enquiries and notification templates. No `psql` is needed.
No new dependencies or required environment variables were introduced.
Keep your existing encryption key unchanged.

## Open the new option

Go to **Admin → Notification Templates → Template library → New draft**.

Select WhatsApp, SMS or Email and the customer, property-owner or admin recipient.
You can save multiple drafts for each combination, edit local drafts, duplicate
them, preview personalised content, and archive drafts locally.

### WhatsApp: submit to Meta

1. Enter a friendly internal name, lowercase Meta template name such as
   `leaseo_property_enquiry`, language such as `en_US`, and Utility or Marketing
   category.
2. Write the body using Leaseo variables such as `{{customer_name}}` and
   `{{property_title}}`. This version supports text-only BODY templates, not media,
   headers, footers, buttons or Authentication/OTP templates. Maximum 1,024 characters.
3. Enter fictional review examples for each used variable. Saving is local;
   **Submit to Meta** sends the template text and these examples for review.
   Never put credentials or real personal information in review examples.
4. Save, then choose **Submit to Meta**. This uses the WhatsApp access token,
   Business Account ID and Graph API version already saved in Leaseo's provider
   settings. It does not send a WhatsApp message.
5. Use **Refresh status** to fetch the actual Meta approval result. A submitted
   draft is not automatically approved. Timing and category decisions belong to Meta.
6. Once approved, choose **Apply to notifications** and confirm replacement of
   the corresponding customer/owner/admin WhatsApp notification.

The token needs **`whatsapp_business_management`** permission and access to the
selected WhatsApp Business Account. Sending also needs the normal messaging
permission and configured sender. Keep credentials only in the existing protected
provider settings, never in draft bodies or examples.

Leaseo automatically converts semantic variables to ordered Meta parameters:

```text
Leaseo: Hello {{customer_name}}, your enquiry for {{property_title}} was received.
Meta:   Hello {{1}}, your enquiry for {{2}} was received.
```

Repeated semantic variables reuse the same parameter position. Approval refresh
checks the saved account, template name, language and exact supported body.
Applying WhatsApp drafts checks Meta again; a stale local Approved label is not
enough. Account changes, altered provider text and unsupported components block use.

Submitted drafts are read-only. Duplicate to a new name to prepare another
version. Archiving removes only the local library entry: it never deletes a
template in Meta or changes a previously applied notification.

If submission times out, Leaseo records **UNKNOWN** rather than claiming failure
or approval, and blocks automatic resubmission. Refresh/check Meta Manager before
trying another name. No automatic create retries are performed.

### SMS: local drafts plus the provider's approved ID

Create and edit SMS text with the same Leaseo variables. Enter the approved
DLT template ID or MSG91 Flow ID if your provider requires it. Save, preview,
and apply to the appropriate notification slot.

**This does not register or approve a DLT template with a telecom provider.**
SMS providers have different registration systems, and Indian DLT approval
remains external. Match the provider's approved static wording and variables.
For MSG91, Flow variable names must match the Leaseo placeholder keys used in
the body. Twilio uses the rendered body; BhashSMS uses the approved ID and
existing sender/entity configuration.

SMS drafts never offer Meta submission and never pretend provider approval.
Existing OTP SMS configuration and messages are unchanged.

### Email drafts

Create a draft with a **subject and plain-text body**, both supporting variables.
Add example values to see a personalised preview before using the draft.
Email drafts do not need Meta-style approval.

Save/edit/duplicate drafts and choose **Apply to notifications** when ready.
Messages are sent later through the SMTP configuration already available in
notification settings, not by saving the draft. Configure a valid sender/domain
and SMTP account before enabling the email channel. This version is plain text;
it is not an HTML or attachment composer.

## Important activation rule

Applying a draft explicitly replaces one of the existing nine automatic
notification templates and **always leaves that template disabled**. It does
not create extra triggers, enqueue messages or enable a channel.

After reviewing the replacement in the existing Customer/Property owner/Admin
editor, enable that template and its channel when ready. Consent requirements,
enquiry deduplication, delivery queue and test-message safeguards remain in effect.
Multiple drafts are stored; only the selected applied template for a
recipient/channel is used for new enquiry notifications.

## API reference

All routes require existing admin authentication; credentials are never returned.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/notifications/drafts` | Drafts and supported variables |
| POST | `/api/admin/notifications/drafts` | Create a local draft |
| PATCH | `/api/admin/notifications/drafts/:id` | Update local draft with `version` |
| DELETE | `/api/admin/notifications/drafts/:id` | Archive locally with `version` |
| POST | `/api/admin/notifications/drafts/:id/preview` | Preview saved examples, supplied values or enquiry context |
| POST | `/api/admin/notifications/drafts/:id/submit` | Submit WhatsApp draft to Meta with `version` |
| POST | `/api/admin/notifications/drafts/:id/sync` | Refresh Meta status/content with `version` |
| POST | `/api/admin/notifications/drafts/:id/apply` | Confirm replacement using `version` and `confirmReplace:true` |

Versions prevent an old browser session overwriting someone else's changes.
Creating, submitting, refreshing and applying are rate-limited. Provider errors
are reduced to safe codes; raw responses and access tokens are not stored in drafts.

## Verification

- Notification/core/API/PostgreSQL tests: **36 passed, 0 failed, 0 skipped**.
- Existing WhatsApp tests: **29 passed, 0 failed**.
- Total automated: **65 passed**.
- Frontend and backend production bundles passed.
- Seven pre-existing unrelated repository type errors remain; no new draft errors.
- Signed-in desktop/browser checks passed: create/edit/reload email drafts,
  rendered previews, duplicate/local archive, confirmed replacement remaining
  disabled, persisted SMS IDs, and WhatsApp's honest missing-configuration error.
  At 390×844, create/edit/preview/apply dialogs stayed inside the viewport with
  no document overflow.
- Meta creation/approval/timeout contracts used transport stubs; no real templates
  were submitted and no WhatsApp/SMS/email messages were sent during these checks.

See `PROPERTY_CONTACT_TEST_REPORT.md` for the earlier contact-flow verification.
Live Meta approval, SMS provider registration and SMTP delivery still require
your actual accounts and operator setup.
