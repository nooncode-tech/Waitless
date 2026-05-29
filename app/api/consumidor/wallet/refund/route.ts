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
  const { allowed } = await rateLimit(`wallet-refund:${getClientIp(req)}`, 20, 60_000)
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

  // Crédito atómico vía RPC (evita lost-update bajo concurrencia).
  const { data: rows, error: walletErr } = await supabaseAdmin.rpc('wallet_apply_delta', {
    p_consumer_id:   consumer_id,
    p_cash_delta:    netCents,
    p_rewards_delta: 0,
  })

  if (walletErr || !rows || rows.length === 0) {
    return NextResponse.json({ error: 'Error acreditando saldo' }, { status: 500 })
  }

  const newCash    = rows[0].balance_cash_cents
  const newRewards = rows[0].balance_rewards_cents
  const newTotal   = newCash + newRewards

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
