/**
 * POST /api/admin/tenants — Sprint 6 Task 7.2
 * Crea un nuevo tenant. Solo admin puede ejecutarlo.
 * Opcionalmente asigna un usuario existente como admin del nuevo tenant.
 *
 * Body: { nombre, slug, plan?, adminUserId? }
 * Returns: { tenant }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { createTenant } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  let body: { nombre: string; slug: string; plan?: string; adminUserId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { nombre, slug, plan, adminUserId } = body

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'nombre es requerido' }, { status: 400 })
  }
  if (!slug?.trim()) {
    return NextResponse.json({ error: 'slug es requerido' }, { status: 400 })
  }
  if (plan && !['starter', 'pro', 'enterprise'].includes(plan)) {
    return NextResponse.json({ error: 'plan debe ser starter | pro | enterprise' }, { status: 400 })
  }

  try {
    const tenant = await createTenant({
      nombre: nombre.trim(),
      slug: slug.trim().toLowerCase(),
      plan: plan as 'starter' | 'pro' | 'enterprise' | undefined,
      adminUserId,
    })
    return NextResponse.json({ tenant }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error creando tenant'
    const status = msg.includes('slug') ? 409 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}

/**
 * GET /api/admin/tenants — Lista todos los tenants (admin only)
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, nombre, slug, plan, activo, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ tenants: data ?? [] })
}
