-- =============================================================================
-- QR de mesas — policy de escritura para staff autenticado en qr_tokens
-- =============================================================================
-- Problema:
--   qr_tokens tiene RLS habilitado pero su ÚNICA policy es de lectura:
--     "anon_read_qr_tokens"  FOR SELECT USING (activo = true)
--   No existe ninguna policy de INSERT/UPDATE/DELETE. Como la generación de QR
--   (lib/context/useQRActions.ts → generateTableQR / invalidateTableQR) escribe
--   directo desde el cliente del navegador (staff autenticado), el INSERT/UPDATE
--   era rechazado por RLS (error 42501) → el botón "Generar QR" "no hacía nada".
--
-- Síntoma observable:
--   POST /rest/v1/qr_tokens devolvía 401/403 con
--   "new row violates row-level security policy for table qr_tokens".
--
-- Fix:
--   Agregar policy de escritura para `authenticated`, igual que las tablas
--   operativas que ya gestiona el staff desde el cliente:
--     auth_write_tables_config / auth_all_shifts / auth_all_inventory_adjustments
--   (todas FOR ALL TO authenticated USING (true) WITH CHECK (true)).
--   El aislamiento multi-tenant de qr_tokens se mantiene en el código (las queries
--   se acotan por tenant_id) y en la validación server-side al escanear
--   (app/api/qr/validate, con service_role + x-tenant-slug). La lectura pública
--   sigue acotada por la policy anon_read_qr_tokens (activo = true).
--
-- Idempotente: DROP IF EXISTS previo.
-- =============================================================================

DROP POLICY IF EXISTS "auth_write_qr_tokens" ON qr_tokens;
CREATE POLICY "auth_write_qr_tokens" ON qr_tokens FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
