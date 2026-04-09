/**
 * POST /api/payments/webhook
 * Handles Stripe webhook events.
 * Configure in Stripe Dashboard → Webhooks → Endpoint URL:
 *   https://[tu-dominio]/api/payments/webhook
 * Events: checkout.session.completed, payment_intent.payment_failed
 *
 * Sprint 1 — hardening:
 * - Idempotencia persistida: verifica event.id en audit_logs antes de procesar
 * - Valida estado previo de la sesión antes de transicionar (solo cobrable → pagada)
 * - Valida monto cobrado vs monto esperado
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const COBRABLE_STATES = ['abierta', 'en_pago']

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey)
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Firma Stripe requerida' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Firma inválida'
    console.error('[webhook] Firma inválida:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // ── Idempotencia: verificar si este evento ya fue procesado ─────────────────
  const { data: alreadyProcessed } = await supabaseAdmin
    .from('audit_logs')
    .select('id')
    .like('detalles', `%${event.id}%`)
    .limit(1)
    .maybeSingle()

  if (alreadyProcessed) {
    console.log(`[webhook] Evento ${event.id} ya procesado — skipping`)
    return NextResponse.json({ received: true, skipped: 'already_processed' })
  }

  // ── Handle events ─────────────────────────────────────────────────────────
  try {
    if (event.type === 'checkout.session.completed') {
      const stripeSession = event.data.object as Stripe.Checkout.Session
      const sessionId = stripeSession.metadata?.sessionId

      if (!sessionId) {
        console.warn('[webhook] checkout.session.completed sin sessionId en metadata')
        return NextResponse.json({ received: true })
      }

      const metaTenantId = stripeSession.metadata?.tenantId ?? null

      // Validar estado previo: solo transicionar si está en estado cobrable
      const { data: tableSession } = await supabaseAdmin
        .from('table_sessions')
        .select('id, bill_status, activa, tenant_id')
        .eq('id', sessionId)
        .single()

      if (!tableSession) {
        console.error(`[webhook] Sesión ${sessionId} no encontrada`)
        return NextResponse.json({ received: true, warning: 'session_not_found' })
      }

      // Verificar consistencia de tenant: el pago debe pertenecer al mismo tenant que la sesión
      if (metaTenantId && tableSession.tenant_id && metaTenantId !== tableSession.tenant_id) {
        console.error(`[webhook] tenant_id mismatch para sesión ${sessionId}: metadata=${metaTenantId} vs session=${tableSession.tenant_id}`)
        return NextResponse.json({ received: true, warning: 'tenant_mismatch' })
      }

      if (!COBRABLE_STATES.includes(tableSession.bill_status as string)) {
        console.warn(`[webhook] Sesión ${sessionId} en estado no cobrable: ${tableSession.bill_status} — skipping`)
        await supabaseAdmin.from('audit_logs').insert({
          user_id: 'stripe-webhook',
          accion: 'pago_online_ignorado',
          entidad: 'table_sessions',
          entidad_id: sessionId,
          detalles: `Evento ${event.id} ignorado — sesión ya en estado ${tableSession.bill_status}`,
        })
        return NextResponse.json({ received: true, skipped: 'invalid_state' })
      }

      // Validar monto cobrado vs monto esperado desde orders (scoped por tenant)
      let ordersQuery = supabaseAdmin
        .from('orders')
        .select('total')
        .eq('session_id', sessionId)
        .eq('cancelado', false)
      if (tableSession.tenant_id) {
        ordersQuery = ordersQuery.eq('tenant_id', tableSession.tenant_id)
      }
      const { data: orders } = await ordersQuery

      const expectedCents = Math.round(
        (orders ?? []).reduce((sum, o) => sum + Number(o.total ?? 0), 0) * 100
      )
      const paidCents = stripeSession.amount_total ?? 0

      const amountMismatch = expectedCents > 0 && Math.abs(paidCents - expectedCents) > 10 // tolerancia 10 centavos

      if (amountMismatch) {
        // Monto difiere: NO cerrar sesión — dejar en revisión para intervención manual
        console.error(`[webhook] ⚠️ MONTO DIFIERE para sesión ${sessionId}: pagado ${paidCents}¢ vs esperado ${expectedCents}¢ — sesión NO cerrada`)
        await supabaseAdmin.from('audit_logs').insert({
          user_id: 'stripe-webhook',
          accion: 'pago_online_revision',
          entidad: 'table_sessions',
          entidad_id: sessionId,
          detalles: `Stripe checkout.session.completed — ${event.id} | pagado: ${paidCents}¢ | esperado: ${expectedCents}¢ — ⚠️ MONTO DIFIERE: sesión retenida en revisión`,
        })
        return NextResponse.json({ received: true, warning: 'amount_mismatch_held_for_review' })
      }

      // Monto correcto: marcar la sesión como pagada
      await supabaseAdmin
        .from('table_sessions')
        .update({
          payment_status: 'pagado',
          bill_status: 'pagada',
          activa: false,
        })
        .eq('id', sessionId)
        .in('bill_status', COBRABLE_STATES)

      // Registrar en audit_logs (incluye event.id para idempotencia futura)
      await supabaseAdmin.from('audit_logs').insert({
        user_id: 'stripe-webhook',
        accion: 'pago_online_confirmado',
        entidad: 'table_sessions',
        entidad_id: sessionId,
        detalles: `Stripe checkout.session.completed — ${event.id} | pagado: ${paidCents}¢ | esperado: ${expectedCents}¢`,
      })

      console.log(`[webhook] Pago confirmado para sesión ${sessionId}`)
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent
      const sessionId = intent.metadata?.sessionId

      if (sessionId) {
        // Revertir estado en_pago → abierta para permitir reintento
        await supabaseAdmin
          .from('table_sessions')
          .update({ bill_status: 'abierta' })
          .eq('id', sessionId)
          .eq('bill_status', 'en_pago')

        await supabaseAdmin.from('audit_logs').insert({
          user_id: 'stripe-webhook',
          accion: 'pago_online_fallido',
          entidad: 'table_sessions',
          entidad_id: sessionId,
          detalles: `Stripe payment_intent.payment_failed — ${event.id} | ${intent.id}: ${intent.last_payment_error?.message}`,
        })
      }
    }
  } catch (err) {
    console.error('[webhook] Error procesando evento:', err)
    return NextResponse.json({ received: true, warning: 'Error interno' })
  }

  return NextResponse.json({ received: true })
}
