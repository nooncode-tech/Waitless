-- ============================================================
-- Waitless — Módulo de pagos, comprobantes y notas de venta
-- Ejecutar en Supabase SQL Editor del proyecto Waitless DB
-- ============================================================

-- 1. Métodos de pago configurables por tenant
CREATE TABLE IF NOT EXISTS payment_methods (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nombre                   text NOT NULL,
  tipo                     text NOT NULL CHECK (tipo IN ('efectivo','pago_movil','transferencia','zelle','paypal','punto_venta','otro')),
  moneda                   text NOT NULL DEFAULT 'USD',
  instrucciones            text,
  datos_pago               jsonb DEFAULT '{}',
  -- Campos comunes en datos_pago: banco, telefono, cuenta, titular, email, referencia
  requiere_comprobante     boolean NOT NULL DEFAULT true,
  requiere_validacion_manual boolean NOT NULL DEFAULT true,
  activo                   boolean NOT NULL DEFAULT true,
  orden                    int NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_activo ON payment_methods(tenant_id, activo);

-- 2. Registros de pago vinculados a table_sessions
CREATE TABLE IF NOT EXISTS payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid REFERENCES tenants(id) ON DELETE CASCADE,
  session_id          uuid REFERENCES table_sessions(id) ON DELETE CASCADE,
  payment_method_id   uuid REFERENCES payment_methods(id),
  monto_requerido     numeric(10,2) NOT NULL,
  monto_declarado     numeric(10,2),
  moneda              text NOT NULL DEFAULT 'USD',
  status              text NOT NULL DEFAULT 'PENDIENTE_DE_PAGO'
                        CHECK (status IN (
                          'PENDIENTE_DE_PAGO','COMPROBANTE_CARGADO','EN_REVISION',
                          'PAGO_VALIDADO','PAGO_RECHAZADO','PAGO_PARCIAL',
                          'CORRECCION_SOLICITADA','ANULADO'
                        )),
  motivo_rechazo      text,
  notas_internas      text,
  created_by          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(tenant_id, status);

-- 3. Comprobantes de pago (un payment puede tener múltiples intentos)
CREATE TABLE IF NOT EXISTS payment_receipts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  tenant_id        uuid REFERENCES tenants(id) ON DELETE CASCADE,
  file_url         text,
  file_type        text CHECK (file_type IN ('imagen','pdf','referencia')),
  referencia       text,
  monto_declarado  numeric(10,2),
  moneda           text DEFAULT 'USD',
  uploaded_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_status    text NOT NULL DEFAULT 'pendiente'
                     CHECK (review_status IN ('pendiente','aprobado','rechazado')),
  reviewed_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes     text,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment ON payment_receipts(payment_id);

-- 4. Notas de venta internas (generadas al aprobar el pago)
CREATE TABLE IF NOT EXISTS internal_sales_notes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_interno          text UNIQUE NOT NULL,
  tenant_id               uuid REFERENCES tenants(id) ON DELETE CASCADE,
  session_id              uuid REFERENCES table_sessions(id) ON DELETE SET NULL,
  payment_id              uuid REFERENCES payments(id) ON DELETE SET NULL,
  status                  text NOT NULL DEFAULT 'EMITIDA_INTERNAMENTE'
                            CHECK (status IN (
                              'BORRADOR','EMITIDA_INTERNAMENTE','ANULADA','CORREGIDA','EXPORTADA'
                            )),
  subtotal                numeric(10,2) NOT NULL,
  descuentos_total        numeric(10,2) NOT NULL DEFAULT 0,
  impuestos_total         numeric(10,2) NOT NULL DEFAULT 0,
  total                   numeric(10,2) NOT NULL,
  moneda                  text NOT NULL DEFAULT 'USD',
  snapshot_items          jsonb NOT NULL DEFAULT '[]',
  generated_by            uuid REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at            timestamptz NOT NULL DEFAULT now(),
  voided_by               uuid REFERENCES profiles(id) ON DELETE SET NULL,
  voided_at               timestamptz,
  void_reason             text,
  corrected_from_note_id  uuid REFERENCES internal_sales_notes(id),
  exported_at             timestamptz
);

CREATE INDEX IF NOT EXISTS idx_internal_sales_notes_tenant ON internal_sales_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_internal_sales_notes_session ON internal_sales_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_internal_sales_notes_status ON internal_sales_notes(tenant_id, status);

-- RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_sales_notes ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para service_role (las APIs usan supabaseAdmin)
CREATE POLICY "service_role full access payment_methods"
  ON payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access payments"
  ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access payment_receipts"
  ON payment_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access internal_sales_notes"
  ON internal_sales_notes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Lectura pública de payment_methods activos (para cliente QR sin auth)
CREATE POLICY "anon read active payment_methods"
  ON payment_methods FOR SELECT TO anon
  USING (activo = true);

-- Trigger updated_at en payments
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_payments_updated_at();
