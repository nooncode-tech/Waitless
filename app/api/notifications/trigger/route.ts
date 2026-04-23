/**
 * POST /api/notifications/trigger
 * JWT-authenticated endpoint — staff calls this to fire transactional push notifications.
 * Sends to ALL push subscribers (broadcast to all devices that opted in).
 */

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'
import { getTenantByIdAdmin, checkPlanFeature } from '@/lib/tenant'

function initWebPush() {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'admin@waitless.app'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
}

type EventPayload = Record<string, unknown>
type NotificationData = { title: string; body: string; url: string }

const EVENT_BUILDERS: Record<string, (d: EventPayload) => NotificationData> = {
  order_ready: (d) => ({
    title: 'Pedido listo',
    body: d.mesa ? `Mesa ${d.mesa} — pedido listo para entregar` : 'Pedido listo para entregar',
    url: '/mesero',
  }),
  waiter_call: (d) => ({
    title: d.tipo === 'cuenta' ? 'Solicitud de cuenta' : 'Llamada de mesa',
    body: d.tipo === 'cuenta'
      ? `Mesa ${d.mesa} solicita la cuenta`
      : `Mesa ${d.mesa} solicita atención`,
    url: '/mesero',
  }),
  new_qr_order: (d) => ({
    title: 'Nuevo pedido QR',
    body: `Mesa ${d.mesa} — nuevo pedido recibido`,
    url: '/cocina',
  }),
}

export async function POST(req: NextRequest) {
  // ── Auth + role check (validates JWT AND DB role/activo) ───────────────────
  const auth = await requireRole(req, ['mesero', 'manager', 'admin', 'cocina'])
  if ('error' in auth) return auth.error

  // ── Plan guard: push_notifications requiere pro o enterprise ──────────────
  if (auth.tenantId) {
    const tenant = await getTenantByIdAdmin(auth.tenantId)
    if (!checkPlanFeature(tenant, 'push_notifications')) {
      return NextResponse.json(
        { error: 'Tu plan no incluye notificaciones push. Actualizá a Pro o Enterprise.' },
        { status: 403 },
      )
    }
  }

  // ── VAPID config check ─────────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Push no configurado — configura VAPID keys' }, { status: 503 })
  }

  // ── Body ───────────────────────────────────────────────────────────────────
  const { event, data = {} }: { event: string; data?: EventPayload } = await req.json()
  const builder = EVENT_BUILDERS[event]
  if (!builder) {
    return NextResponse.json({ error: `Evento desconocido: ${event}` }, { status: 400 })
  }

  const notification = builder(data)
  const payload = JSON.stringify({ ...notification, icon: '/icon-192.png' })

  // ── Fetch subscriptions — scoped to caller's tenant ───────────────────────
  // If the caller has a tenant_id, only send to subscribers in that tenant.
  // This prevents cross-tenant notification leakage.
  let subsQuery = supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
  if (auth.tenantId) {
    // Join via profiles to filter by tenant
    subsQuery = supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, profiles!inner(tenant_id)')
      .eq('profiles.tenant_id', auth.tenantId) as unknown as typeof subsQuery
  }
  const { data: subs } = await subsQuery

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 })
  }

  initWebPush()

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
          payload,
        )
        await supabaseAdmin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)
      } catch (err: unknown) {
        if ((err as { statusCode?: number })?.statusCode === 410) {
          // Subscription expired — clean up
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
        }
        throw err
      }
    }),
  )

  return NextResponse.json({
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  })
}
