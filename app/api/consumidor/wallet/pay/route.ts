import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`wallet-pay:${getClientIp(req)}`, 15, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })

  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  let body: {
    amount_cents: number
    tenant_id?: string
    session_id?: string
    order_id?: string
    description?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { amount_cents, tenant_id, session_id, order_id, description } = body

  if (!amount_cents || amount_cents <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }

  const { data: wallet } = await supabaseAdmin
    .from('consumer_wallet')
    .select('balance_cash_cents, balance_rewards_cents')
    .eq('consumer_id', auth.userId)
    .single()

  const cashBalance    = wallet?.balance_cash_cents    ?? 0
  const rewardsBalance = wallet?.balance_rewards_cents ?? 0
  const totalBalance   = cashBalance + rewardsBalance

  if (totalBalance < amount_cents) {
    return NextResponse.json(
      { error: 'Saldo insuficiente', balance_cents: totalBalance },
      { status: 402 },
    )
  }

  // Consume rewards first, then cash
  const rewardsUsed    = Math.min(rewardsBalance, amount_cents)
  const cashUsed       = amount_cents - rewardsUsed
  const newRewards     = rewardsBalance - rewardsUsed
  const newCash        = cashBalance - cashUsed
  const newTotal       = newCash + newRewards

  const { error: updateError } = await supabaseAdmin
    .from('consumer_wallet')
    .update({ balance_cash_cents: newCash, balance_rewards_cents: newRewards })
    .eq('consumer_id', auth.userId)
    .eq('balance_cash_cents', cashBalance)    // optimistic lock
    .eq('balance_rewards_cents', rewardsBalance)

  if (updateError) {
    return NextResponse.json({ error: 'Error actualizando saldo' }, { status: 500 })
  }

  const balanceType =
    rewardsUsed > 0 && cashUsed > 0 ? 'mixed'
    : rewardsUsed > 0 ? 'rewards'
    : 'cash'

  await supabaseAdmin.from('wallet_transactions').insert({
    consumer_id:        auth.userId,
    type:               'payment',
    amount_cents:       -amount_cents,
    balance_after_cents: newTotal,
    description:        description ?? 'Pago con Waitless Créditos',
    tenant_id:          tenant_id  ?? null,
    session_id:         session_id ?? null,
    order_id:           order_id   ?? null,
    status:             'completed',
    balance_type:       balanceType,
  })

  return NextResponse.json({ ok: true, balance_cents: newTotal })
}
