/**
 * POST /api/billing/webhook
 * Maneja eventos de Stripe relacionados con suscripciones de plan.
 *
 * Configurar en Stripe Dashboard → Webhooks → Endpoint:
 *   https://[tu-dominio]/api/billing/webhook
 *
 * Eventos requeridos:
 *   - checkout.session.completed       → activa el plan
 *   - customer.subscription.updated    → actualiza plan (upgrade/downgrade)
 *   - customer.subscription.deleted    → baja a starter
 *   - invoice.payment_failed           → registra falla en audit_logs
 *
 * Variable de entorno: STRIPE_BILLING_WEBHOOK_SECRET (separado del webhook de pagos de mesa)
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const PLAN_BY_PRICE: Record<string, 'pro' | 'enterprise'> = {
  [process.env.STRIPE_PRO_PRICE_ID ?? '']:        'pro',
  [process.env.STRIPE_ENTERPRISE_PRICE_ID ?? '']: 'enterprise',
}

function planFromPriceId(priceId: string | null | undefined): 'starter' | 'pro' | 'enterprise' {
  if (!priceId) return 'starter'
  return PLAN_BY_PRICE[priceId] ?? 'starter'
}

async function updateTenantPlan(
  tenantId: string,
  plan: 'starter' | 'pro' | 'enterprise',
  subscriptionId: string | null,
  priceId: string | null,
  eventId: string
) {
  await supabaseAdmin
    .from('tenants')
    .update({
      plan,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
    })
    .eq('id', tenantId)

  await supabaseAdmin.from('audit_logs').insert({
    accion: 'plan_actualizado',
    entidad: 'tenants',
    entidad_id: tenantId,
    detalles: `Stripe ${eventId} → plan: ${plan} | subscription: ${subscriptionId}`,
  })

  console.log(`[billing-webhook] Tenant ${tenantId} → plan ${plan}`)
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe billing no configurado' }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey)
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Firma Stripe requerida' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Firma inválida'
    console.error('[billing-webhook] Firma inválida:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Idempotencia — evitar procesar el mismo evento dos veces
  const { data: already } = await supabaseAdmin
    .from('audit_logs')
    .select('id')
    .like('detalles', `%${event.id}%`)
    .limit(1)
    .maybeSingle()

  if (already) {
    return NextResponse.json({ received: true, skipped: 'already_processed' })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const tenantId = session.metadata?.tenantId
        const plan = (session.metadata?.plan ?? 'starter') as 'pro' | 'enterprise'
        const subscriptionId = session.subscription as string | null

        if (!tenantId) {
          console.warn('[billing-webhook] checkout.session.completed sin tenantId en metadata')
          break
        }

        // Obtener priceId de la suscripción
        let priceId: string | null = null
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          priceId = sub.items.data[0]?.price.id ?? null
        }

        await updateTenantPlan(tenantId, plan, subscriptionId, priceId, event.id)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const tenantId = sub.metadata?.tenantId

        if (!tenantId) {
          // Buscar tenant por stripe_customer_id
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
          const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (!tenant) {
            console.warn(`[billing-webhook] No se encontró tenant para customer ${customerId}`)
            break
          }

          const priceId = sub.items.data[0]?.price.id ?? null
          const plan = planFromPriceId(priceId)
          await updateTenantPlan(tenant.id as string, plan, sub.id, priceId, event.id)
        } else {
          const priceId = sub.items.data[0]?.price.id ?? null
          const plan = planFromPriceId(priceId)
          await updateTenantPlan(tenantId, plan, sub.id, priceId, event.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const tenantId = sub.metadata?.tenantId

        const resolvedTenantId = tenantId ?? await (async () => {
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
          const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()
          return tenant?.id as string | undefined
        })()

        if (resolvedTenantId) {
          await updateTenantPlan(resolvedTenantId, 'starter', null, null, event.id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

        await supabaseAdmin.from('audit_logs').insert({
          accion: 'pago_plan_fallido',
          entidad: 'tenants',
          detalles: `Stripe invoice.payment_failed — ${event.id} | customer: ${customerId} | invoice: ${invoice.id}`,
        })

        console.warn(`[billing-webhook] Pago de plan fallido para customer ${customerId}`)
        break
      }

      default:
        console.log(`[billing-webhook] Evento no manejado: ${event.type}`)
    }
  } catch (err) {
    console.error('[billing-webhook] Error procesando evento:', err)
    return NextResponse.json({ received: true, warning: 'error_interno' })
  }

  return NextResponse.json({ received: true })
}
