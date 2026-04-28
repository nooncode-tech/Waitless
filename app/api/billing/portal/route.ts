/**
 * POST /api/billing/portal
 * Genera un link al Stripe Customer Portal para gestionar la suscripción
 * (cambiar plan, actualizar tarjeta, cancelar).
 * Protegido: solo admin del tenant.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  let body: { returnUrl: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Sin tenant asociado' }, { status: 400 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', auth.tenantId)
    .single()

  if (!tenant?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No hay suscripción activa. Contrata un plan primero.' },
      { status: 404 }
    )
  }

  const stripe = new Stripe(stripeKey)
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id as string,
    return_url: body.returnUrl,
  })

  return NextResponse.json({ url: portalSession.url })
}
