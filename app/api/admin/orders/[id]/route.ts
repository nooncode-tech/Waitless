import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ['admin', 'manager', 'mesero', 'cocina'])
  if ('error' in auth) return auth.error

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const allowed = ['status', 'cancelado', 'cancel_reason', 'cancel_motivo', 'cancelado_por',
    'cancelado_at', 'tiempo_inicio_preparacion', 'tiempo_fin_preparacion', 'updated_at']

  const payload: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) payload[key] = body[key]
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })
  }

  let q = supabaseAdmin.from('orders').update(payload).eq('id', id)
  if (auth.tenantId) q = q.eq('tenant_id', auth.tenantId)

  const { error } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
