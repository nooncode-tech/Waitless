-- =============================================================================
-- SEC-1 / DB-3 — Endurecer RLS para el rol anónimo (cliente QR)
-- =============================================================================
-- Problema (esquema previo):
--   anon_insert_orders / anon_insert_waiter_calls / anon_insert_feedback
--     WITH CHECK (true)  → el cliente anónimo podía insertar en CUALQUIER tenant,
--     con cualquier session_id, saltándose el aislamiento multi-tenant.
--   public_read_app_config USING (true) → la config de TODOS los tenants era
--     legible públicamente.
--
-- Diseño real verificado en el código:
--   - El cliente QR escribe vía el "session client" anón, que envía el header
--     x-session-id (lib/supabase.ts → getSessionClient). El INSERT debe quedar
--     acotado a ESA sesión y debe ser una sesión activa.
--   - app_config solo se lee con el cliente anón en el flujo de staff AUTENTICADO
--     (lib/context.tsx, scoped por tenant). El menú/branding público se sirve
--     vía rutas server con service_role (que bypasea RLS), así que NO depende de
--     una política de lectura pública.
--
-- Supabase expone los headers del request en Postgres mediante
--   current_setting('request.headers', true)::json ->> 'x-session-id'
-- Cuando el header no está presente, la comparación da NULL → la política
-- rechaza el INSERT (fail-closed).
--
-- NOTA: el cálculo del total de la orden sigue siendo responsabilidad del
-- código; RLS no puede recalcularlo. Mover la creación de órdenes anón a una
-- ruta server con service_role (que recalcule el total) queda como follow-up.
-- =============================================================================

-- ── orders ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  WITH CHECK (
    orders.session_id IS NOT NULL
    AND orders.session_id::text = (current_setting('request.headers', true)::json ->> 'x-session-id')
    AND EXISTS (
      SELECT 1 FROM table_sessions s
      WHERE s.id = orders.session_id
        AND s.activa = true
        AND s.tenant_id = orders.tenant_id
    )
  );

-- ── waiter_calls ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_insert_waiter_calls" ON waiter_calls;
CREATE POLICY "anon_insert_waiter_calls" ON waiter_calls FOR INSERT
  WITH CHECK (
    waiter_calls.session_id IS NOT NULL
    AND waiter_calls.session_id::text = (current_setting('request.headers', true)::json ->> 'x-session-id')
    AND EXISTS (
      SELECT 1 FROM table_sessions s
      WHERE s.id = waiter_calls.session_id
        AND s.activa = true
        AND s.tenant_id = waiter_calls.tenant_id
    )
  );

-- ── feedback ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_insert_feedback" ON feedback;
CREATE POLICY "anon_insert_feedback" ON feedback FOR INSERT
  WITH CHECK (
    feedback.session_id IS NOT NULL
    AND feedback.session_id::text = (current_setting('request.headers', true)::json ->> 'x-session-id')
    AND EXISTS (
      SELECT 1 FROM table_sessions s
      WHERE s.id = feedback.session_id
        AND s.tenant_id = feedback.tenant_id
    )
  );

-- ── app_config: quitar lectura pública total, acotar a staff del propio tenant ─
DROP POLICY IF EXISTS "public_read_app_config" ON app_config;
CREATE POLICY "auth_read_own_app_config" ON app_config FOR SELECT
  USING (
    app_config.tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
  );
