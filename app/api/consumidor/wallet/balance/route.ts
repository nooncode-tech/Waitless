import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { data: wallet } = await supabaseAdmin
    .from('consumer_wallet')
    .select('balance_cents, updated_at')
    .eq('consumer_id', auth.userId)
    .maybeSingle()

  const { data: transactions } = await supabaseAdmin
    .from('wallet_transactions')
    .select('id, type, amount_cents, balance_after_cents, description, status, created_at, tenant_id')
    .eq('consumer_id', auth.userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    balance_cents: wallet?.balance_cents ?? 0,
    transactions: transactions ?? [],
  })
}
