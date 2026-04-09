/**
 * lib/cliente-auth.ts
 *
 * Autenticación de clientes (usuarios finales) en la app white-label.
 * Separado de lib/context/auth.ts que maneja staff (admin, mesero, cocina).
 *
 * Flujo:
 *  - Registro: POST /api/cliente/auth/register (server-side, usa supabaseAdmin)
 *  - Login:    supabase.auth.signInWithPassword() + fetch desde tabla `clientes`
 *  - Logout:   supabase.auth.signOut()
 */

import { supabase } from './supabase'

export interface ClienteUser {
  id: string
  email: string
  nombre: string
  telefono?: string
  tenantId?: string
}

/**
 * Registra un nuevo cliente via API server-side.
 * El servidor usa supabaseAdmin para crear el usuario sin requerir confirmación de email.
 * Retorna el ClienteUser creado, o lanza un Error con mensaje legible.
 */
export async function clienteRegister(
  email: string,
  password: string,
  nombre: string,
  telefono?: string,
): Promise<ClienteUser> {
  const res = await fetch('/api/cliente/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nombre, telefono }),
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(json.error ?? 'Error al registrarse')
  }

  return json.cliente as ClienteUser
}

/**
 * Inicia sesión de un cliente existente.
 * Usa Supabase Auth client-side y luego carga el perfil de la tabla `clientes`.
 * Retorna null si las credenciales son incorrectas o el perfil no existe.
 */
export async function clienteLogin(email: string, password: string): Promise<ClienteUser | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) return null

  const { data: perfil } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (!perfil) {
    // El usuario existe en auth pero no en la tabla clientes — es staff, no cliente
    await supabase.auth.signOut()
    return null
  }

  return {
    id: perfil.id as string,
    email: perfil.email as string,
    nombre: perfil.nombre as string,
    telefono: (perfil.telefono as string | null) ?? undefined,
    tenantId: (perfil.tenant_id as string | null) ?? undefined,
  }
}

/**
 * Cierra la sesión del cliente.
 */
export async function clienteLogout(): Promise<void> {
  await supabase.auth.signOut()
}
