/**
 * POST /api/consumidor/push/trigger
 * Sends a targeted push notification to the consumer linked to a specific order.
 * Called by staff (mesero / repartidor / manager / admin) when delivery status changes.
 *
 * Body: { orderId: string, event: 'en_camino' | 'entregado' }
 *
 * Auth: staff Bearer JWT (any restaurant role).
 * The endpoint scopes lookup to the caller's tenant to prevent cross-tenant leakage.
 */

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'
import { sendDeliveryStatus } from '@/lib/email'

type DeliveryEvent = 'en_camino' | 'entregado'

const EVENT_PAYLOADS: Record<DeliveryEvent, (numero: number) => { title: string; body: string }> = {
  en_camino: (numero) => ({
    title: '¡Tu pedido está en camino!',
    body: `Pedido #${numero} — el repartidor ya salió hacia tu dirección.`,
  }),
  entregado: (numero) => ({
    title: 'Pedido entregado',
    body: `Pedido #${numero} fue entregado. ¡Buen provecho!`,
  }),
}

function initWebPush() {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'admin@waitless.app'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['mesero', 'manager', 'admin', 'cocina', 'repartidor'])
  if ('error' in auth) return auth.error

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ skipped: 'vapid_not_configured' })
  }

  const { orderId, event } = await req.json() as { orderId?: string; event?: string }

  if (!orderId || !event) {
    return NextResponse.json({ error: 'Se requiere orderId y event' }, { status: 400 })
  }

  if (!EVENT_PAYLOADS[event as DeliveryEvent]) {
    return NextResponse.json({ error: `Evento desconocido: ${event}` }, { status: 400 })
  }

  // Fetch the order to get consumer email and order number
  const ordersQuery = supabaseAdmin
    .from('orders')
    .select('id, numero, email, canal, tenant_id')
    .eq('id', orderId)

  // Scope to caller's tenant if multi-tenant
  if (auth.tenantId) {
    ordersQuery.eq('tenant_id', auth.tenantId)
  }

  const { data: order } = await ordersQuery.single()

  if (!order || order.canal !== 'delivery') {
    return NextResponse.json({ skipped: 'not_a_delivery_order' })
  }

  // Email fallback (fire-and-forget) — always send regardless of push subscription
  if (order.email) {
    sendDeliveryStatus({
      to:            order.email as string,
      nombreCliente: 'Cliente',
      numeroPedido:  order.numero as number,
      restaurante:   String(auth.tenantId ?? 'Waitless'),
      event:         event as 'en_camino' | 'entregado',
    }).catch(() => {})
  }

  if (!order.email) {
    return NextResponse.json({ skipped: 'no_consumer_email' })
  }

  // Find the consumer by email
  const { data: consumer } = await supabaseAdmin
    .from('consumer_profiles')
    .select('id')
    .eq('email', (order.email as string).toLowerCase())
    .single()

  if (!consumer) {
    return NextResponse.json({ skipped: 'consumer_not_found' })
  }

  // Get their push subscription
  const { data: sub } = await supabaseAdmin
    .from('consumer_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('consumer_id', consumer.id)
    .single()

  if (!sub) {
    return NextResponse.json({ skipped: 'no_subscription' })
  }

  const { title, body } = EVENT_PAYLOADS[event as DeliveryEvent](order.numero as number)
  const payload = JSON.stringify({ title, body, url: '/consumidor/pedidos', icon: '/icon-192.png' })

  initWebPush()

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
      payload,
    )
    await supabaseAdmin
      .from('consumer_push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', sub.id)

    return NextResponse.json({ sent: 1 })
  } catch (err: unknown) {
    if ((err as { statusCode?: number })?.statusCode === 410) {
      // Expired — clean up
      await supabaseAdmin.from('consumer_push_subscriptions').delete().eq('id', sub.id)
    }
    return NextResponse.json({ sent: 0, error: String(err) }, { status: 500 })
  }
}
