// P2-4: Push subscription management API
// Sprint 3: usa requireAuth (verifica JWT + activo en DB) en lugar de auth inline

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/notifications/subscribe — save a push subscription
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const userId = auth.userId

  const body = await req.json()
  const { endpoint, p256dh, auth: pushAuth, userAgent } = body

  if (!endpoint || !p256dh || !pushAuth) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint,
      p256dh,
      auth: pushAuth,
      user_agent: userAgent ?? null,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

  if (error) {
    console.error('[push/subscribe]', error.message)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

// DELETE /api/notifications/subscribe — remove a push subscription
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return auth.error
  const userId = auth.userId

  const body = await req.json()
  const { endpoint } = body

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)

  if (error) {
    console.error('[push/unsubscribe]', error.message)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
