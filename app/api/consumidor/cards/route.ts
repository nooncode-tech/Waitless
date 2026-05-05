import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'
import { getStripeClient } from '@/lib/stripe-consumer'

export async function GET(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { data: cards } = await supabaseAdmin
    .from('consumer_saved_cards')
    .select('id, alias, brand, last4, exp_month, exp_year, is_default, created_at')
    .eq('consumer_id', auth.userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  const { data: profile } = await supabaseAdmin
    .from('consumer_profiles')
    .select('paypal_email')
    .eq('id', auth.userId)
    .single()

  return NextResponse.json({ cards: cards ?? [], paypalEmail: profile?.paypal_email ?? '' })
}

export async function POST(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const { paymentMethodId, alias } = await req.json()
  if (!paymentMethodId) return NextResponse.json({ error: 'paymentMethodId requerido' }, { status: 400 })

  const stripe = getStripeClient()
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
  if (!pm.card) return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 })

  // Check if card already saved
  const { data: existing } = await supabaseAdmin
    .from('consumer_saved_cards')
    .select('id')
    .eq('consumer_id', auth.userId)
    .eq('stripe_payment_method_id', paymentMethodId)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Esta tarjeta ya está guardada' }, { status: 409 })

  // First card? Set as default
  const { count } = await supabaseAdmin
    .from('consumer_saved_cards')
    .select('id', { count: 'exact', head: true })
    .eq('consumer_id', auth.userId)

  const { data: card, error } = await supabaseAdmin
    .from('consumer_saved_cards')
    .insert({
      consumer_id: auth.userId,
      alias: alias?.trim() || `${pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)} ****${pm.card.last4}`,
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
      stripe_payment_method_id: paymentMethodId,
      is_default: (count ?? 0) === 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ card }, { status: 201 })
}
