/**
 * POST /api/payments/create-intent
 * Creates a payment intent via the configured provider (Stripe).
 * Protected: requires active mesero | manager | admin role (validated against DB).
 *
 * Sprint 1 — hardening:
 * - sessionId validated against DB (exists, activa, estado cobrable)
 * - Amount calculated server-side from orders in DB (never trusted from frontend)
 * - Idempotency key embedded in metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { getPaymentProvider, isPaymentProviderConfigured } from '@/lib/payments'
import { supabaseAdmin } from '@/lib/supabase-admin'

const COBRABLE_STATES = ['abierta', 'en_pago']

export async function POST(req: NextRequest) {
  // ── Auth + role check (validates JWT AND DB role/activo) ────────────────────
  const auth = await requireRole(req, ['mesero', 'manager', 'admin'])
  if ('error' in auth) return auth.error

  // ── Payment provider check ──────────────────────────────────────────────────
  if (!isPaymentProviderConfigured()) {
    return NextResponse.json(
      { error: 'Proveedor de pagos no configurado. Contacta al administrador.' },
      { status: 503 },
    )
  }

  // ── Body validation ─────────────────────────────────────────────────────────
  let body: { sessionId: string; currency?: string; description?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { sessionId, currency = 'ars', description } = body

  if (!sessionId) {
    return NextResponse.json({ error: 'Falta campo requerido: sessionId' }, { status: 400 })
  }

  // ── Validar sesión contra DB — scoped to tenant ──────────────────────────────
  let sessionQuery = supabaseAdmin
    .from('table_sessions')
    .select('id, bill_status, activa, mesa')
    .eq('id', sessionId)

  if (auth.tenantId) {
    sessionQuery = sessionQuery.eq('tenant_id', auth.tenantId)
  }

  const { data: session, error: sessionError } = await sessionQuery.single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  if (!session.activa || !COBRABLE_STATES.includes(session.bill_status as string)) {
    return NextResponse.json(
      { error: `Sesión no cobrable (estado: ${session.bill_status}, activa: ${session.activa})` },
      { status: 409 },
    )
  }

  // ── Calcular monto real desde orders en DB (scoped por tenant) ─────────────
  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('total')
    .eq('session_id', sessionId)
    .eq('cancelado', false)
  if (auth.tenantId) {
    ordersQuery = ordersQuery.eq('tenant_id', auth.tenantId)
  }
  const { data: orders, error: ordersError } = await ordersQuery

  if (ordersError) {
    console.error('[/api/payments/create-intent] Error obteniendo orders:', ordersError.message)
    return NextResponse.json({ error: 'Error calculando monto' }, { status: 500 })
  }

  const totalAmount = (orders ?? []).reduce((sum, o) => sum + Number(o.total ?? 0), 0)

  if (totalAmount <= 0) {
    return NextResponse.json({ error: 'No hay items para cobrar en esta sesión' }, { status: 400 })
  }

  const amountCents = Math.round(totalAmount * 100)

  // ── Marcar sesión como en_pago ───────────────────────────────────────────────
  await supabaseAdmin
    .from('table_sessions')
    .update({ bill_status: 'en_pago' })
    .eq('id', sessionId)
    .eq('bill_status', 'abierta') // solo si está abierta, evitar sobreescribir en_pago

  // ── Create payment ──────────────────────────────────────────────────────────
  try {
    const provider = getPaymentProvider()
    const idempotencyKey = `${sessionId}-${amountCents}`
    const result = await provider.createPayment({
      amountCents,
      currency,
      description: description ?? `Mesa ${session.mesa} — sesión ${sessionId}`,
      metadata: { sessionId, userId: auth.userId, idempotencyKey, ...(auth.tenantId ? { tenantId: auth.tenantId } : {}) },
    })

    return NextResponse.json({ ...result, amountCents })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[/api/payments/create-intent]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
