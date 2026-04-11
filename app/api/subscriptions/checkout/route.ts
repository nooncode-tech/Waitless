/**
 * POST /api/subscriptions/checkout
 * Crea una Stripe Checkout Session en modo suscripción.
 * Redirige al usuario a Stripe para completar el pago.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurada')
  return new Stripe(key)
}

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  basico:   process.env.STRIPE_PRICE_BASICO,
  pro:      process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
}

export async function POST(req: NextRequest) {
  let body: { plan: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { plan, email } = body

  if (!plan || !PLAN_PRICE_IDS[plan]) {
    return NextResponse.json({ error: 'Plan inválido o no configurado' }, { status: 400 })
  }

  const priceId = PLAN_PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json(
      { error: `Precio para plan "${plan}" no configurado. Agrega STRIPE_PRICE_${plan.toUpperCase()} en las variables de entorno.` },
      { status: 503 }
    )
  }

  try {
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...(email ? { customer_email: email } : {}),
      success_url: `${appUrl}/?plan_success=${plan}`,
      cancel_url: `${appUrl}/?plan_cancelled=1`,
      metadata: { plan },
      subscription_data: { metadata: { plan } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[/api/subscriptions/checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
