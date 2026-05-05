import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'
import { getStripeClient, getOrCreateStripeCustomer } from '@/lib/stripe-consumer'

export async function POST(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const { data: profile } = await supabaseAdmin
    .from('consumer_profiles')
    .select('email, nombre, stripe_customer_id')
    .eq('id', auth.userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const customerId = await getOrCreateStripeCustomer(
    supabaseAdmin as any,
    auth.userId,
    profile.email,
    profile.nombre,
  )

  const stripe = getStripeClient()
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  })

  return NextResponse.json({ clientSecret: setupIntent.client_secret })
}
