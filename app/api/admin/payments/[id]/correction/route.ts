/**
 * POST /api/admin/payments/[id]/correction
 * Solicita corrección al cliente — el pago regresa a un estado editable.
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

  let body: { notas?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
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
    return NextResponse.json({ error: `No se puede solicitar corrección en status: ${payment.status}` }, { status: 409 })
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'CORRECCION_SOLICITADA',
      notas_internas: body.notas ?? null,
      reviewed_by: auth.userId,
      reviewed_at: now,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[correction] update payment:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'validar_pago',
    entidad: 'payments',
    entidad_id: id,
    detalles: `Corrección solicitada — notas: ${body.notas ?? '(sin notas)'}`,
    antes: { status: payment.status },
    despues: { status: 'CORRECCION_SOLICITADA' },
  })

  return NextResponse.json({ ok: true })
}
