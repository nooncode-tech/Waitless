-- Migration: consumer Stripe integration + PayPal preference
-- Run in Supabase SQL Editor

-- Add Stripe customer ID to consumer_profiles (for saved cards)
ALTER TABLE consumer_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS paypal_email text;

-- Ensure consumer_saved_cards table exists (from migration-consumer-module.sql)
CREATE TABLE IF NOT EXISTS consumer_saved_cards (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id              uuid REFERENCES consumer_profiles(id) ON DELETE CASCADE,
  alias                    text DEFAULT 'Mi tarjeta',
  brand                    text,
  last4                    text,
  exp_month                int,
  exp_year                 int,
  stripe_payment_method_id text,
  is_default               boolean DEFAULT false,
  created_at               timestamptz DEFAULT now()
);

ALTER TABLE consumer_saved_cards ENABLE ROW LEVEL SECURITY;
