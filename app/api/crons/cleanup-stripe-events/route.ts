import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabaseAdmin
    .from('processed_stripe_events')
    .delete()
    .lt('processed_at', cutoff)

  if (error) {
    console.error('[cleanup-stripe-events]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[cleanup-stripe-events] Cleaned events older than 7 days')
  return NextResponse.json({ ok: true })
}
