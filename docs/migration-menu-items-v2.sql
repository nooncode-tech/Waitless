-- Migration: menu_items v2 — fotos múltiples, identificador, colores, stock directo, menú digital
-- Ejecutar en: Supabase Dashboard → SQL Editor

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS imagenes              text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS identificador         text,
  ADD COLUMN IF NOT EXISTS color_fondo           text,
  ADD COLUMN IF NOT EXISTS color_borde           text,
  ADD COLUMN IF NOT EXISTS stock_habilitado      boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_cantidad        integer  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mostrar_en_menu_digital boolean DEFAULT true;

-- Índice único: un identificador no se repite dentro del mismo tenant
CREATE UNIQUE INDEX IF NOT EXISTS menu_items_identificador_tenant_idx
  ON menu_items (tenant_id, identificador)
  WHERE identificador IS NOT NULL;

-- Poblar imagenes[] con la imagen principal existente (para ítems ya creados)
UPDATE menu_items
SET imagenes = ARRAY[image]
WHERE image IS NOT NULL
  AND (imagenes IS NULL OR imagenes = '{}');
