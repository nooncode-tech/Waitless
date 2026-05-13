/**
 * POST /api/crons/expire-wallet-rewards
 * Runs daily at 4:00 AM UTC (configured in vercel.json).
 * Marks expired wallet_rewards as 'expired' and decrements
 * balance_rewards_cents in consumer_wallet accordingly.
 *
 * Auth: CRON_SECRET header required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Find all active rewards that have expired
  const { data: expired, error: fetchErr } = await supabaseAdmin
    .from('wallet_rewards')
    .select('id, consumer_id, amount_cents')
    .eq('status', 'active')
    .lt('expires_at', now)

  if (fetchErr) {
    console.error('[expire-wallet-rewards] fetch error:', fetchErr.message)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    console.log('[expire-wallet-rewards] Nothing to expire')
    return NextResponse.json({ expired: 0 })
  }

  // Group total expired amount per consumer
  const byConsumer: Record<string, number> = {}
  for (const r of expired) {
    byConsumer[r.consumer_id] = (byConsumer[r.consumer_id] ?? 0) + r.amount_cents
  }

  let processed = 0
  let failed = 0

  for (const [consumerId, totalExpired] of Object.entries(byConsumer)) {
    const { data: wallet } = await supabaseAdmin
      .from('consumer_wallet')
      .select('balance_rewards_cents')
      .eq('consumer_id', consumerId)
      .maybeSingle()

    const currentRewards = wallet?.balance_rewards_cents ?? 0
    const newRewards = Math.max(0, currentRewards - totalExpired)

    const { error: updateErr } = await supabaseAdmin
      .from('consumer_wallet')
      .update({ balance_rewards_cents: newRewards })
      .eq('consumer_id', consumerId)

    if (updateErr) {
      console.error(`[expire-wallet-rewards] update failed for consumer ${consumerId}:`, updateErr.message)
      failed++
    } else {
      processed++
    }
  }

  // Mark all expired rewards in one batch
  const expiredIds = expired.map(r => r.id)
  await supabaseAdmin
    .from('wallet_rewards')
    .update({ status: 'expired', expired_at: now })
    .in('id', expiredIds)

  console.log(`[expire-wallet-rewards] Done — processed: ${processed} consumers, expired: ${expired.length} rewards, failed: ${failed}`)
  return NextResponse.json({ expired: expired.length, consumers: processed, failed })
}
