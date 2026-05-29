-- =============================================================================
-- DB-1 / DB-2 — Tablas y RPCs faltantes (reproducibilidad de la base)
-- =============================================================================
-- La auditoría detectó que el código usa objetos que NO estaban versionados:
--   Tablas:  tables_config, shifts, inventory_adjustments,
--            consumer_push_subscriptions
--   RPCs:    get_revenue_trend, get_feedback_summary, get_daily_kpis,
--            deduct_ingredients_for_order, next_sales_note_seq
-- En producción existen creados a mano; esta migración los versiona para que
-- una instalación desde cero funcione. Todo es idempotente (IF NOT EXISTS /
-- OR REPLACE / DROP POLICY IF EXISTS), por lo que correrla sobre la base actual
-- es un no-op para lo que ya existe y solo agrega lo que falta.
--
-- Nota de diseño: las RPCs de analítica las invoca el cliente `supabase`
-- (staff autenticado). Como feedback no tiene política SELECT para staff y los
-- agregados deben acotarse al tenant del usuario, se declaran SECURITY DEFINER
-- y filtran explícitamente por el tenant del llamante (auth.uid() -> profiles).
-- =============================================================================

-- ── tables_config (layout físico de mesas; tabla global por instancia) ────────
-- El código usa `tables_config` (no `tables`). Misma forma que la tabla `tables`
-- del esquema; se versiona con el nombre real que consume la app.
CREATE TABLE IF NOT EXISTS tables_config (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  numero     integer NOT NULL,
  nombre     text,
  capacidad  integer NOT NULL DEFAULT 4,
  ubicacion  text,
  activa     boolean NOT NULL DEFAULT true,
  estado     text NOT NULL DEFAULT 'disponible'
              CHECK (estado IN ('disponible','ocupada','cuenta_pedida','limpieza','hold')),
  pos_x      numeric(8,2) DEFAULT 0,
  pos_y      numeric(8,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tables_config_numero_idx ON tables_config(numero);

-- ── shifts (cierre de turno / arqueo) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nombre        text,
  activo        boolean NOT NULL DEFAULT true,
  opened_at     timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  notas         text,
  total_ventas  numeric(10,2) NOT NULL DEFAULT 0,
  total_ordenes integer       NOT NULL DEFAULT 0,
  efectivo      numeric(10,2) NOT NULL DEFAULT 0,
  tarjeta       numeric(10,2) NOT NULL DEFAULT 0,
  propinas      numeric(10,2) NOT NULL DEFAULT 0,
  descuentos    numeric(10,2) NOT NULL DEFAULT 0,
  reembolsos    numeric(10,2) NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shifts_activo_idx ON shifts(activo, opened_at DESC);

-- ── inventory_adjustments (entradas/salidas/ajustes de stock) ─────────────────
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id     uuid REFERENCES tenants(id) ON DELETE CASCADE,
  ingredient_id text REFERENCES ingredients(id) ON DELETE CASCADE,
  tipo          text NOT NULL CHECK (tipo IN ('entrada','salida','ajuste')),
  cantidad      numeric(10,3) NOT NULL DEFAULT 0,
  motivo        text,
  user_id       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_adjustments_ingredient_idx ON inventory_adjustments(ingredient_id);

-- ── consumer_push_subscriptions (Web Push del marketplace) ────────────────────
-- Acceso exclusivo vía service_role (rutas server) → RLS habilitado sin política.
CREATE TABLE IF NOT EXISTS consumer_push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL UNIQUE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── sales_note_seqs (contador atómico de nota de venta por tenant) ────────────
-- Respalda next_sales_note_seq(); evita números duplicados bajo concurrencia.
CREATE TABLE IF NOT EXISTS sales_note_seqs (
  tenant_id uuid PRIMARY KEY,
  last_seq  integer NOT NULL DEFAULT 0
);

-- =============================================================================
-- RLS de las tablas nuevas (no-op si ya estaba habilitado)
-- =============================================================================
ALTER TABLE tables_config              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- tables_config: layout no sensible → lectura pública; escritura solo staff.
DROP POLICY IF EXISTS "public_read_tables_config" ON tables_config;
CREATE POLICY "public_read_tables_config" ON tables_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth_write_tables_config" ON tables_config;
CREATE POLICY "auth_write_tables_config" ON tables_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- shifts / inventory_adjustments: solo staff autenticado.
DROP POLICY IF EXISTS "auth_all_shifts" ON shifts;
CREATE POLICY "auth_all_shifts" ON shifts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_inventory_adjustments" ON inventory_adjustments;
CREATE POLICY "auth_all_inventory_adjustments" ON inventory_adjustments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- consumer_push_subscriptions: sin política → solo service_role (bypassa RLS).

-- =============================================================================
-- RPC: next_sales_note_seq — secuencia incremental atómica por tenant
-- =============================================================================
-- DROP previo: en producción estos RPCs ya existen creados a mano (a veces con
-- defaults en los parámetros), y CREATE OR REPLACE no puede cambiar defaults ni
-- el tipo de retorno. DROP IF EXISTS con la firma exacta los recrea limpios.
DROP FUNCTION IF EXISTS next_sales_note_seq(uuid);
CREATE OR REPLACE FUNCTION next_sales_note_seq(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seq integer;
  v_key uuid := COALESCE(p_tenant_id, '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  INSERT INTO sales_note_seqs (tenant_id, last_seq)
  VALUES (v_key, 1)
  ON CONFLICT (tenant_id) DO UPDATE SET last_seq = sales_note_seqs.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN v_seq;
END;
$$;

-- =============================================================================
-- RPC: deduct_ingredients_for_order — descuento atómico de stock
-- =============================================================================
-- Recibe un array jsonb: [{ ingredient_id, cantidad, motivo, user_id }, ...].
-- Bloquea las filas (FOR UPDATE) y valida stock suficiente ANTES de aplicar; si
-- algún ingrediente no alcanza, no toca nada y devuelve { success:false,
-- failed_ingredient }. Garantiza que dos cocinas no consuman el mismo stock.
DROP FUNCTION IF EXISTS deduct_ingredients_for_order(jsonb);
CREATE OR REPLACE FUNCTION deduct_ingredients_for_order(deductions jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d          jsonb;
  v_ing_id   text;
  v_cantidad numeric;
  v_motivo   text;
  v_user     text;
  v_stock    numeric;
  v_nombre   text;
BEGIN
  -- Fase 1: bloquear y validar (orden estable por id → evita deadlocks)
  FOR d IN
    SELECT value FROM jsonb_array_elements(deductions) ORDER BY value->>'ingredient_id'
  LOOP
    v_ing_id   := d->>'ingredient_id';
    v_cantidad := COALESCE((d->>'cantidad')::numeric, 0);

    SELECT stock_actual, nombre INTO v_stock, v_nombre
    FROM ingredients WHERE id = v_ing_id FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE; -- ítem sin ingrediente de stock asociado: no bloquea el pedido
    END IF;

    IF v_stock < v_cantidad THEN
      RETURN jsonb_build_object('success', false, 'failed_ingredient', v_nombre);
    END IF;
  END LOOP;

  -- Fase 2: aplicar deducciones + registrar ajuste
  FOR d IN SELECT value FROM jsonb_array_elements(deductions)
  LOOP
    v_ing_id   := d->>'ingredient_id';
    v_cantidad := COALESCE((d->>'cantidad')::numeric, 0);
    v_motivo   := d->>'motivo';
    v_user     := COALESCE(d->>'user_id', 'system');

    UPDATE ingredients
    SET stock_actual = stock_actual - v_cantidad
    WHERE id = v_ing_id AND stock_actual IS NOT NULL;

    IF FOUND THEN
      INSERT INTO inventory_adjustments (id, tenant_id, ingredient_id, tipo, cantidad, motivo, user_id)
      SELECT gen_random_uuid()::text, i.tenant_id, v_ing_id, 'salida', v_cantidad, v_motivo, v_user
      FROM ingredients i WHERE i.id = v_ing_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================================================
-- RPC: get_revenue_trend(p_days) — tendencia de ventas por día (tenant actual)
-- =============================================================================
DROP FUNCTION IF EXISTS get_revenue_trend(integer);
CREATE OR REPLACE FUNCTION get_revenue_trend(p_days integer)
RETURNS TABLE (
  fecha          text,
  total_ventas   numeric,
  total_sesiones bigint,
  total_ordenes  bigint,
  avg_ticket     numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_from   date := current_date - GREATEST(p_days - 1, 0);
BEGIN
  SELECT p.tenant_id INTO v_tenant FROM profiles p WHERE p.id = auth.uid();

  RETURN QUERY
  WITH dias AS (
    SELECT generate_series(v_from, current_date, interval '1 day')::date AS d
  ),
  sess AS (
    SELECT s.created_at::date AS d, s.id, s.total
    FROM table_sessions s
    WHERE s.tenant_id IS NOT DISTINCT FROM v_tenant
      AND s.payment_status = 'pagado'
      AND s.created_at::date >= v_from
  ),
  ord AS (
    SELECT o.created_at::date AS d, count(*) AS c
    FROM orders o
    WHERE o.tenant_id IS NOT DISTINCT FROM v_tenant
      AND o.cancelado = false
      AND o.created_at::date >= v_from
    GROUP BY 1
  )
  SELECT
    to_char(dias.d, 'YYYY-MM-DD'),
    COALESCE(sum(sess.total), 0)::numeric,
    count(DISTINCT sess.id)::bigint,
    COALESCE(max(ord.c), 0)::bigint,
    CASE WHEN count(DISTINCT sess.id) > 0
         THEN ROUND(COALESCE(sum(sess.total), 0) / count(DISTINCT sess.id), 2)
         ELSE 0 END
  FROM dias
  LEFT JOIN sess ON sess.d = dias.d
  LEFT JOIN ord  ON ord.d  = dias.d
  GROUP BY dias.d
  ORDER BY dias.d;
END;
$$;

-- =============================================================================
-- RPC: get_feedback_summary(p_days) — resumen de calificaciones (tenant actual)
-- =============================================================================
DROP FUNCTION IF EXISTS get_feedback_summary(integer);
CREATE OR REPLACE FUNCTION get_feedback_summary(p_days integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_result jsonb;
  v_from   date := current_date - GREATEST(p_days - 1, 0);
BEGIN
  SELECT p.tenant_id INTO v_tenant FROM profiles p WHERE p.id = auth.uid();

  SELECT jsonb_build_object(
    'total',      COUNT(*),
    'avg_rating', COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    'dist', jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE rating = 1),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '5', COUNT(*) FILTER (WHERE rating = 5)
    )
  ) INTO v_result
  FROM feedback
  WHERE tenant_id IS NOT DISTINCT FROM v_tenant
    AND created_at::date >= v_from;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- RPC: get_daily_kpis(p_fecha) — KPIs del día (tenant actual)
-- =============================================================================
DROP FUNCTION IF EXISTS get_daily_kpis(date);
CREATE OR REPLACE FUNCTION get_daily_kpis(p_fecha date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant         uuid;
  v_total_sesiones bigint;
  v_total_ventas   numeric;
  v_total_ordenes  bigint;
  v_canceladas     bigint;
  v_tiempo         numeric;
  v_mesas          bigint;
  v_top            jsonb;
BEGIN
  SELECT p.tenant_id INTO v_tenant FROM profiles p WHERE p.id = auth.uid();

  SELECT COUNT(*), COALESCE(SUM(total), 0)
  INTO v_total_sesiones, v_total_ventas
  FROM table_sessions
  WHERE tenant_id IS NOT DISTINCT FROM v_tenant
    AND payment_status = 'pagado'
    AND created_at::date = p_fecha;

  SELECT
    COUNT(*) FILTER (WHERE cancelado = false),
    COUNT(*) FILTER (WHERE cancelado = true),
    COALESCE(AVG(EXTRACT(EPOCH FROM (tiempo_fin_preparacion - tiempo_inicio_preparacion)) / 60)
             FILTER (WHERE tiempo_fin_preparacion IS NOT NULL
                       AND tiempo_inicio_preparacion IS NOT NULL), 0)
  INTO v_total_ordenes, v_canceladas, v_tiempo
  FROM orders
  WHERE tenant_id IS NOT DISTINCT FROM v_tenant
    AND created_at::date = p_fecha;

  SELECT COUNT(*) INTO v_mesas FROM tables_config WHERE activa = true;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.total_revenue DESC), '[]'::jsonb)
  INTO v_top
  FROM (
    SELECT
      elem->'menuItem'->>'id'     AS menu_item_id,
      elem->'menuItem'->>'nombre' AS nombre,
      SUM(COALESCE((elem->>'cantidad')::numeric, 1)) AS total_cantidad,
      SUM(COALESCE((elem->>'cantidad')::numeric, 1)
          * COALESCE((elem->'menuItem'->>'precio')::numeric, 0)) AS total_revenue
    FROM orders o, jsonb_array_elements(o.items) AS elem
    WHERE o.tenant_id IS NOT DISTINCT FROM v_tenant
      AND o.cancelado = false
      AND o.created_at::date = p_fecha
      AND elem->'menuItem'->>'id' IS NOT NULL
    GROUP BY 1, 2
    ORDER BY total_revenue DESC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'fecha',               to_char(p_fecha, 'YYYY-MM-DD'),
    'ticket_promedio',     CASE WHEN v_total_sesiones > 0
                                THEN ROUND(v_total_ventas / v_total_sesiones, 2) ELSE 0 END,
    'total_sesiones',      v_total_sesiones,
    'total_ventas',        v_total_ventas,
    'total_ordenes',       v_total_ordenes,
    'canceladas',          v_canceladas,
    'tasa_cancelacion',    CASE WHEN (v_total_ordenes + v_canceladas) > 0
                                THEN ROUND(v_canceladas::numeric / (v_total_ordenes + v_canceladas) * 100, 1)
                                ELSE 0 END,
    'tiempo_atencion_min', ROUND(v_tiempo, 1),
    'ocupacion_rate',      CASE WHEN v_mesas > 0
                                THEN ROUND(v_total_sesiones::numeric / v_mesas * 100, 1) ELSE 0 END,
    'top_items',           v_top
  );
END;
$$;

-- =============================================================================
-- Realtime: tables_config (la app se suscribe a cambios de mesas)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tables_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tables_config;
  END IF;
END;
$$;
