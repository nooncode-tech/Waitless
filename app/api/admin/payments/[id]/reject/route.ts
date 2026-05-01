/**
 * POST /api/admin/payments/[id]/reject
 * Rechaza un pago. Requiere motivo obligatorio.
 * Requiere: admin o manager (permiso validar_pago)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if ('error' in auth) return auth.error

  const { id } = await params

  let body: { motivo: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (!body.motivo?.trim()) {
    return NextResponse.json({ error: 'El motivo de rechazo es obligatorio' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('payments')
    .select('id, status')
    .eq('id', id)
  if (auth.tenantId) query = query.eq('tenant_id', auth.tenantId)
  const { data: payment, error: paymentError } = await query.single()

  if (paymentError || !payment) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  }

  if (['PAGO_VALIDADO', 'ANULADO'].includes(payment.status)) {
    return NextResponse.json({ error: `No se puede rechazar un pago con status: ${payment.status}` }, { status: 409 })
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'PAGO_RECHAZADO',
      motivo_rechazo: body.motivo,
      reviewed_by: auth.userId,
      reviewed_at: now,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[reject] update payment:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Marcar comprobantes pendientes como rechazados
  await supabaseAdmin
    .from('payment_receipts')
    .update({
      review_status: 'rechazado',
      review_notes: body.motivo,
      reviewed_by: auth.userId,
      reviewed_at: now,
    })
    .eq('payment_id', id)
    .eq('review_status', 'pendiente')

  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'validar_pago',
    entidad: 'payments',
    entidad_id: id,
    detalles: `Pago rechazado — motivo: ${body.motivo}`,
    antes: { status: payment.status },
    despues: { status: 'PAGO_RECHAZADO' },
  })

  return NextResponse.json({ ok: true })
}
