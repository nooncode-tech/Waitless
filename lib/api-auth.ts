/**
 * lib/api-auth.ts — Shared authentication helpers for API route handlers.
 *
 * All helpers validate the JWT against Supabase (server-side) AND check
 * the `profiles` table for role + activo status, so a deactivated or
 * downgraded user cannot continue using an older JWT.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase-admin'
import type { UserRole } from './store'

export interface AuthResult {
  userId: string
  role: UserRole
  /** tenant_id del perfil del usuario. null en instalaciones single-tenant. */
  tenantId: string | null
}

type AuthError = { error: NextResponse }
type AuthSuccess = AuthResult

/**
 * Validates a Bearer JWT and verifies the user is active in the DB.
 * Returns { userId, role } or { error: NextResponse }.
 */
export async function requireAuth(req: NextRequest): Promise<AuthSuccess | AuthError> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return { error: NextResponse.json({ error: 'Token requerido' }, { status: 401 }) }
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 }) }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, activo, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 }) }
  }
  if (!profile.activo) {
    return { error: NextResponse.json({ error: 'Cuenta desactivada' }, { status: 403 }) }
  }

  return {
    userId: user.id,
    role: profile.role as UserRole,
    tenantId: (profile.tenant_id as string | null) ?? null,
  }
}

/**
 * Like requireAuth, but also enforces that the user has one of the allowed roles.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[],
): Promise<AuthSuccess | AuthError> {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth

  if (!allowedRoles.includes(auth.role)) {
    return {
      error: NextResponse.json(
        { error: `Acceso denegado — se requiere rol: ${allowedRoles.join(' | ')}` },
        { status: 403 },
      ),
    }
  }

  return auth
}
