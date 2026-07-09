-- Leaseo July 2026 update — manual migration
-- Safe to run as one block: every statement is additive (new columns/
-- tables/enum values only) and uses IF NOT EXISTS, so this is idempotent —
-- if it's interrupted partway or you run it twice, nothing breaks. Not
-- wrapped in an explicit transaction on purpose: Postgres restricts using a
-- newly-added enum value inside the same transaction that added it, so
-- each statement below commits on its own as psql runs it.

-- ---- New enum types ----
DO $$ BEGIN
  CREATE TYPE actor_role AS ENUM ('user', 'admin', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_audit_action AS ENUM ('created', 'updated', 'status_changed', 'deleted', 'restored', 'flagged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('owner', 'tenant', 'builder_developer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE property_document_type AS ENUM ('ownership_proof', 'tax_receipt', 'noc', 'identity_proof', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- New value on an existing enum ----
DO $$ BEGIN
  ALTER TYPE report_reason ADD VALUE IF NOT EXISTS 'broker_listing';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- users: new columns ----
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type user_type;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flagged_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS warned_at timestamp;
CREATE INDEX IF NOT EXISTS users_flagged_idx ON users (is_flagged);

-- ---- properties: new columns ----
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deleted_by varchar REFERENCES users(id);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deleted_by_role text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS broker_declaration_confirmed boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS broker_declaration_at timestamp;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS submission_ip text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS submission_user_agent text;
CREATE INDEX IF NOT EXISTS properties_deleted_idx ON properties (deleted_at);

-- ---- new table: listing_audit_logs ----
CREATE TABLE IF NOT EXISTS listing_audit_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id varchar NOT NULL REFERENCES properties(id),
  action listing_audit_action NOT NULL,
  actor_id varchar REFERENCES users(id),
  actor_role actor_role NOT NULL DEFAULT 'user',
  snapshot jsonb,
  ip_address text,
  user_agent text,
  notes text,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listing_audit_property_idx ON listing_audit_logs (property_id);
CREATE INDEX IF NOT EXISTS listing_audit_actor_idx ON listing_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS listing_audit_action_idx ON listing_audit_logs (action);
CREATE INDEX IF NOT EXISTS listing_audit_created_idx ON listing_audit_logs (created_at);

-- ---- new table: property_documents ----
CREATE TABLE IF NOT EXISTS property_documents (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id varchar NOT NULL REFERENCES properties(id),
  document_type property_document_type NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  url text NOT NULL,
  uploaded_by varchar REFERENCES users(id),
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS property_documents_property_idx ON property_documents (property_id);

-- Quick sanity check - should return one row confirming the column exists
SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_type';
