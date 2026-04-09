/**
 * GET /api/payments/status?stripe_session_id=cs_xxx
 * Returns the bill_status of the table_session associated with a Stripe
 * Checkout Session. Used by /payment-success to poll until the webhook
 * has updated the DB state.
 *
 * No auth required: the stripe_session_id is opaque and short-lived.
 * Only returns { bill_status } — no other session data is exposed.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const stripeSessionId = req.nextUrl.searchParams.get('stripe_session_id')

  if (!stripeSessionId?.startsWith('cs_')) {
    return NextResponse.json({ error: 'stripe_session_id inválido' }, { status: 400 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  // Retrieve sessionId from Stripe metadata (avoids storing a mapping table)
  let sessionId: string | null = null
  try {
    const stripe = new Stripe(stripeKey)
    const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId)
    sessionId = stripeSession.metadata?.sessionId ?? null
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar la sesión en Stripe' }, { status: 502 })
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'Sesión de pago no asociada a una mesa' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('table_sessions')
    .select('bill_status')
    .eq('id', sessionId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ bill_status: data.bill_status })
}
