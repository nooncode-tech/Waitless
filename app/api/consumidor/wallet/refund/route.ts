/**
 * POST /api/consumidor/wallet/refund
 * Credits a refund (cash) to the consumer's wallet.
 * Called internally by dispute resolution — not exposed to consumers directly.
 * Requires admin or service role via requireRole, or service-key via body.secret.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`wallet-refund:${getClientIp(req)}`, 20, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })

  const auth = await requireRole(req, ['admin', 'manager'])
  if ('error' in auth) return auth.error

  let body: { consumer_id: string; amount_cents: number; reason?: string; order_id?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { consumer_id, amount_cents, reason, order_id } = body

  if (!consumer_id) return NextResponse.json({ error: 'consumer_id requerido' }, { status: 400 })
  if (!amount_cents || amount_cents <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })

  // Waitless retains 5% mediation fee — consumer receives 95%
  const netCents = Math.round(amount_cents * 0.95)

  const { data: wallet } = await supabaseAdmin
    .from('consumer_wallet')
    .select('balance_cash_cents, balance_rewards_cents')
    .eq('consumer_id', consumer_id)
    .maybeSingle()

  const newCash    = (wallet?.balance_cash_cents    ?? 0) + netCents
  const newRewards = wallet?.balance_rewards_cents  ?? 0
  const newTotal   = newCash + newRewards

  await supabaseAdmin
    .from('consumer_wallet')
    .upsert(
      { consumer_id, balance_cash_cents: newCash, balance_rewards_cents: newRewards },
      { onConflict: 'consumer_id' },
    )

  await supabaseAdmin.from('wallet_transactions').insert({
    consumer_id,
    type:               'refund',
    amount_cents:        netCents,
    balance_after_cents: newTotal,
    description:        reason ?? 'Reembolso a monedero',
    order_id:           order_id ?? null,
    tenant_id:          auth.tenantId ?? null,
    status:             'completed',
    balance_type:       'cash',
  })

  return NextResponse.json({ ok: true, balance_cents: newTotal, gross_cents: amount_cents, net_cents: netCents })
}
