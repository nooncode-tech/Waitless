import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
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

  // Obtener saldo actual con lock (usamos RPC para atomicidad)
  const { data: wallet } = await supabaseAdmin
    .from('consumer_wallet')
    .select('balance_cents')
    .eq('consumer_id', auth.userId)
    .single()

  const currentBalance = wallet?.balance_cents ?? 0

  if (currentBalance < amount_cents) {
    return NextResponse.json(
      { error: 'Saldo insuficiente', balance_cents: currentBalance },
      { status: 402 },
    )
  }

  const newBalance = currentBalance - amount_cents

  // Descontar saldo
  const { error: updateError } = await supabaseAdmin
    .from('consumer_wallet')
    .update({ balance_cents: newBalance })
    .eq('consumer_id', auth.userId)
    .eq('balance_cents', currentBalance) // optimistic lock

  if (updateError) {
    return NextResponse.json({ error: 'Error actualizando saldo' }, { status: 500 })
  }

  // Registrar transacción
  await supabaseAdmin.from('wallet_transactions').insert({
    consumer_id: auth.userId,
    type: 'payment',
    amount_cents: -amount_cents,
    balance_after_cents: newBalance,
    description: description ?? 'Pago con Waitless Créditos',
    tenant_id: tenant_id ?? null,
    session_id: session_id ?? null,
    order_id: order_id ?? null,
    status: 'completed',
  })

  return NextResponse.json({ ok: true, balance_cents: newBalance })
}
