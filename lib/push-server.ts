/**
 * Server-side push notification helpers.
 * Use from API routes — NOT in client components (uses supabaseAdmin + webpush).
 */

import webpush from 'web-push'
import { supabaseAdmin } from './supabase-admin'

function initVapid() {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'admin@waitless.app'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  return true
}

/** Push a notification to a specific consumer (by consumer_id). */
export async function pushToConsumer(
  consumerId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!initVapid()) return

  const { data: sub } = await supabaseAdmin
    .from('consumer_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('consumer_id', consumerId)
    .single()

  if (!sub) return

  const data = JSON.stringify({ ...payload, icon: '/icon-192.png' })

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
      data,
    )
    await supabaseAdmin
      .from('consumer_push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', sub.id)
  } catch (err: unknown) {
    if ((err as { statusCode?: number })?.statusCode === 410) {
      await supabaseAdmin.from('consumer_push_subscriptions').delete().eq('id', sub.id)
    }
  }
}

/** Push a notification to ALL staff subscribers in a tenant. */
export async function pushToTenantStaff(
  tenantId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!initVapid()) return

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, profiles!inner(tenant_id)')
    .eq('profiles.tenant_id', tenantId)

  if (!subs || subs.length === 0) return

  const data = JSON.stringify({ ...payload, icon: '/icon-192.png' })

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
          data,
        )
        await supabaseAdmin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)
      } catch (err: unknown) {
        if ((err as { statusCode?: number })?.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }),
  )
}
