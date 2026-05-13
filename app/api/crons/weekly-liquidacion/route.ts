/**
 * POST /api/crons/weekly-liquidacion
 * Runs every Monday at 3:00 AM UTC (configured in vercel.json).
 * Generates liquidaciones for all tenants with active Connect accounts.
 * Covers Mon–Sun of the PREVIOUS calendar week (UTC).
 *
 * Auth: CRON_SECRET header required.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const COMMISSION_PERCENT = Number(process.env.WAITLESS_COMMISSION_PERCENT ?? '5')

function getPreviousWeekRange(): { periodStart: string; periodEnd: string } {
  const now = new Date()
  // Monday of current week
  const dayOfWeek = now.getUTCDay() === 0 ? 7 : now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - dayOfWeek + 1)
  monday.setUTCHours(0, 0, 0, 0)

  // Previous Monday
  const prevMonday = new Date(monday)
  prevMonday.setUTCDate(monday.getUTCDate() - 7)

  // Previous Sunday (end of that week)
  const prevSunday = new Date(monday)
  prevSunday.setUTCDate(monday.getUTCDate() - 1)

  return {
    periodStart: prevMonday.toISOString().split('T')[0],
    periodEnd:   prevSunday.toISOString().split('T')[0],
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const { periodStart, periodEnd } = getPreviousWeekRange()

  console.log(`[weekly-liquidacion] Running for period ${periodStart} → ${periodEnd}`)

  // Fetch all active tenants with Connect accounts ready for payouts
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, nombre, stripe_connect_account_id, stripe_connect_payouts_enabled')
    .eq('activo', true)
    .eq('stripe_connect_payouts_enabled', true)
    .not('stripe_connect_account_id', 'is', null)

  if (!tenants || tenants.length === 0) {
    console.log('[weekly-liquidacion] No tenants with active Connect accounts — skipping')
    return NextResponse.json({ processed: 0, skipped: 0, failed: 0 })
  }

  const stripe = stripeKey ? new Stripe(stripeKey) : null
  let processed = 0
  let skipped = 0
  let failed = 0

  for (const tenant of tenants) {
    const tenantId = tenant.id as string

    // Skip if liquidacion already exists for this period
    const { data: existing } = await supabaseAdmin
      .from('liquidaciones')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    // Sum completed wallet payments for this tenant in the period
    const { data: txns } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('type', 'payment')
      .eq('status', 'completed')
      .gte('created_at', `${periodStart}T00:00:00Z`)
      .lte('created_at', `${periodEnd}T23:59:59Z`)

    const bruto_cents    = (txns ?? []).reduce((s, t) => s + Math.abs(Number(t.amount_cents)), 0)
    const comision_cents = Math.round(bruto_cents * COMMISSION_PERCENT / 100)
    const neto_cents     = bruto_cents - comision_cents
    const transaction_count = (txns ?? []).length

    let stripe_transfer_id: string | null = null
    let status = neto_cents === 0 ? 'procesada' : 'pendiente'
    let error_message: string | null = null

    if (stripe && neto_cents > 0 && tenant.stripe_connect_account_id) {
      try {
        const transfer = await stripe.transfers.create({
          amount: neto_cents,
          currency: 'usd',
          destination: tenant.stripe_connect_account_id as string,
          metadata: { tenant_id: tenantId, period_start: periodStart, period_end: periodEnd },
        })
        stripe_transfer_id = transfer.id
        status = 'procesada'
        processed++
      } catch (err) {
        error_message = err instanceof Error ? err.message : String(err)
        status = 'fallida'
        failed++
        console.error(`[weekly-liquidacion] Transfer failed for tenant ${tenantId}:`, error_message)
      }
    } else {
      if (neto_cents === 0) processed++ else skipped++
    }

    await supabaseAdmin.from('liquidaciones').insert({
      tenant_id: tenantId,
      period_start: periodStart,
      period_end: periodEnd,
      bruto_cents,
      comision_waitless_cents: comision_cents,
      neto_cents,
      transaction_count,
      status,
      stripe_transfer_id,
      error_message,
      processed_at: status === 'procesada' ? new Date().toISOString() : null,
    })
  }

  console.log(`[weekly-liquidacion] Done — processed: ${processed}, skipped: ${skipped}, failed: ${failed}`)
  return NextResponse.json({ processed, skipped, failed, period: { periodStart, periodEnd } })
}
