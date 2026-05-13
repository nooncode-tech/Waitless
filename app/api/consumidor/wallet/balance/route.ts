import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { data: wallet } = await supabaseAdmin
    .from('consumer_wallet')
    .select('balance_cash_cents, balance_rewards_cents, updated_at')
    .eq('consumer_id', auth.userId)
    .maybeSingle()

  const { data: transactions } = await supabaseAdmin
    .from('wallet_transactions')
    .select('id, type, amount_cents, balance_after_cents, description, status, created_at, tenant_id, balance_type')
    .eq('consumer_id', auth.userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20)

  const balance_cash_cents    = wallet?.balance_cash_cents    ?? 0
  const balance_rewards_cents = wallet?.balance_rewards_cents ?? 0

  return NextResponse.json({
    balance_cash_cents,
    balance_rewards_cents,
    balance_cents: balance_cash_cents + balance_rewards_cents,
    transactions: transactions ?? [],
  })
}
