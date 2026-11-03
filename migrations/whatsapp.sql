-- Additive only. Run against the existing Leaseo database before enabling WhatsApp.
-- Back up the database first. Do not replace/import the uploaded database export.
BEGIN;
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id integer PRIMARY KEY,
  encrypted_config text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS whatsapp_delivery_events (
  event_key varchar(64) PRIMARY KEY,
  message_id text NOT NULL,
  status text NOT NULL,
  event_timestamp bigint NOT NULL,
  error_code integer,
  received_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_delivery_events_time_idx
  ON whatsapp_delivery_events (event_timestamp);
CREATE INDEX IF NOT EXISTS whatsapp_delivery_events_message_idx
  ON whatsapp_delivery_events (message_id);
COMMIT;
