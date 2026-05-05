-- Migration: link orders to consumer profiles for order history
-- Run in Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS consumer_id uuid REFERENCES consumer_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_consumer_id_idx ON orders(consumer_id) WHERE consumer_id IS NOT NULL;
