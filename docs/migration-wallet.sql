-- =============================================================================
-- WAITLESS V10 — Migración: Monedero (Waitless Créditos)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================================================

-- ── 1. Tabla de saldo por consumidor ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consumer_wallet (
  consumer_id   uuid PRIMARY KEY REFERENCES consumer_profiles(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER consumer_wallet_updated_at
  BEFORE UPDATE ON consumer_wallet
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. Historial de transacciones del monedero ────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id             uuid NOT NULL REFERENCES consumer_profiles(id) ON DELETE CASCADE,
  type                    text NOT NULL CHECK (type IN ('recharge','payment','refund')),
  amount_cents            integer NOT NULL,
  balance_after_cents     integer,
  description             text,
  stripe_payment_intent_id text,
  tenant_id               uuid REFERENCES tenants(id) ON DELETE SET NULL,
  order_id                uuid REFERENCES orders(id) ON DELETE SET NULL,
  session_id              uuid REFERENCES table_sessions(id) ON DELETE SET NULL,
  status                  text NOT NULL DEFAULT 'completed'
                           CHECK (status IN ('pending','completed','failed')),
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_consumer_idx ON wallet_transactions(consumer_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_tenant_idx   ON wallet_transactions(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_intent_idx
  ON wallet_transactions(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ── 3. Ampliar payment_method en table_sessions ───────────────────────────────
-- Primero eliminamos el constraint viejo, luego lo recreamos con los nuevos valores
ALTER TABLE table_sessions DROP CONSTRAINT IF EXISTS table_sessions_payment_method_check;
ALTER TABLE table_sessions ADD CONSTRAINT table_sessions_payment_method_check
  CHECK (payment_method IN ('tarjeta','efectivo','transferencia','apple_pay','waitless_creditos','paypal'));

-- ── 4. Ampliar payment_method en orders ──────────────────────────────────────
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('tarjeta','efectivo','transferencia','apple_pay','waitless_creditos','paypal'));

-- ── 5. RLS: consumidor solo ve su propio monedero ─────────────────────────────
ALTER TABLE consumer_wallet       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consumer_wallet_own" ON consumer_wallet
  FOR ALL USING (consumer_id = auth.uid());

CREATE POLICY "wallet_transactions_own" ON wallet_transactions
  FOR ALL USING (consumer_id = auth.uid());

-- ── 6. Actualizar metodos_pago_activos default en app_config ─────────────────
ALTER TABLE app_config
  ALTER COLUMN metodos_pago_activos
  SET DEFAULT '{"efectivo":true,"tarjeta":true,"transferencia":true,"paypal":false,"waitless_creditos":true}';
