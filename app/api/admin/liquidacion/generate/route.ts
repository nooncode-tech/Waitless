/**
 * POST /api/admin/liquidacion/generate
 * Generates a weekly settlement for a tenant.
 * Sums completed wallet_transactions of type 'payment' in the period,
 * deducts WAITLESS_COMMISSION_PERCENT (default 5%), and creates a Stripe Transfer
 * if the tenant has a Connect account with payouts_enabled.
 *
 * Body: { periodStart: 'YYYY-MM-DD', periodEnd: 'YYYY-MM-DD' }
 * Auth: admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'

const COMMISSION_PERCENT = Number(process.env.WAITLESS_COMMISSION_PERCENT ?? '5')

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Requiere cuenta de restaurante' }, { status: 400 })
  }

  let body: { periodStart?: string; periodEnd?: string }
  try { body = await req.json() } catch { body = {} }

  const { periodStart, periodEnd } = body
  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: 'Se requiere periodStart y periodEnd (YYYY-MM-DD)' }, { status: 400 })
  }

  // Validate date format
  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRe.test(periodStart) || !dateRe.test(periodEnd)) {
    return NextResponse.json({ error: 'Formato de fecha inválido — usa YYYY-MM-DD' }, { status: 400 })
  }

  // Check for existing liquidacion for this period
  const { data: existing } = await supabaseAdmin
    .from('liquidaciones')
    .select('id, status')
    .eq('tenant_id', auth.tenantId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: `Ya existe una liquidación para este período (${existing.status})`, liquidacion: existing },
      { status: 409 },
    )
  }

  // Sum all completed consumer wallet payments for this tenant in the period
  // Commission (5%) only applies to marketplace-origin orders
  const { data: txns } = await supabaseAdmin
    .from('wallet_transactions')
    .select('amount_cents, order_id')
    .eq('tenant_id', auth.tenantId)
    .eq('type', 'payment')
    .eq('status', 'completed')
    .gte('created_at', `${periodStart}T00:00:00Z`)
    .lte('created_at', `${periodEnd}T23:59:59Z`)

  const txnList = txns ?? []
  const bruto_cents = txnList.reduce((sum, t) => sum + Math.abs(Number(t.amount_cents)), 0)
  const transaction_count = txnList.length

  // Determine which transactions are marketplace orders
  const orderIds = txnList.map(t => t.order_id).filter(Boolean) as string[]
  let marketplace_cents = 0
  if (orderIds.length > 0) {
    const { data: marketplaceOrders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .in('id', orderIds)
      .eq('origin', 'marketplace')
    const marketplaceIds = new Set((marketplaceOrders ?? []).map(o => o.id))
    marketplace_cents = txnList
      .filter(t => t.order_id && marketplaceIds.has(t.order_id))
      .reduce((sum, t) => sum + Math.abs(Number(t.amount_cents)), 0)
  }

  const comision_cents = Math.round(marketplace_cents * COMMISSION_PERCENT / 100)

  // Deduct refunds from disputes resolved in favor of the client during this period
  const { data: disputeRefunds } = await supabaseAdmin
    .from('dispute_tickets')
    .select('refund_cents')
    .eq('tenant_id', auth.tenantId)
    .eq('status', 'resuelto_favor_cliente')
    .gt('refund_cents', 0)
    .gte('resolved_at', `${periodStart}T00:00:00Z`)
    .lte('resolved_at', `${periodEnd}T23:59:59Z`)
  const reembolsos_cents = (disputeRefunds ?? []).reduce((s, d) => s + Math.abs(Number(d.refund_cents ?? 0)), 0)

  const neto_cents = Math.max(0, bruto_cents - comision_cents - reembolsos_cents)

  // Get tenant Connect info
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('stripe_connect_account_id, stripe_connect_payouts_enabled')
    .eq('id', auth.tenantId)
    .single()

  let stripe_transfer_id: string | null = null
  let status = 'pendiente'
  let error_message: string | null = null

  // Attempt Stripe Transfer if Connect is ready and amount > 0
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (
    stripeKey &&
    tenant?.stripe_connect_account_id &&
    tenant?.stripe_connect_payouts_enabled &&
    neto_cents > 0
  ) {
    try {
      const stripe = new Stripe(stripeKey)
      const transfer = await stripe.transfers.create({
        amount: neto_cents,
        currency: 'usd',
        destination: tenant.stripe_connect_account_id as string,
        metadata: {
          tenant_id: auth.tenantId,
          period_start: periodStart,
          period_end: periodEnd,
          bruto_cents: String(bruto_cents),
          comision_cents: String(comision_cents),
        },
      })
      stripe_transfer_id = transfer.id
      status = 'procesada'
    } catch (err) {
      error_message = err instanceof Error ? err.message : String(err)
      status = 'fallida'
      console.error('[liquidacion] Stripe transfer error:', error_message)
    }
  } else if (neto_cents === 0) {
    status = 'procesada' // nothing to transfer
  }

  // Save liquidacion record
  const { data: liquidacion, error: insertError } = await supabaseAdmin
    .from('liquidaciones')
    .insert({
      tenant_id: auth.tenantId,
      period_start: periodStart,
      period_end: periodEnd,
      bruto_cents,
      comision_waitless_cents: comision_cents,
      reembolsos_cents,
      neto_cents,
      transaction_count,
      status,
      stripe_transfer_id,
      error_message,
      processed_at: status === 'procesada' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[liquidacion] insert error:', insertError.message)
    return NextResponse.json({ error: 'Error guardando liquidación' }, { status: 500 })
  }

  return NextResponse.json({ liquidacion }, { status: 201 })
}
