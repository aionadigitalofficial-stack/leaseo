BEGIN;
CREATE TABLE IF NOT EXISTS wati_notification_settings (
  id integer PRIMARY KEY CHECK (id=1),
  api_host text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT '',
  encrypted_token text,
  encrypted_webhook_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO wati_notification_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS wati_notification_attempts (
  id uuid PRIMARY KEY,
  job_id varchar NOT NULL REFERENCES notification_jobs(id) ON DELETE CASCADE,
  api_host text NOT NULL,
  channel text NOT NULL DEFAULT '',
  broadcast_id text,
  wati_message_id text,
  whatsapp_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wati_attempt_job_idx ON wati_notification_attempts(job_id,created_at DESC);
CREATE TABLE IF NOT EXISTS wati_notification_events (
  event_key text PRIMARY KEY,
  local_id text,
  wati_message_id text,
  whatsapp_message_id text,
  channel text NOT NULL DEFAULT '',
  status text NOT NULL CHECK(status IN ('sent','delivered','read','failed')),
  error_code text,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wati_notification_events ADD COLUMN IF NOT EXISTS api_host text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS wati_event_local_idx ON wati_notification_events(local_id);
CREATE INDEX IF NOT EXISTS wati_event_message_idx ON wati_notification_events(wati_message_id);
CREATE INDEX IF NOT EXISTS wati_event_whatsapp_idx ON wati_notification_events(whatsapp_message_id);
COMMIT;
