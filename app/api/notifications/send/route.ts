// P2-4: Send push notification to one or all subscribers

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase-admin'

function initWebPush() {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'admin@waitless.app'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
}

interface SendBody {
  /** Target a specific user by id; omit to send to all subscribers in the tenant */
  userId?: string
  /** Scope broadcast to a specific tenant; omit only for super-admin global sends */
  tenantId?: string
  title: string
  body: string
  url?: string
  icon?: string
}

// POST /api/notifications/send — internal endpoint (service role only)
export async function POST(req: NextRequest) {
  // Require service-role key in Authorization header for internal calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, tenantId, title, body, url, icon }: SendBody = await req.json()

  if (!title || !body) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  initWebPush()

  // Fetch subscriptions — scope by userId or tenantId to avoid cross-tenant sends
  let query = supabaseAdmin.from('push_subscriptions').select('*')
  if (userId) {
    query = query.eq('user_id', userId)
  } else if (tenantId) {
    // Filter via profiles join
    query = supabaseAdmin
      .from('push_subscriptions')
      .select('*, profiles!inner(tenant_id)')
      .eq('profiles.tenant_id', tenantId) as typeof query
  }
  const { data: subs, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }

  const payload = JSON.stringify({ title, body, url: url ?? '/', icon: icon ?? '/icon-192.png' })

  const results = await Promise.allSettled(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
          },
          payload,
        )
        await supabaseAdmin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)
      } catch (err: unknown) {
        const httpError = err as { statusCode?: number }
        // 410 Gone — subscription no longer valid; clean up
        if (httpError?.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
        }
        throw err
      }
    }),
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed })
}
