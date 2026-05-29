-- =============================================================================
-- DB-2 / SEC-3 — Tabla de idempotencia de eventos Stripe
-- =============================================================================
-- El webhook de Stripe (app/api/payments/webhook) inserta cada event.id aquí
-- para procesar cada evento exactamente una vez. La tabla no estaba versionada
-- y faltaba en el esquema, por lo que la idempotencia fallaba en silencio y los
-- reintentos de Stripe re-acreditaban recargas (doble acreditación).
--
-- La PRIMARY KEY sobre event_id provoca el error 23505 en duplicados, que el
-- webhook usa para saltear eventos ya procesados.
-- =============================================================================

CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id   text        PRIMARY KEY,
  event_type text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
