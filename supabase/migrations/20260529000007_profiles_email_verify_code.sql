-- 20260529000007_profiles_email_verify_code.sql
-- Verificación de email para cuentas de staff/admin.
-- Agrega las columnas que guardan el código de verificación de 6 dígitos,
-- su vencimiento y un contador de intentos para limitar fuerza bruta.
-- Idempotente: se puede correr varias veces sin error.
--
-- NOTA: el gate de login (lib/context/auth.ts) solo bloquea cuentas con
-- profiles.email NO NULO y email_verified = false. Las cuentas existentes
-- (email NULL) y el staff sin email NO quedan bloqueados → no hace falta backfill.

alter table public.profiles add column if not exists email_verify_code    text;
alter table public.profiles add column if not exists email_verify_expires  timestamptz;
alter table public.profiles add column if not exists email_verify_attempts integer not null default 0;
