/**
 * POST /api/superadmin/disputes/[id]?action=resolve
 * WAITLESS operator resolves any dispute globally.
 * Protected by X-Superadmin-Key header.
 *
 * Body: { resolucion: 'favor_cliente' | 'favor_restaurante', nota?: string, refund_cents?: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { pushToConsumer } from '@/lib/push-server'
import { sendDisputeResolution } from '@/lib/email'

function checkKey(req: NextRequest) {
  const key = req.headers.get('x-superadmin-key')
  const expected = process.env.SUPERADMIN_KEY
  if (!expected) return { ok: false, error: 'SUPERADMIN_KEY no configurada' }
  if (!key || key !== expected) return { ok: false, error: 'No autorizado' }
  return { ok: true, error: null }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ok, error } = checkKey(req)
  if (!ok) return NextResponse.json({ error }, { status: 401 })

  const { id: disputeId } = await params
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action !== 'resolve') {
    return NextResponse.json({ error: 'action debe ser "resolve"' }, { status: 400 })
  }

  const { data: dispute } = await supabaseAdmin
    .from('dispute_tickets')
    .select('id, status, consumer_id, order_id, motivo, tenant_id')
    .eq('id', disputeId)
    .maybeSingle()

  if (!dispute) {
    return NextResponse.json({ error: 'Reclamo no encontrado' }, { status: 404 })
  }

  if (['resuelto_favor_cliente', 'resuelto_favor_restaurante'].includes(dispute.status)) {
    return NextResponse.json({ error: 'El reclamo ya está resuelto' }, { status: 409 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { body = {} }

  const resolucion = body.resolucion as string | undefined
  if (!resolucion || !['favor_cliente', 'favor_restaurante'].includes(resolucion)) {
    return NextResponse.json(
      { error: 'resolucion debe ser "favor_cliente" o "favor_restaurante"' },
      { status: 400 },
    )
  }

  const nota = (body.nota as string | undefined) ?? null
  const grossRefund = resolucion === 'favor_cliente' ? Number(body.refund_cents ?? 0) : 0
  // Apply 5% mediation fee
  const refund_cents = grossRefund > 0 ? Math.round(grossRefund * 0.95) : 0

  if (refund_cents > 0 && dispute.consumer_id) {
    const { data: wallet } = await supabaseAdmin
      .from('consumer_wallet')
      .select('balance_cash_cents, balance_rewards_cents')
      .eq('consumer_id', dispute.consumer_id)
      .maybeSingle()

    const newCash  = (wallet?.balance_cash_cents   ?? 0) + refund_cents
    const rewards  = wallet?.balance_rewards_cents ?? 0
    const newTotal = newCash + rewards

    await supabaseAdmin
      .from('consumer_wallet')
      .upsert(
        { consumer_id: dispute.consumer_id, balance_cash_cents: newCash, balance_rewards_cents: rewards },
        { onConflict: 'consumer_id' },
      )

    await supabaseAdmin.from('wallet_transactions').insert({
      consumer_id:         dispute.consumer_id,
      type:                'refund',
      amount_cents:        refund_cents,
      balance_after_cents: newTotal,
      description:         `Reembolso por reclamo #${disputeId.slice(0, 8)} (mediación Waitless)`,
      order_id:            dispute.order_id ?? null,
      tenant_id:           dispute.tenant_id ?? null,
      status:              'completed',
      balance_type:        'cash',
    })
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('dispute_tickets')
    .update({
      status:       `resuelto_${resolucion}`,
      resolucion:   nota,
      refund_cents,
      resolved_at:  new Date().toISOString(),
    })
    .eq('id', disputeId)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: 'Error guardando resolución' }, { status: 500 })
  }

  // Notify consumer (fire-and-forget)
  if (dispute.consumer_id) {
    const notifBody = resolucion === 'favor_cliente'
      ? refund_cents > 0
        ? `Tu reclamo fue resuelto a tu favor. Se acreditaron $${(refund_cents / 100).toFixed(2)} a tu monedero.`
        : 'Tu reclamo fue resuelto a tu favor.'
      : 'Tu reclamo fue revisado por el equipo Waitless.'

    pushToConsumer(dispute.consumer_id, {
      title: 'Resolución de tu reclamo — Waitless',
      body: notifBody,
      url: '/consumidor/pedidos',
    }).catch(() => {})

    const { data: consumerProfile } = await supabaseAdmin
      .from('consumer_profiles')
      .select('email, nombre')
      .eq('id', dispute.consumer_id)
      .single()

    if (consumerProfile?.email) {
      sendDisputeResolution({
        to:            consumerProfile.email as string,
        nombreCliente: (consumerProfile.nombre as string | null) ?? 'Cliente',
        motivo:        (dispute.motivo as string | null) ?? '',
        resolucion:    resolucion as 'favor_cliente' | 'favor_restaurante',
        refundCents:   refund_cents,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ dispute: updated })
}
