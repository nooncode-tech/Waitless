-- Migration: whatsapp_numero en app_config + canal menu_digital en orders
-- Ejecutar en: Supabase Dashboard → SQL Editor

ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS whatsapp_numero text;

-- Permite el canal 'menu_digital' en la columna canal de orders
-- (Si la columna tiene un CHECK constraint, agregar el valor nuevo)
-- Si NO hay constraint, esta línea no es necesaria:
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_canal_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_canal_check
--   CHECK (canal IN ('mesa','mesero','para_llevar','delivery','menu_digital'));
