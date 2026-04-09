/**
 * POST /api/qr/validate
 * Server-side QR token validation.
 * Uses supabaseAdmin (service role) — bypasses RLS para garantizar una sola fuente de verdad.
 * Cuando la plataforma opera en modo multi-tenant, valida también que el token pertenezca
 * al tenant resuelto desde el host (x-tenant-slug header, puesto por middleware).
 *
 * Body: { token: string, mesa: number }
 * Response: { valid: boolean } | { valid: false, error: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  let body: { token?: string; mesa?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ valid: false, error: 'Body JSON inválido' }, { status: 400 })
  }

  const { token, mesa } = body

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return NextResponse.json({ valid: false, error: 'token requerido' }, { status: 400 })
  }

  if (mesa === undefined || typeof mesa !== 'number' || !Number.isInteger(mesa) || mesa <= 0) {
    return NextResponse.json({ valid: false, error: 'mesa requerida' }, { status: 400 })
  }

  // Resolver tenant desde x-tenant-slug (puesto por middleware para /api/*)
  // INTENTIONAL-DEFAULT: Single-tenant backward compat — sin slug, el QR valida sin filtro de tenant
  const tenantSlug = req.headers.get('x-tenant-slug') ?? 'default'
  let tenantId: string | null = null

  if (tenantSlug !== 'default') {
    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .eq('activo', true)
      .single()
    tenantId = tenantRow?.id ?? null
    // Si el slug es reconocido pero el tenant no existe/activo, rechazar
    if (!tenantId) {
      return NextResponse.json({ valid: false, error: 'Tenant no encontrado' })
    }
  }

  let query = supabaseAdmin
    .from('qr_tokens')
    .select('id, mesa, token, usado, expires_at, tenant_id')
    .eq('token', token)
    .eq('usado', false)
    .gt('expires_at', new Date().toISOString())

  // Scoping por tenant: solo validar si el token pertenece al tenant correcto.
  // Tokens legacy (tenant_id = null) se aceptan únicamente en modo single-tenant.
  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ valid: false })
  }

  if (data.mesa !== mesa) {
    return NextResponse.json({ valid: false, error: 'Token no corresponde a esta mesa' })
  }

  return NextResponse.json({ valid: true, mesa: data.mesa })
}
