import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

const MIN_RECHARGE_CENTS = 100   // $1.00
const MAX_RECHARGE_CENTS = 500000 // $5000.00

export async function POST(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  let body: { amount_cents: number; currency?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { amount_cents, currency = 'usd' } = body

  if (!amount_cents || amount_cents < MIN_RECHARGE_CENTS || amount_cents > MAX_RECHARGE_CENTS) {
    return NextResponse.json(
      { error: `Monto debe estar entre $${MIN_RECHARGE_CENTS / 100} y $${MAX_RECHARGE_CENTS / 100}` },
      { status: 400 },
    )
  }

  // Obtener o crear customer de Stripe para el consumidor
  const { data: profile } = await supabaseAdmin
    .from('consumer_profiles')
    .select('stripe_customer_id, email, nombre')
    .eq('id', auth.userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const stripe = new Stripe(stripeKey)
  let customerId = profile.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.nombre,
      metadata: { consumer_id: auth.userId },
    })
    customerId = customer.id
    await supabaseAdmin
      .from('consumer_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', auth.userId)
  }

  // Crear transacción pendiente
  const { data: txn } = await supabaseAdmin
    .from('wallet_transactions')
    .insert({
      consumer_id: auth.userId,
      type: 'recharge',
      amount_cents,
      description: `Recarga de monedero — $${(amount_cents / 100).toFixed(2)}`,
      status: 'pending',
    })
    .select('id')
    .single()

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount_cents,
    currency,
    customer: customerId,
    metadata: {
      type: 'wallet_recharge',
      consumer_id: auth.userId,
      amount_cents: String(amount_cents),
      transaction_id: txn?.id ?? '',
    },
    automatic_payment_methods: { enabled: true },
  })

  // Guardar el payment intent id en la transacción
  if (txn?.id) {
    await supabaseAdmin
      .from('wallet_transactions')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', txn.id)
  }

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
