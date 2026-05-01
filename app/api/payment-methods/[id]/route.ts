/**
 * PATCH  /api/payment-methods/[id]  — Edita un método de pago (admin)
 * DELETE /api/payment-methods/[id]  — Desactiva un método (soft delete, admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const allowed = ['nombre', 'tipo', 'moneda', 'instrucciones', 'datos_pago', 'requiere_comprobante', 'requiere_validacion_manual', 'activo', 'orden']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('payment_methods')
    .update(updates)
    .eq('id', id)
  if (auth.tenantId) query = query.eq('tenant_id', auth.tenantId)
  const { data, error } = await query.select().single()

  if (error) {
    console.error('[PATCH /api/payment-methods]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'editar_config',
    entidad: 'payment_methods',
    entidad_id: id,
    detalles: `Actualizó método de pago: ${JSON.stringify(updates)}`,
  })

  return NextResponse.json({ method: data })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  const { id } = await params

  let query = supabaseAdmin
    .from('payment_methods')
    .update({ activo: false })
    .eq('id', id)
  if (auth.tenantId) query = query.eq('tenant_id', auth.tenantId)
  const { error } = await query

  if (error) {
    console.error('[DELETE /api/payment-methods]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'editar_config',
    entidad: 'payment_methods',
    entidad_id: id,
    detalles: 'Desactivó método de pago (soft delete)',
  })

  return NextResponse.json({ ok: true })
}
