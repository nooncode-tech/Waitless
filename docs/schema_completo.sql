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
-- 8. TABLES_CONFIG (configuración física de mesas; tabla global por instancia)
-- ──────────────────────────────────────────────────────────────────────────────
-- El código consume `tables_config` (no `tables`). Es global: sin tenant_id.
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
-- 20. SHIFTS (cierre de turno / arqueo de caja)
-- ──────────────────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────────────────
-- 21. INVENTORY_ADJUSTMENTS (entradas/salidas/ajustes de stock)
-- ──────────────────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────────────────
-- 22. CONSUMER_PUSH_SUBSCRIPTIONS (Web Push del marketplace)
-- ──────────────────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────────────────
-- 23. SALES_NOTE_SEQS (contador atómico de nota de venta por tenant)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_note_seqs (
  tenant_id uuid PRIMARY KEY,
  last_seq  integer NOT NULL DEFAULT 0
);

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
ALTER TABLE tables_config    ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE shifts                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- El service_role siempre bypasea RLS (comportamiento de Supabase por defecto).
-- Las API routes usan service_role → no necesitan políticas explícitas.

-- Políticas para lectura pública (menú digital, explore)
CREATE POLICY "public_read_tenants"     ON tenants     FOR SELECT USING (activo = true);
-- app_config: solo staff autenticado lee la config de su propio tenant.
-- El branding/menú público se sirve vía rutas server con service_role (bypasea RLS).
CREATE POLICY "auth_read_own_app_config" ON app_config FOR SELECT
  USING (app_config.tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "public_read_categories"  ON categories  FOR SELECT USING (activa = true);
CREATE POLICY "public_read_menu_items"  ON menu_items  FOR SELECT USING (available = true AND mostrar_en_menu_digital = true);

-- Políticas para usuarios autenticados (panel admin — lectura de su propio tenant)
CREATE POLICY "auth_read_own_profile"   ON profiles    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "auth_read_tenant_data"   ON orders      FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "auth_read_sessions"      ON table_sessions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Inserción anónima (cliente QR): acotada a la sesión del header x-session-id
-- y a una sesión activa del mismo tenant. Nunca WITH CHECK (true).
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  WITH CHECK (
    orders.session_id IS NOT NULL
    AND orders.session_id::text = (current_setting('request.headers', true)::json ->> 'x-session-id')
    AND EXISTS (
      SELECT 1 FROM table_sessions s
      WHERE s.id = orders.session_id AND s.activa = true AND s.tenant_id = orders.tenant_id
    )
  );
CREATE POLICY "anon_insert_waiter_calls" ON waiter_calls FOR INSERT
  WITH CHECK (
    waiter_calls.session_id IS NOT NULL
    AND waiter_calls.session_id::text = (current_setting('request.headers', true)::json ->> 'x-session-id')
    AND EXISTS (
      SELECT 1 FROM table_sessions s
      WHERE s.id = waiter_calls.session_id AND s.activa = true AND s.tenant_id = waiter_calls.tenant_id
    )
  );
CREATE POLICY "anon_insert_feedback" ON feedback FOR INSERT
  WITH CHECK (
    feedback.session_id IS NOT NULL
    AND feedback.session_id::text = (current_setting('request.headers', true)::json ->> 'x-session-id')
    AND EXISTS (
      SELECT 1 FROM table_sessions s
      WHERE s.id = feedback.session_id AND s.tenant_id = feedback.tenant_id
    )
  );
CREATE POLICY "anon_read_qr_tokens"       ON qr_tokens    FOR SELECT USING (activo = true);

-- tables_config: layout no sensible → lectura pública; escritura solo staff.
CREATE POLICY "public_read_tables_config" ON tables_config FOR SELECT USING (true);
CREATE POLICY "auth_write_tables_config"  ON tables_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- shifts / inventory_adjustments: solo staff autenticado.
CREATE POLICY "auth_all_shifts" ON shifts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_inventory_adjustments" ON inventory_adjustments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- consumer_push_subscriptions: sin política → solo service_role (bypassa RLS).

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
ALTER PUBLICATION supabase_realtime ADD TABLE tables_config;
ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;

-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCIONES / RPC
-- ──────────────────────────────────────────────────────────────────────────────
-- Las RPC de analítica las invoca el cliente `supabase` (staff autenticado).
-- Se declaran SECURITY DEFINER y filtran por el tenant del llamante
-- (auth.uid() -> profiles) para no depender de políticas SELECT por tabla.

-- DROP previo: si ya existen creadas a mano (a veces con defaults), CREATE OR
-- REPLACE no puede cambiar defaults ni el tipo de retorno → recrear limpio.
DROP FUNCTION IF EXISTS next_sales_note_seq(uuid);
DROP FUNCTION IF EXISTS deduct_ingredients_for_order(jsonb);
DROP FUNCTION IF EXISTS get_revenue_trend(integer);
DROP FUNCTION IF EXISTS get_feedback_summary(integer);
DROP FUNCTION IF EXISTS get_daily_kpis(date);

-- next_sales_note_seq — secuencia incremental atómica por tenant
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

-- deduct_ingredients_for_order — descuento atómico de stock con validación previa
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
  FOR d IN
    SELECT value FROM jsonb_array_elements(deductions) ORDER BY value->>'ingredient_id'
  LOOP
    v_ing_id   := d->>'ingredient_id';
    v_cantidad := COALESCE((d->>'cantidad')::numeric, 0);

    SELECT stock_actual, nombre INTO v_stock, v_nombre
    FROM ingredients WHERE id = v_ing_id FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF v_stock < v_cantidad THEN
      RETURN jsonb_build_object('success', false, 'failed_ingredient', v_nombre);
    END IF;
  END LOOP;

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

-- get_revenue_trend — tendencia de ventas por día (tenant actual)
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

-- get_feedback_summary — resumen de calificaciones (tenant actual)
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

-- get_daily_kpis — KPIs del día (tenant actual)
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
