-- =============================================================================
-- WAITLESS — Migración: columnas de suscripción Stripe en tenants
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id    text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id        text,
  ADD COLUMN IF NOT EXISTS plan_expires_at         timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_stripe_customer_idx
  ON tenants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_stripe_subscription_idx
  ON tenants(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
