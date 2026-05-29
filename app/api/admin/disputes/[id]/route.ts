/**
 * POST /api/admin/disputes/[id]/respond  — restaurant submits response (24h SLA)
 * POST /api/admin/disputes/[id]/resolve  — admin resolves dispute + optional refund
 *
 * Both actions are routed through this file via ?action= query param
 * so Next.js dynamic route [id] doesn't need sub-segments.
 *
 * ?action=respond  Body: { respuesta: string }
 * ?action=resolve  Body: { resolucion: 'favor_cliente' | 'favor_restaurante', nota?: string, refund_cents?: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'
import { pushToConsumer } from '@/lib/push-server'
import { sendDisputeResolution } from '@/lib/email'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if ('error' in auth) return auth.error

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Requiere cuenta de restaurante' }, { status: 400 })
  }

  const { id: disputeId } = await params
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (!action || !['respond', 'resolve'].includes(action)) {
    return NextResponse.json({ error: 'action debe ser "respond" o "resolve"' }, { status: 400 })
  }

  // Verify dispute belongs to this tenant
  const { data: dispute } = await supabaseAdmin
    .from('dispute_tickets')
    .select('id, status, consumer_id, order_id, motivo, neto_cents')
    .eq('id', disputeId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()

  if (!dispute) {
    return NextResponse.json({ error: 'Reclamo no encontrado' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { body = {} }

  // ── Respond ────────────────────────────────────────────────────────────────
  if (action === 'respond') {
    if (!['abierto', 'en_revision'].includes(dispute.status)) {
      return NextResponse.json(
        { error: `No se puede responder en estado: ${dispute.status}` },
        { status: 409 },
      )
    }

    const respuesta = body.respuesta as string | undefined
    if (!respuesta?.trim()) {
      return NextResponse.json({ error: 'La respuesta no puede estar vacía' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('dispute_tickets')
      .update({
        restaurante_respuesta:    respuesta.trim(),
        restaurante_respondio_at: new Date().toISOString(),
        status:                   'restaurante_respondio',
      })
      .eq('id', disputeId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: 'Error guardando respuesta' }, { status: 500 })
    }

    // Notify consumer (fire-and-forget)
    pushToConsumer(dispute.consumer_id, {
      title: 'El restaurante respondió tu reclamo',
      body: respuesta.trim().slice(0, 80),
      url: '/consumidor/pedidos',
    }).catch(() => {})

    return NextResponse.json({ dispute: updated })
  }

  // ── Resolve ────────────────────────────────────────────────────────────────
  if (action === 'resolve') {
    if (['resuelto_favor_cliente', 'resuelto_favor_restaurante'].includes(dispute.status)) {
      return NextResponse.json({ error: 'El reclamo ya está resuelto' }, { status: 409 })
    }

    const resolucion = body.resolucion as string | undefined
    if (!resolucion || !['favor_cliente', 'favor_restaurante'].includes(resolucion)) {
      return NextResponse.json(
        { error: 'resolucion debe ser "favor_cliente" o "favor_restaurante"' },
        { status: 400 },
      )
    }

    const newStatus = `resuelto_${resolucion}` as const
    const nota = (body.nota as string | undefined) ?? null
    const grossRefund = resolucion === 'favor_cliente'
      ? Number(body.refund_cents ?? 0)
      : 0

    if (!Number.isInteger(grossRefund) || grossRefund < 0) {
      return NextResponse.json(
        { error: 'refund_cents debe ser un entero no negativo (en centavos)' },
        { status: 400 },
      )
    }

    // Un reembolso no puede superar el total de la orden. orders.total es numeric en dólares → centavos.
    if (grossRefund > 0) {
      if (!dispute.order_id) {
        return NextResponse.json(
          { error: 'No se puede reembolsar un reclamo sin orden asociada' },
          { status: 422 },
        )
      }
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('total')
        .eq('id', dispute.order_id)
        .eq('tenant_id', auth.tenantId)
        .maybeSingle()
      if (!order) {
        return NextResponse.json({ error: 'Orden del reclamo no encontrada' }, { status: 422 })
      }
      const orderTotalCents = Math.round(Number(order.total ?? 0) * 100)
      if (grossRefund > orderTotalCents) {
        return NextResponse.json(
          { error: `El reembolso (${grossRefund}¢) supera el total de la orden (${orderTotalCents}¢)` },
          { status: 422 },
        )
      }
    }

    // Waitless retains 5% mediation fee — consumer receives 95%
    const refund_cents = grossRefund > 0 ? Math.round(grossRefund * 0.95) : 0

    // Issue refund to consumer wallet if applicable
    if (refund_cents > 0 && dispute.consumer_id) {
      // Crédito atómico vía RPC (evita lost-update bajo concurrencia).
      const { data: walletRows, error: walletErr } = await supabaseAdmin.rpc('wallet_apply_delta', {
        p_consumer_id:   dispute.consumer_id,
        p_cash_delta:    refund_cents,
        p_rewards_delta: 0,
      })

      if (walletErr || !walletRows || walletRows.length === 0) {
        return NextResponse.json({ error: 'Error acreditando reembolso' }, { status: 500 })
      }

      const newTotal = walletRows[0].balance_cash_cents + walletRows[0].balance_rewards_cents

      await supabaseAdmin.from('wallet_transactions').insert({
        consumer_id:         dispute.consumer_id,
        type:                'refund',
        amount_cents:        refund_cents,
        balance_after_cents: newTotal,
        description:         `Reembolso por reclamo #${disputeId.slice(0, 8)}`,
        order_id:            dispute.order_id ?? null,
        tenant_id:           auth.tenantId,
        status:              'completed',
        balance_type:        'cash',
      })
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('dispute_tickets')
      .update({
        status:         newStatus,
        resolucion:     nota,
        refund_cents:   refund_cents,
        resolved_at:    new Date().toISOString(),
        resolved_by:    auth.userId,
      })
      .eq('id', disputeId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: 'Error guardando resolución' }, { status: 500 })
    }

    // Notify consumer of resolution (fire-and-forget)
    const notifBody = resolucion === 'favor_cliente'
      ? refund_cents > 0
        ? `Tu reclamo fue resuelto a tu favor. Se acreditaron $${(refund_cents / 100).toFixed(2)} a tu monedero.`
        : 'Tu reclamo fue resuelto a tu favor.'
      : 'Tu reclamo fue revisado. Contactanos si tenés más preguntas.'
    pushToConsumer(dispute.consumer_id, {
      title: 'Resolución de tu reclamo',
      body: notifBody,
      url: '/consumidor/pedidos',
    }).catch(() => {})

    // Email de resolución al consumidor (fire-and-forget)
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

    return NextResponse.json({ dispute: updated })
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 })
}
