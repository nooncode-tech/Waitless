import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)
  const offset = Number(url.searchParams.get('offset') ?? 0)

  const { data: transactions, count } = await supabaseAdmin
    .from('wallet_transactions')
    .select('id, type, amount_cents, balance_after_cents, description, status, created_at, tenant_id', { count: 'exact' })
    .eq('consumer_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({ transactions: transactions ?? [], total: count ?? 0 })
}
