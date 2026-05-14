-- =============================================================================
-- WAITLESS V10 — Sprint 2-4 Migration
-- Run in Supabase Dashboard → SQL Editor, in a single execution.
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS / DO NOTHING.
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. consumer_wallet: split balance_cents into cash + rewards + add currency
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE consumer_wallet
  ADD COLUMN IF NOT EXISTS balance_cash_cents    integer NOT NULL DEFAULT 0 CHECK (balance_cash_cents    >= 0),
  ADD COLUMN IF NOT EXISTS balance_rewards_cents integer NOT NULL DEFAULT 0 CHECK (balance_rewards_cents >= 0),
  ADD COLUMN IF NOT EXISTS currency              text    NOT NULL DEFAULT 'usd'
    CHECK (currency IN ('ves','mxn','usd'));

-- Migrate existing balance_cents → balance_cash_cents (only when column still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consumer_wallet' AND column_name = 'balance_cents'
  ) THEN
    UPDATE consumer_wallet
    SET balance_cash_cents = balance_cents
    WHERE balance_cash_cents = 0 AND balance_cents > 0;

    ALTER TABLE consumer_wallet DROP COLUMN balance_cents;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. wallet_transactions: add balance_type column
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS balance_type text
    CHECK (balance_type IN ('cash','rewards','mixed'));

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. consumer_profiles: add stripe_customer_id
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE consumer_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS consumer_profiles_stripe_customer_idx
  ON consumer_profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. wallet_rewards: FIFO rewards tracking (expires_at driven)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet_rewards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid        NOT NULL REFERENCES consumer_profiles(id) ON DELETE CASCADE,
  currency    text        NOT NULL DEFAULT 'usd',
  amount_cents integer    NOT NULL CHECK (amount_cents > 0),
  origin      text        NOT NULL,
  tenant_id   uuid        REFERENCES tenants(id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  status      text        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','used','expired')),
  expired_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_rewards_consumer_idx ON wallet_rewards(consumer_id);
CREATE INDEX IF NOT EXISTS wallet_rewards_status_expires_idx ON wallet_rewards(status, expires_at);

ALTER TABLE wallet_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_rewards_own" ON wallet_rewards
  FOR SELECT USING (consumer_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. tenants: Stripe Connect columns
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id      text,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_status          text;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_stripe_connect_account_idx
  ON tenants(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. dispute_tickets: full dispute lifecycle table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dispute_tickets (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id             uuid        NOT NULL REFERENCES consumer_profiles(id) ON DELETE CASCADE,
  order_id                uuid        REFERENCES orders(id) ON DELETE SET NULL,
  tenant_id               uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  motivo                  text        NOT NULL,
  descripcion             text,
  foto_urls               text[]      NOT NULL DEFAULT '{}',
  status                  text        NOT NULL DEFAULT 'abierto'
                            CHECK (status IN (
                              'abierto',
                              'en_revision',
                              'restaurante_respondio',
                              'resuelto_favor_cliente',
                              'resuelto_favor_restaurante'
                            )),
  resolucion              text,
  restaurante_respuesta   text,
  restaurante_respondio_at timestamptz,
  refund_cents            integer     NOT NULL DEFAULT 0 CHECK (refund_cents >= 0),
  neto_cents              integer,
  resolved_at             timestamptz,
  resolved_by             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dispute_tickets_consumer_idx  ON dispute_tickets(consumer_id);
CREATE INDEX IF NOT EXISTS dispute_tickets_tenant_idx    ON dispute_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS dispute_tickets_order_idx     ON dispute_tickets(order_id);
CREATE INDEX IF NOT EXISTS dispute_tickets_status_idx    ON dispute_tickets(status);
CREATE INDEX IF NOT EXISTS dispute_tickets_resolved_at_idx ON dispute_tickets(resolved_at)
  WHERE resolved_at IS NOT NULL;

CREATE OR REPLACE TRIGGER dispute_tickets_updated_at
  BEFORE UPDATE ON dispute_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE dispute_tickets ENABLE ROW LEVEL SECURITY;

-- Consumer can see their own disputes
CREATE POLICY "dispute_own_consumer" ON dispute_tickets
  FOR SELECT USING (consumer_id = auth.uid());

-- Restaurant staff can see disputes for their tenant (via service role in API routes)
-- Service role bypasses RLS — no per-staff policy needed for admin/manager routes.

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. liquidaciones: weekly settlement records per tenant
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS liquidaciones (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start            date        NOT NULL,
  period_end              date        NOT NULL,
  bruto_cents             integer     NOT NULL DEFAULT 0 CHECK (bruto_cents >= 0),
  comision_waitless_cents integer     NOT NULL DEFAULT 0 CHECK (comision_waitless_cents >= 0),
  reembolsos_cents        integer     NOT NULL DEFAULT 0 CHECK (reembolsos_cents >= 0),
  neto_cents              integer     NOT NULL DEFAULT 0 CHECK (neto_cents >= 0),
  transaction_count       integer     NOT NULL DEFAULT 0,
  status                  text        NOT NULL DEFAULT 'pendiente'
                            CHECK (status IN ('pendiente','procesada','fallida')),
  stripe_transfer_id      text,
  error_message           text,
  processed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS liquidaciones_tenant_period_idx
  ON liquidaciones(tenant_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS liquidaciones_tenant_idx  ON liquidaciones(tenant_id);
CREATE INDEX IF NOT EXISTS liquidaciones_status_idx  ON liquidaciones(status);

ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;

-- Restaurant admins can view their own settlements (via service role in API routes)
-- Service role bypasses RLS. Add explicit policy for anon reads if dashboard needs it later.

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. orders: add origin column for marketplace commission logic
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS origin text DEFAULT 'direct'
    CHECK (origin IN ('qr','direct','marketplace'));

-- ──────────────────────────────────────────────────────────────────────────────
-- Done. Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'consumer_wallet';
--   SELECT table_name  FROM information_schema.tables  WHERE table_name IN ('wallet_rewards','dispute_tickets','liquidaciones');
-- ──────────────────────────────────────────────────────────────────────────────
