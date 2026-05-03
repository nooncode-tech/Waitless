-- ─── Módulo: Consumidores / Reseñas ─────────────────────────────────────────
-- Ejecutar en Supabase SQL Editor

-- 1. Perfiles de consumidores (plataforma, no por tenant)
CREATE TABLE IF NOT EXISTS consumer_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  apellido    text,
  email       text NOT NULL,
  telefono    text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. Direcciones del consumidor
CREATE TABLE IF NOT EXISTS consumer_addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id  uuid NOT NULL REFERENCES consumer_profiles(id) ON DELETE CASCADE,
  alias        text NOT NULL DEFAULT 'Casa',
  direccion    text NOT NULL,
  ciudad       text,
  notas        text,
  is_default   boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- 3. Tarjetas guardadas (tokenizadas — sin número real)
CREATE TABLE IF NOT EXISTS consumer_saved_cards (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id              uuid NOT NULL REFERENCES consumer_profiles(id) ON DELETE CASCADE,
  alias                    text DEFAULT 'Mi tarjeta',
  brand                    text NOT NULL,  -- visa | mastercard | amex | other
  last4                    text NOT NULL,
  exp_month                int  NOT NULL,
  exp_year                 int  NOT NULL,
  stripe_payment_method_id text,
  is_default               boolean DEFAULT false,
  created_at               timestamptz DEFAULT now()
);

-- 4. Reseñas de restaurantes
CREATE TABLE IF NOT EXISTS restaurant_reviews (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consumer_id           uuid REFERENCES consumer_profiles(id) ON DELETE SET NULL,
  consumer_nombre       text NOT NULL,  -- snapshot al momento de publicar
  rating                int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  titulo                text,
  comentario            text NOT NULL,
  respuesta_restaurante text,
  respondido_at         timestamptz,
  visible               boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (tenant_id, consumer_id)  -- una reseña por consumidor por restaurante
);

-- RLS
ALTER TABLE consumer_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_addresses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_saved_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_reviews   ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
-- consumer_profiles: cada usuario ve y edita solo su perfil
CREATE POLICY "consumer_own_profile" ON consumer_profiles
  FOR ALL USING (auth.uid() = id);

-- consumer_addresses: cada consumidor maneja sus propias
CREATE POLICY "consumer_own_addresses" ON consumer_addresses
  FOR ALL USING (consumer_id = auth.uid());

-- consumer_saved_cards: idem
CREATE POLICY "consumer_own_cards" ON consumer_saved_cards
  FOR ALL USING (consumer_id = auth.uid());

-- restaurant_reviews: lectura pública, escritura solo del dueño
CREATE POLICY "reviews_public_read" ON restaurant_reviews
  FOR SELECT USING (visible = true);
CREATE POLICY "reviews_own_write" ON restaurant_reviews
  FOR INSERT WITH CHECK (consumer_id = auth.uid());
CREATE POLICY "reviews_own_delete" ON restaurant_reviews
  FOR DELETE USING (consumer_id = auth.uid());
