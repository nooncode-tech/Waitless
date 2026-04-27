-- =============================================================================
-- WAITLESS V10 — Schema completo
-- Generado: 2026-04-26
-- Ejecutar en: Supabase Dashboard → SQL Editor (proyecto DESTINO)
-- Orden de ejecución: correr todo el archivo de una sola vez.
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- EXTENSIONES
-- ──────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────────────
-- HELPER: updated_at automático
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. TENANTS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text UNIQUE NOT NULL,
  nombre     text NOT NULL,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. PROFILES (extiende auth.users)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text UNIQUE NOT NULL,
  nombre     text NOT NULL,
  role       text NOT NULL CHECK (role IN ('admin','manager','mesero','cocina')),
  activo     boolean NOT NULL DEFAULT true,
  tenant_id  uuid REFERENCES tenants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_tenant_idx ON profiles(tenant_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. APP_CONFIG
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  id                               text PRIMARY KEY DEFAULT 'default',
  tenant_id                        uuid UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  restaurant_name                  text,
  logo_url                         text,
  cover_url                        text,
  descripcion                      text,
  primary_color                    text DEFAULT '#000000',
  secondary_color                  text,
  accent_color                     text DEFAULT '#BEBEBE',
  font_family                      text,
  powered_by_waitless              boolean DEFAULT true,
  whatsapp_numero                  text,
  impuesto_porcentaje              numeric(5,2) DEFAULT 0,
  propina_sugerida_porcentaje      numeric(5,2) DEFAULT 10,
  tiempo_expiracion_sesion_minutos integer DEFAULT 120,
  pacing_max_preparando            integer DEFAULT 10,
  zonas_reparto                    jsonb DEFAULT '[]',
  horarios_operacion               jsonb DEFAULT '[]',
  metodos_pago_activos             jsonb DEFAULT '{"efectivo":true,"tarjeta":true,"transferencia":true}',
  sonido_nuevos_pedidos            boolean DEFAULT true,
  notificaciones_stock_bajo        boolean DEFAULT true,
  google_review_url                text,
  tienda_abierta                   boolean DEFAULT true,
  tienda_visible                   boolean DEFAULT true,
  auto_horario_apertura            text,    -- HH:MM
  auto_horario_cierre              text,    -- HH:MM
  created_at                       timestamptz NOT NULL DEFAULT now(),
  updated_at                       timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. CATEGORIES
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id  uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  orden      integer NOT NULL DEFAULT 0,
  activa     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS categories_tenant_idx ON categories(tenant_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. MENU_ITEMS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id                      text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id               uuid REFERENCES tenants(id) ON DELETE CASCADE,
  category_id             text REFERENCES categories(id) ON DELETE SET NULL,
  name                    text NOT NULL,
  description             text DEFAULT '',
  price                   numeric(10,2) NOT NULL DEFAULT 0,
  image                   text,
  imagenes                text[] DEFAULT '{}',
  identificador           text,
  color_fondo             text,
  color_borde             text,
  available               boolean NOT NULL DEFAULT true,
  stock_habilitado        boolean NOT NULL DEFAULT false,
  stock_cantidad          integer NOT NULL DEFAULT 0,
  mostrar_en_menu_digital boolean NOT NULL DEFAULT true,
  extras                  jsonb DEFAULT '[]',
  receta                  jsonb DEFAULT '[]',
  orden                   integer NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS menu_items_identificador_tenant_idx
  ON menu_items(tenant_id, identificador)
  WHERE identificador IS NOT NULL;
CREATE INDEX IF NOT EXISTS menu_items_tenant_idx ON menu_items(tenant_id);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items(category_id);
CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. INGREDIENTS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingredients (
  id               text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id        uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nombre           text NOT NULL,
  categoria        text,
  unidad           text NOT NULL DEFAULT 'unidad'
                    CHECK (unidad IN ('kg','g','l','ml','unidad','porcion')),
  stock_actual     numeric(10,3) NOT NULL DEFAULT 0,
  stock_minimo     numeric(10,3) NOT NULL DEFAULT 0,
  cantidad_maxima  numeric(10,3),
  costo_unitario   numeric(10,2) DEFAULT 0,
  activo           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ingredients_tenant_idx ON ingredients(tenant_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. TABLE_SESSIONS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS table_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE,
  mesa            integer NOT NULL,
  activa          boolean NOT NULL DEFAULT true,
  device_id       text,
  bill_status     text NOT NULL DEFAULT 'abierta'
                   CHECK (bill_status IN ('abierta','en_pago','pagada','cerrada','liberada')),
  subtotal        numeric(10,2) NOT NULL DEFAULT 0,
  impuestos       numeric(10,2) NOT NULL DEFAULT 0,
  propina         numeric(10,2) NOT NULL DEFAULT 0,
  descuento       numeric(10,2) NOT NULL DEFAULT 0,
  descuento_motivo text,
  total           numeric(10,2) NOT NULL DEFAULT 0,
  monto_abonado   numeric(10,2) NOT NULL DEFAULT 0,
  payment_method  text CHECK (payment_method IN ('tarjeta','efectivo','transferencia','apple_pay')),
  payment_status  text NOT NULL DEFAULT 'pendiente'
                   CHECK (payment_status IN ('pendiente','parcial','pagado','reembolsado')),
  paid_at         timestamptz,
  receipt_id      text,
  feedback_done   boolean NOT NULL DEFAULT false,
  version         integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz
);
CREATE INDEX IF NOT EXISTS table_sessions_tenant_idx ON table_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS table_sessions_mesa_idx   ON table_sessions(tenant_id, mesa) WHERE activa = true;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. TABLES (configuración física de mesas)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tables (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id  uuid REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE UNIQUE INDEX IF NOT EXISTS tables_tenant_numero_idx ON tables(tenant_id, numero);
CREATE INDEX  IF NOT EXISTS tables_tenant_idx ON tables(tenant_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. ORDERS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid REFERENCES tenants(id) ON DELETE CASCADE,
  numero                    integer NOT NULL,
  canal                     text NOT NULL DEFAULT 'mesa'
                             CHECK (canal IN ('mesa','mesero','para_llevar','delivery','menu_digital')),
  mesa                      integer,
  session_id                uuid REFERENCES table_sessions(id) ON DELETE SET NULL,
  seat_number               integer,
  items                     jsonb NOT NULL DEFAULT '[]',
  status                    text NOT NULL DEFAULT 'recibido'
                             CHECK (status IN ('recibido','preparando','listo','empacado','en_camino','entregado','cancelado')),
  cocina_a_status           text DEFAULT 'en_cola'
                             CHECK (cocina_a_status IN ('en_cola','preparando','listo')),
  nombre_cliente            text,
  telefono                  text,
  notas                     text,
  direccion                 text,
  zona_reparto              text,
  repartidor_id             uuid,
  cancelado                 boolean NOT NULL DEFAULT false,
  cancel_reason             text
                             CHECK (cancel_reason IN ('cliente_solicito','sin_ingredientes','error_pedido','tiempo_excedido','otro')),
  cancel_motivo             text,
  cancelado_por             text,
  cancelado_at              timestamptz,
  tiempo_inicio_preparacion timestamptz,
  tiempo_fin_preparacion    timestamptz,
  confirmed_at              timestamptz,
  kitchen_received_at       timestamptz,
  is_qr_order               boolean NOT NULL DEFAULT false,
  subtotal                  numeric(10,2) NOT NULL DEFAULT 0,
  total                     numeric(10,2) NOT NULL DEFAULT 0,
  impuestos                 numeric(10,2) NOT NULL DEFAULT 0,
  propina                   numeric(10,2) NOT NULL DEFAULT 0,
  payment_status            text DEFAULT 'pendiente'
                             CHECK (payment_status IN ('pendiente','parcial','pagado','reembolsado')),
  payment_method            text
                             CHECK (payment_method IN ('tarjeta','efectivo','transferencia','apple_pay')),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_tenant_idx     ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS orders_session_idx    ON orders(session_id);
CREATE INDEX IF NOT EXISTS orders_status_idx     ON orders(tenant_id, status) WHERE cancelado = false;
CREATE INDEX IF NOT EXISTS orders_created_idx    ON orders(tenant_id, created_at DESC);
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Secuencia de número de orden por tenant
CREATE OR REPLACE FUNCTION next_order_numero(p_tenant_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_next integer;
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_next
  FROM orders
  WHERE tenant_id = p_tenant_id OR (p_tenant_id IS NULL AND tenant_id IS NULL);
  RETURN v_next;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 10. WAITER_CALLS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waiter_calls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid REFERENCES tenants(id) ON DELETE CASCADE,
  mesa         integer NOT NULL,
  session_id   uuid REFERENCES table_sessions(id) ON DELETE CASCADE,
  tipo         text NOT NULL DEFAULT 'atencion'
                CHECK (tipo IN ('atencion','cuenta','otro')),
  mensaje      text,
  atendido     boolean NOT NULL DEFAULT false,
  atendido_por text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  atendido_at  timestamptz
);
CREATE INDEX IF NOT EXISTS waiter_calls_tenant_idx    ON waiter_calls(tenant_id);
CREATE INDEX IF NOT EXISTS waiter_calls_session_idx   ON waiter_calls(session_id);
CREATE INDEX IF NOT EXISTS waiter_calls_pending_idx   ON waiter_calls(tenant_id) WHERE atendido = false;

-- ──────────────────────────────────────────────────────────────────────────────
-- 11. REFUNDS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid REFERENCES tenants(id) ON DELETE CASCADE,
  order_id             uuid REFERENCES orders(id) ON DELETE CASCADE,
  session_id           uuid REFERENCES table_sessions(id) ON DELETE SET NULL,
  monto                numeric(10,2) NOT NULL,
  motivo               text NOT NULL,
  tipo                 text NOT NULL CHECK (tipo IN ('total','parcial')),
  status               text NOT NULL DEFAULT 'aprobado'
                        CHECK (status IN ('pendiente','aprobado','rechazado')),
  items_reembolsados   jsonb,
  inventario_revertido boolean NOT NULL DEFAULT false,
  user_id              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refunds_tenant_idx  ON refunds(tenant_id);
CREATE INDEX IF NOT EXISTS refunds_order_idx   ON refunds(order_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 12. AUDIT_LOGS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  accion     text NOT NULL,
  entidad    text,
  entidad_id text,
  detalles   text,
  razon      text,
  antes      jsonb,
  despues    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_idx ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(tenant_id, created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- 13. FEEDBACK
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
  session_id  uuid REFERENCES table_sessions(id) ON DELETE SET NULL,
  mesa        integer NOT NULL DEFAULT 0,
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comentario  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_tenant_idx ON feedback(tenant_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 14. QR_TOKENS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid REFERENCES tenants(id) ON DELETE CASCADE,
  mesa       integer NOT NULL,
  token      text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  session_id uuid REFERENCES table_sessions(id) ON DELETE SET NULL,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  used_at    timestamptz
);
CREATE INDEX IF NOT EXISTS qr_tokens_tenant_idx ON qr_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS qr_tokens_token_idx  ON qr_tokens(token) WHERE activo = true;

-- ──────────────────────────────────────────────────────────────────────────────
-- 15. WAITLIST
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nombre         text NOT NULL,
  telefono       text,
  personas       integer NOT NULL DEFAULT 1,
  notas          text,
  estado         text NOT NULL DEFAULT 'esperando'
                  CHECK (estado IN ('esperando','asignada','cancelada','expirada')),
  mesa_asignada  integer,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz
);
CREATE INDEX IF NOT EXISTS waitlist_tenant_idx ON waitlist(tenant_id);
CREATE TRIGGER waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 16. REWARDS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id    uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  tipo         text NOT NULL CHECK (tipo IN ('porcentaje','monto_fijo')),
  valor        numeric(10,2) NOT NULL,
  usos_maximos integer,
  activo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rewards_tenant_idx ON rewards(tenant_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 17. APPLIED_REWARDS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applied_rewards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid REFERENCES tenants(id) ON DELETE CASCADE,
  session_id uuid REFERENCES table_sessions(id) ON DELETE CASCADE,
  reward_id  text REFERENCES rewards(id) ON DELETE CASCADE,
  descuento  numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS applied_rewards_session_idx ON applied_rewards(session_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 18. PUSH_SUBSCRIPTIONS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint     text NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions(endpoint);

-- ──────────────────────────────────────────────────────────────────────────────
-- 19. CLIENTES (registro de clientes frecuentes)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid REFERENCES tenants(id) ON DELETE CASCADE,
  telefono   text NOT NULL,
  nombre     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, telefono)
);
CREATE INDEX IF NOT EXISTS clientes_tenant_idx ON clientes(tenant_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────────────────

-- Habilitar RLS en todas las tablas
ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_calls     ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE applied_rewards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes         ENABLE ROW LEVEL SECURITY;

-- El service_role siempre bypasea RLS (comportamiento de Supabase por defecto).
-- Las API routes usan service_role → no necesitan políticas explícitas.

-- Políticas para lectura pública (menú digital, explore)
CREATE POLICY "public_read_tenants"     ON tenants     FOR SELECT USING (activo = true);
CREATE POLICY "public_read_app_config"  ON app_config  FOR SELECT USING (true);
CREATE POLICY "public_read_categories"  ON categories  FOR SELECT USING (activa = true);
CREATE POLICY "public_read_menu_items"  ON menu_items  FOR SELECT USING (available = true AND mostrar_en_menu_digital = true);

-- Políticas para usuarios autenticados (panel admin — lectura de su propio tenant)
CREATE POLICY "auth_read_own_profile"   ON profiles    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "auth_read_tenant_data"   ON orders      FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "auth_read_sessions"      ON table_sessions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Inserción anónima de órdenes y llamadas al mesero (menú digital público)
CREATE POLICY "anon_insert_orders"        ON orders       FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_waiter_calls"  ON waiter_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_feedback"      ON feedback     FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_read_qr_tokens"       ON qr_tokens    FOR SELECT USING (activo = true);

-- ──────────────────────────────────────────────────────────────────────────────
-- REALTIME (habilitar publicación de cambios)
-- ──────────────────────────────────────────────────────────────────────────────
-- Ejecutar en SQL Editor — habilita realtime en las tablas que lo necesitan
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;

-- ──────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- ──────────────────────────────────────────────────────────────────────────────
-- Ejecutar DESPUÉS del schema, desde el SQL Editor:

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('menu-images',  'menu-images',  true),
  ('logos',        'logos',        true),
  ('covers',       'covers',       true)
ON CONFLICT (id) DO NOTHING;

-- Política pública de lectura para los buckets de imágenes
CREATE POLICY "public_read_menu_images" ON storage.objects
  FOR SELECT USING (bucket_id IN ('menu-images','logos','covers'));

CREATE POLICY "auth_upload_images" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND bucket_id IN ('menu-images','logos','covers')
  );

CREATE POLICY "auth_delete_images" ON storage.objects
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND bucket_id IN ('menu-images','logos','covers')
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- FIN DEL SCHEMA
-- ──────────────────────────────────────────────────────────────────────────────
