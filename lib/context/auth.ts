/**
 * lib/context/auth.ts
 *
 * Lógica pura de autenticación extraída de lib/context.tsx.
 * Estas funciones manejan las llamadas a Supabase Auth y perfiles.
 * El manejo de estado React (setState) queda en el provider.
 */

import { supabase } from '../supabase'
import type { User, UserRole } from '../store'

/**
 * Autentica al usuario contra Supabase Auth y carga su perfil.
 * Retorna el User si el login es exitoso y el perfil está activo,
 * null en cualquier otro caso.
 */
export async function authLogin(username: string, password: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${username}@pqvv.local`,
    password,
  })
  if (error || !data.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (!profile || !profile.activo) {
    await supabase.auth.signOut()
    return null
  }

  return {
    id: profile.id as string,
    username: profile.username as string,
    nombre: profile.nombre as string,
    role: profile.role as UserRole,
    activo: profile.activo as boolean,
    tenantId: (profile.tenant_id as string | null) ?? undefined,
    createdAt: new Date(profile.created_at as string),
  }
}

/**
 * Carga la lista de perfiles de staff desde Supabase.
 * Cuando tenantId está presente, filtra solo los perfiles del tenant.
 * Usado después del login para sincronizar la lista de usuarios.
 */
export async function authLoadUsers(tenantId?: string): Promise<User[]> {
  let query = supabase.from('profiles').select('*').order('created_at')
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data: profiles } = await query
  if (!profiles) return []
  return profiles.map((p) => ({
    id: p.id as string,
    username: p.username as string,
    nombre: p.nombre as string,
    role: p.role as UserRole,
    activo: p.activo as boolean,
    tenantId: (p.tenant_id as string | null) ?? undefined,
    createdAt: new Date(p.created_at as string),
  }))
}

/**
 * Cierra la sesión en Supabase Auth.
 * El reseteo del estado React queda en el provider.
 */
export async function authLogout(): Promise<void> {
  await supabase.auth.signOut()
}
