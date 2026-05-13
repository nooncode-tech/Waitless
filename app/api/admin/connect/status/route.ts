/**
 * GET /api/admin/connect/status
 * Returns the Stripe Connect account status for the current tenant.
 * Refreshes charges_enabled / payouts_enabled from Stripe on every call.
 *
 * Auth: admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Requiere cuenta de restaurante' }, { status: 400 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('stripe_connect_account_id, stripe_connect_status, stripe_connect_charges_enabled, stripe_connect_payouts_enabled')
    .eq('id', auth.tenantId)
    .single()

  if (!tenant || !tenant.stripe_connect_account_id) {
    return NextResponse.json({
      connected: false,
      status: 'not_connected',
      charges_enabled: false,
      payouts_enabled: false,
    })
  }

  // Refresh from Stripe
  const stripe = new Stripe(stripeKey)
  try {
    const account = await stripe.accounts.retrieve(tenant.stripe_connect_account_id as string)

    const charges_enabled  = account.charges_enabled ?? false
    const payouts_enabled  = account.payouts_enabled ?? false
    const requirements     = account.requirements

    // Determine status
    let status: string
    if (charges_enabled && payouts_enabled) {
      status = 'active'
    } else if (requirements?.disabled_reason) {
      status = 'disabled'
    } else if (requirements?.currently_due && requirements.currently_due.length > 0) {
      status = 'incomplete'
    } else {
      status = 'pending'
    }

    // Persist updated status to DB
    await supabaseAdmin
      .from('tenants')
      .update({
        stripe_connect_status: status,
        stripe_connect_charges_enabled: charges_enabled,
        stripe_connect_payouts_enabled: payouts_enabled,
      })
      .eq('id', auth.tenantId)

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      status,
      charges_enabled,
      payouts_enabled,
      requirements_due: requirements?.currently_due ?? [],
      disabled_reason: requirements?.disabled_reason ?? null,
    })
  } catch (err) {
    console.error('[connect/status] Stripe error:', err)
    return NextResponse.json({
      connected: true,
      status: (tenant.stripe_connect_status as string) ?? 'pending',
      charges_enabled: (tenant.stripe_connect_charges_enabled as boolean) ?? false,
      payouts_enabled: (tenant.stripe_connect_payouts_enabled as boolean) ?? false,
    })
  }
}
