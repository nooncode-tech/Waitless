/**
 * POST /api/consumidor/push/subscribe
 * Registers a Web Push subscription for the authenticated consumer.
 *
 * DELETE /api/consumidor/push/subscribe
 * Removes the subscription (opt-out).
 *
 * Body (POST): { endpoint, keys: { p256dh, auth } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(`consumer-push-sub:${getClientIp(req)}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })
  }

  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const body = await req.json()
  const { endpoint, keys } = body ?? {}

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: 'Suscripción inválida — se requiere endpoint, keys.p256dh y keys.auth' },
      { status: 400 },
    )
  }

  const { error } = await supabaseAdmin
    .from('consumer_push_subscriptions')
    .upsert(
      {
        consumer_id: auth.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'consumer_id' },
    )

  if (error) {
    console.error('[consumer-push/subscribe] upsert error:', error.message)
    return NextResponse.json({ error: 'Error registrando suscripción' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  await supabaseAdmin
    .from('consumer_push_subscriptions')
    .delete()
    .eq('consumer_id', auth.userId)

  return NextResponse.json({ ok: true })
}
