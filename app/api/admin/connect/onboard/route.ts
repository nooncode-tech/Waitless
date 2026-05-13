/**
 * POST /api/admin/connect/onboard
 * Creates (or re-opens) a Stripe Express Connect account for the current tenant
 * and returns an AccountLink URL for the admin to complete onboarding.
 *
 * If the tenant already has a stripe_connect_account_id, generates a refresh link
 * (useful when onboarding was interrupted or requirements changed).
 *
 * Auth: admin only.
 * Body: { returnUrl: string, refreshUrl: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Requiere cuenta de restaurante (tenant)' }, { status: 400 })
  }

  let body: { returnUrl?: string; refreshUrl?: string }
  try { body = await req.json() } catch { body = {} }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://waitless.app'
  const returnUrl  = body.returnUrl  ?? `${baseUrl}/restaurante?connect=success`
  const refreshUrl = body.refreshUrl ?? `${baseUrl}/restaurante?connect=refresh`

  const stripe = new Stripe(stripeKey)

  // Fetch current tenant to check for existing Connect account
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('stripe_connect_account_id, nombre, slug')
    .eq('id', auth.tenantId)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
  }

  let connectAccountId = tenant.stripe_connect_account_id as string | null

  if (!connectAccountId) {
    // Create a new Express account
    const account = await stripe.accounts.create({
      type: 'express',
      metadata: {
        tenant_id: auth.tenantId,
        tenant_slug: (tenant.slug as string) ?? '',
      },
      business_profile: {
        name: (tenant.nombre as string) ?? undefined,
      },
    })
    connectAccountId = account.id

    await supabaseAdmin
      .from('tenants')
      .update({
        stripe_connect_account_id: connectAccountId,
        stripe_connect_status: 'pending',
      })
      .eq('id', auth.tenantId)
  }

  // Generate AccountLink for onboarding (or continuing if interrupted)
  const accountLink = await stripe.accountLinks.create({
    account: connectAccountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url, accountId: connectAccountId })
}
