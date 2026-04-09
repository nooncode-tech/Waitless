/**
 * POST /api/payments/cancel
 * Reverts a table_session from 'en_pago' back to 'abierta' when the customer
 * abandons the Stripe Checkout page and lands on /payment-cancelled.
 *
 * No auth required: the sessionId is the scope key (only the party that knows
 * the session ID, obtained via QR or staff UI, can trigger this).
 *
 * Invariant: only transitions en_pago → abierta.
 * Already-paid, closed, or open sessions are left unchanged (idempotent).
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  let sessionId: string | undefined
  try {
    const body = await req.json()
    sessionId = body.sessionId
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (!sessionId?.trim()) {
    return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
  }

  // Only revert if the session is currently in 'en_pago' state.
  // Using .eq('bill_status', 'en_pago') ensures idempotency.
  const { error } = await supabaseAdmin
    .from('table_sessions')
    .update({ bill_status: 'abierta' })
    .eq('id', sessionId)
    .eq('bill_status', 'en_pago')

  if (error) {
    console.error('[/api/payments/cancel]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
