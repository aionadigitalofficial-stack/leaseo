-- Additional drafts do not create new automatic notification triggers.
BEGIN;
CREATE TABLE IF NOT EXISTS notification_template_drafts (
  id text PRIMARY KEY,
  template_name text NOT NULL,
  recipient_type text NOT NULL CHECK(recipient_type IN ('customer','owner','admin')),
  channel text NOT NULL CHECK(channel IN ('whatsapp','sms','email')),
  subject text NOT NULL DEFAULT '',
  message_body text NOT NULL,
  meta_template_name text NOT NULL DEFAULT '',
  meta_language text NOT NULL DEFAULT 'en_US',
  meta_category text NOT NULL DEFAULT 'UTILITY' CHECK(meta_category IN ('UTILITY','MARKETING')),
  parameter_keys jsonb NOT NULL DEFAULT '[]',
  sms_template_id text NOT NULL DEFAULT '',
  example_values jsonb NOT NULL DEFAULT '{}',
  meta_template_id text NOT NULL DEFAULT '',
  meta_account_id text NOT NULL DEFAULT '',
  provider_status text NOT NULL DEFAULT 'DRAFT',
  provider_error_code text,
  provider_body text,
  last_synced_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_template_drafts_active
  ON notification_template_drafts(channel,updated_at DESC) WHERE archived=false;
COMMIT;
