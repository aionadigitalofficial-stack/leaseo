-- Additive only. Does not alter existing users or listing-verification rules.
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'buyer';
