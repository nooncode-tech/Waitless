import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurada')
  return new Stripe(key)
}

export async function getOrCreateStripeCustomer(
  db: SupabaseClient,
  userId: string,
  email: string,
  nombre: string,
): Promise<string> {
  const { data: profile } = await db
    .from('consumer_profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) return profile.stripe_customer_id

  const stripe = getStripeClient()
  const customer = await stripe.customers.create({
    email,
    name: nombre,
    metadata: { consumer_id: userId },
  })

  await db
    .from('consumer_profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}
