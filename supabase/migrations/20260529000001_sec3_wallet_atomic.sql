-- =============================================================================
-- SEC-3 — Mutación atómica del saldo del monedero (wallet)
-- =============================================================================
-- Problema: las rutas de crédito/débito del monedero leían el saldo y luego lo
-- escribían (read-modify-write). Bajo concurrencia esto causa:
--   - Doble gasto en pagos (dos requests descuentan una sola vez).
--   - Lost-update en reembolsos/recargas (dos créditos, uno se pierde).
--
-- Solución: un UPDATE atómico (con lock de fila) que aplica un delta y rechaza
-- la operación si dejaría un saldo negativo. Deltas positivos acreditan; deltas
-- negativos debitan.
--
-- Devuelve los saldos resultantes, o NINGUNA fila si la operación dejaría un
-- saldo negativo (saldo insuficiente / conflicto de concurrencia).
--
-- IMPORTANTE: ejecutar esta migración en Supabase ANTES de deployar el código
-- que la invoca, o las rutas de monedero fallarán.
-- =============================================================================

CREATE OR REPLACE FUNCTION wallet_apply_delta(
  p_consumer_id   uuid,
  p_cash_delta    integer,
  p_rewards_delta integer
)
RETURNS TABLE (balance_cash_cents integer, balance_rewards_cents integer)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Garantiza la existencia de la fila sin pisar saldos ya existentes.
  INSERT INTO consumer_wallet (consumer_id)
  VALUES (p_consumer_id)
  ON CONFLICT (consumer_id) DO NOTHING;

  -- UPDATE atómico: el lock de fila evita lost-update y doble gasto.
  -- Si el resultado dejaría un saldo negativo, no actualiza y no devuelve filas.
  RETURN QUERY
    UPDATE consumer_wallet w
    SET balance_cash_cents    = w.balance_cash_cents    + p_cash_delta,
        balance_rewards_cents = w.balance_rewards_cents + p_rewards_delta
    WHERE w.consumer_id = p_consumer_id
      AND w.balance_cash_cents    + p_cash_delta    >= 0
      AND w.balance_rewards_cents + p_rewards_delta >= 0
    RETURNING w.balance_cash_cents, w.balance_rewards_cents;
END;
$$;
