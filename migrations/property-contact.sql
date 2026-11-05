-- Back up first. Additive PostgreSQL migration; safe to rerun.
BEGIN;
CREATE TABLE IF NOT EXISTS notification_rate_limits (
  user_id varchar NOT NULL REFERENCES users(id),
  action text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL,
  PRIMARY KEY(user_id,action)
);
CREATE TABLE IF NOT EXISTS property_contact_otps (
  user_id varchar PRIMARY KEY REFERENCES users(id),
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL DEFAULT now(),
  send_count integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS notification_configuration (
  id integer PRIMARY KEY CHECK (id = 1),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  encrypted_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO notification_configuration(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS notification_templates (
  id varchar PRIMARY KEY,
  template_name text NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('customer','owner','admin','chat')),
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms','email','chat')),
  event_type text NOT NULL DEFAULT 'property_contact',
  subject text NOT NULL DEFAULT '',
  message_body text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  meta_template_name text NOT NULL DEFAULT '',
  meta_language text NOT NULL DEFAULT 'en_US',
  parameter_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  sms_template_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipient_type, channel, event_type)
);
CREATE TABLE IF NOT EXISTS property_contact_access (
  id varchar PRIMARY KEY,
  enquiry_id varchar NOT NULL UNIQUE REFERENCES enquiries(id),
  customer_id varchar NOT NULL REFERENCES users(id),
  property_id varchar NOT NULL REFERENCES properties(id),
  owner_id varchar REFERENCES users(id),
  verified_phone text NOT NULL,
  consent_confirmed boolean NOT NULL,
  context jsonb NOT NULL,
  contact_access_status text NOT NULL DEFAULT 'granted',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, property_id)
);
CREATE INDEX IF NOT EXISTS property_contact_access_property_idx ON property_contact_access(property_id);
CREATE TABLE IF NOT EXISTS notification_jobs (
  id varchar PRIMARY KEY,
  enquiry_id varchar NOT NULL REFERENCES enquiries(id),
  customer_id varchar NOT NULL REFERENCES users(id),
  property_id varchar NOT NULL REFERENCES properties(id),
  recipient_type text NOT NULL,
  recipient_id varchar,
  recipient text NOT NULL,
  channel text NOT NULL,
  template_id varchar NOT NULL REFERENCES notification_templates(id),
  test_key text NOT NULL DEFAULT '',
  consent_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  retryable boolean NOT NULL DEFAULT false,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text,
  error_code text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(enquiry_id, recipient_type, channel, test_key)
);
CREATE INDEX IF NOT EXISTS notification_jobs_pending_idx ON notification_jobs(status,next_attempt_at);
CREATE INDEX IF NOT EXISTS notification_jobs_provider_idx ON notification_jobs(provider_message_id);
INSERT INTO notification_templates(id,template_name,recipient_type,channel,subject,message_body,is_enabled,parameter_keys)
SELECT recipient || '_' || channel, initcap(recipient) || ' property interest ' || channel,
 recipient,channel,
 CASE WHEN channel <> 'email' THEN ''
      WHEN recipient = 'customer' THEN 'Your Property Interest Has Been Registered – {{property_title}}'
      WHEN recipient = 'owner' THEN 'New Customer Interested in Your Property – {{property_title}}'
      ELSE 'New Property Interest Received – {{property_title}}' END,
 CASE
 WHEN channel = 'email' AND recipient = 'customer' THEN
 E'Hello {{customer_name}},\n\nYou are showing interest in the following property:\nProperty Name: {{property_title}}\nLocation: {{property_location}}\nProperty Type: {{property_type}}\nPrice: {{property_price}}\n\nThe property owner''s contact details are now available.\nYou can connect with the property owner directly.\nView Property: {{property_url}}\n\nThank you for using {{platform_name}}.'
 WHEN channel = 'email' AND recipient = 'owner' THEN
 E'Hello {{owner_name}},\n\nGood news! A customer has shown interest in your property.\n\nCustomer Details:\nName: {{customer_name}}\nMobile: {{customer_phone}}\nEmail: {{customer_email}}\n\nProperty Details:\nProperty: {{property_title}}\nLocation: {{property_location}}\nPrice: {{property_price}}\nProperty Type: {{property_type}}\nEnquiry Date: {{request_date}}\nEnquiry Time: {{request_time}}\n\nPlease connect with the interested customer for further discussion.\nThank you.'
 WHEN channel = 'email' AND recipient = 'admin' THEN
 E'Hello Admin,\n\nA new customer has shown interest in a property on {{platform_name}}.\n\nCUSTOMER DETAILS:\nName: {{customer_name}}\nMobile: {{customer_phone}}\nEmail: {{customer_email}}\n\nPROPERTY DETAILS:\nProperty Name: {{property_title}}\nProperty ID: {{property_id}}\nLocation: {{property_location}}\nPrice: {{property_price}}\nProperty Type: {{property_type}}\n\nPROPERTY OWNER DETAILS:\nOwner Name: {{owner_name}}\nOwner Mobile: {{owner_phone}}\nOwner Email: {{owner_email}}\n\nENQUIRY DETAILS:\nDate: {{request_date}}\nTime: {{request_time}}\n\nPlease check the enquiry in the Admin Dashboard.'
 WHEN recipient = 'customer' THEN
 'Hello {{customer_name}}, you are showing interest in the property {{property_title}} located at {{property_location}}. The property owner''s contact details are now available.'
 WHEN recipient = 'owner' THEN
 E'Hello {{owner_name}}, {{customer_name}} is showing interest in your property {{property_title}} at {{property_location}}.\n\nCustomer Contact Details:\nName: {{customer_name}}\nMobile: {{customer_phone}}\nEmail: {{customer_email}}\n\nPlease connect with the interested customer.'
 ELSE
 E'New Property Interest Received!\nCustomer: {{customer_name}}\nCustomer Mobile: {{customer_phone}}\nCustomer Email: {{customer_email}}\nProperty: {{property_title}}\nProperty ID: {{property_id}}\nLocation: {{property_location}}\nOwner: {{owner_name}}\nOwner Mobile: {{owner_phone}}\nRequest Date: {{request_date}}\nA customer has shown interest in this property.'
 END,
 false,
 CASE WHEN recipient='customer' THEN '["customer_name","property_title","property_location"]'::jsonb
      WHEN recipient='owner' THEN '["owner_name","customer_name","property_title","property_location","customer_name","customer_phone","customer_email"]'::jsonb
      ELSE '["customer_name","customer_phone","customer_email","property_title","property_id","property_location","owner_name","owner_phone","request_date"]'::jsonb END
FROM (VALUES ('customer'),('owner'),('admin')) r(recipient)
CROSS JOIN (VALUES ('whatsapp'),('sms'),('email')) c(channel)
ON CONFLICT DO NOTHING;
INSERT INTO notification_templates(id,template_name,recipient_type,channel,message_body,is_enabled)
VALUES ('customer_owner_chat','Customer to owner WhatsApp message','chat','chat',
 'Hello {{owner_name}}, {{customer_name}} is interested in your property {{property_title}} located at {{property_location}}. Please connect with the customer for further discussion.',true)
ON CONFLICT DO NOTHING;
COMMIT;
