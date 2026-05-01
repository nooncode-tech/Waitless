/**
 * POST /api/admin/payments/[id]/approve
 * Aprueba un pago, cambia status a PAGO_VALIDADO y genera la nota interna.
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

  // Obtener el pago con su sesión
  let paymentQuery = supabaseAdmin
    .from('payments')
    .select('*, table_sessions(id, mesa, bill_total, orders:orders(id, items, total, status))')
    .eq('id', id)
  if (auth.tenantId) paymentQuery = paymentQuery.eq('tenant_id', auth.tenantId)
  const { data: payment, error: paymentError } = await paymentQuery.single()

  if (paymentError || !payment) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  }

  if (payment.status === 'PAGO_VALIDADO') {
    return NextResponse.json({ error: 'El pago ya fue validado' }, { status: 409 })
  }

  if (['ANULADO', 'PAGO_RECHAZADO'].includes(payment.status)) {
    return NextResponse.json({ error: `No se puede aprobar un pago con status: ${payment.status}` }, { status: 409 })
  }

  const now = new Date().toISOString()

  // Generar número interno: WLS-{tenantId[:6]}-MAIN-{año}-{seq:06}
  const tenantPrefix = (auth.tenantId ?? 'NOTNT').slice(0, 6).toUpperCase()
  const year = new Date().getFullYear()

  const { count } = await supabaseAdmin
    .from('internal_sales_notes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', auth.tenantId ?? '')

  const seq = String((count ?? 0) + 1).padStart(6, '0')
  const numeroInterno = `WLS-${tenantPrefix}-MAIN-${year}-${seq}`

  // Calcular totales desde snapshot de la sesión
  const orders = (payment.table_sessions?.orders ?? []).filter(
    (o: { status: string }) => !['cancelado'].includes(o.status)
  )
  const subtotal = payment.monto_requerido ?? 0
  const total = payment.monto_declarado ?? subtotal

  // Snapshot de ítems
  const snapshotItems = orders.flatMap(
    (o: { items?: unknown[] }) => o.items ?? []
  )

  // Actualizar el pago
  const { error: updatePaymentError } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'PAGO_VALIDADO',
      reviewed_by: auth.userId,
      reviewed_at: now,
    })
    .eq('id', id)

  if (updatePaymentError) {
    console.error('[approve] update payment:', updatePaymentError.message)
    return NextResponse.json({ error: updatePaymentError.message }, { status: 500 })
  }

  // Aprobar el último comprobante pendiente
  await supabaseAdmin
    .from('payment_receipts')
    .update({ review_status: 'aprobado', reviewed_by: auth.userId, reviewed_at: now })
    .eq('payment_id', id)
    .eq('review_status', 'pendiente')

  // Generar nota de venta interna
  const { data: note, error: noteError } = await supabaseAdmin
    .from('internal_sales_notes')
    .insert({
      numero_interno: numeroInterno,
      tenant_id: auth.tenantId,
      session_id: payment.session_id,
      payment_id: id,
      status: 'EMITIDA_INTERNAMENTE',
      subtotal,
      descuentos_total: 0,
      impuestos_total: 0,
      total,
      moneda: payment.moneda ?? 'USD',
      snapshot_items: snapshotItems,
      generated_by: auth.userId,
      generated_at: now,
    })
    .select('id, numero_interno')
    .single()

  if (noteError) {
    console.error('[approve] insert note:', noteError.message)
    return NextResponse.json({ error: noteError.message }, { status: 500 })
  }

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'validar_pago',
    entidad: 'payments',
    entidad_id: id,
    detalles: `Pago aprobado — nota interna: ${numeroInterno}`,
    antes: { status: payment.status },
    despues: { status: 'PAGO_VALIDADO', nota_interna: note.id },
  })

  return NextResponse.json({ ok: true, noteId: note.id, numeroInterno: note.numero_interno })
}
