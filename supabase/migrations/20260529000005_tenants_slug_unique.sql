-- Garantiza slug ÚNICO a nivel base de datos (no solo por código).
--
-- Contexto: app/api/registro/route.ts valida el slug por código antes de insertar,
-- pero ese chequeo tiene una carrera TOCTOU: dos registros simultáneos con el mismo
-- slug pueden pasar la validación antes de que cualquiera inserte, dejando dos tenants
-- con el mismo slug. Como el enlace público es /menu/<slug>, eso lo vuelve ambiguo.
--
-- Esta migración cierra la carrera: el segundo insert falla con unique_violation (23505),
-- que el handler de registro ya traduce a un 409 "identificador en uso".
--
-- Idempotente: solo agrega el constraint si NO existe ya un índice único de una sola
-- columna sobre tenants(slug). Si el schema original ya lo tenía (slug text UNIQUE),
-- esto es un no-op.
--
-- NOTA: si actualmente hay slugs duplicados en tenants, el ALTER fallará. En ese caso
-- hay que deduplicar primero (renombrar o borrar los tenants en conflicto).

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indrelid
    join pg_attribute a on a.attrelid = c.oid and a.attnum = any (i.indkey)
    where c.relname = 'tenants'
      and i.indisunique
      and i.indnatts = 1
      and a.attname = 'slug'
  ) then
    alter table public.tenants
      add constraint tenants_slug_unique unique (slug);
  end if;
end $$;
