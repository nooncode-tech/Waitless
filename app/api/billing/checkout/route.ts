/**
 * POST /api/billing/checkout
 * Crea una Stripe Checkout Session para suscribirse a un plan (pro | enterprise).
 * Protegido: solo admin del tenant.
 *
 * Body: { plan: 'pro' | 'enterprise', successUrl: string, cancelUrl: string }
 * Responde: { url: string } — URL de Stripe Checkout para redirigir al usuario.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const PRICE_IDS: Record<string, string | undefined> = {
  pro:        process.env.STRIPE_PRO_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  let body: { plan: string; successUrl: string; cancelUrl: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { plan, successUrl, cancelUrl } = body

  if (!['pro', 'enterprise'].includes(plan)) {
    return NextResponse.json({ error: 'Plan inválido. Valores: pro, enterprise' }, { status: 400 })
  }

  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID para plan "${plan}" no configurado. Agrega STRIPE_${plan.toUpperCase()}_PRICE_ID al entorno.` },
      { status: 503 }
    )
  }

  if (!successUrl || !cancelUrl) {
    return NextResponse.json({ error: 'Faltan successUrl o cancelUrl' }, { status: 400 })
  }

  const stripe = new Stripe(stripeKey)

  // Obtener o crear customer de Stripe para este tenant
  let stripeCustomerId: string | undefined

  if (auth.tenantId) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('stripe_customer_id, nombre, slug')
      .eq('id', auth.tenantId)
      .single()

    if (tenant?.stripe_customer_id) {
      stripeCustomerId = tenant.stripe_customer_id as string
    } else if (tenant) {
      // Crear nuevo customer en Stripe
      const customer = await stripe.customers.create({
        name: tenant.nombre as string,
        metadata: { tenantId: auth.tenantId, slug: tenant.slug as string },
      })
      stripeCustomerId = customer.id

      await supabaseAdmin
        .from('tenants')
        .update({ stripe_customer_id: customer.id })
        .eq('id', auth.tenantId)
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      tenantId: auth.tenantId ?? '',
      plan,
    },
    subscription_data: {
      metadata: {
        tenantId: auth.tenantId ?? '',
        plan,
      },
    },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
