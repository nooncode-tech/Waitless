-- Login por email real + base para verificación de email (Fase 1/2).
--
-- Contexto: Supabase Auth guarda un email SINTÉTICO (`slug@pqvv.local`) para el staff,
-- así que el email real del negocio no se almacenaba en ninguna parte consultable.
-- Para permitir login con email real (además del usuario) y, más adelante, verificación
-- de email por código, profiles necesita guardar el email real.
--
--  - email          : email real del negocio/usuario (case-insensitive único entre todos
--                     los que lo tengan; nulos permitidos para staff sin email).
--  - email_verified : marca de verificación propia (Fase 2). Default false.
--
-- Idempotente: columnas con IF NOT EXISTS, índice único con IF NOT EXISTS.

alter table public.profiles add column if not exists email          text;
alter table public.profiles add column if not exists email_verified boolean not null default false;

-- Único case-insensitive, ignorando nulos (varios staff pueden no tener email).
create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;
