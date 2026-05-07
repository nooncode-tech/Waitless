import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const range = url.searchParams.get('range') ?? '7d'

  const now = new Date()
  let from: Date
  if (range === 'hoy') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (range === '30d') {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  } else {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  const fromISO = from.toISOString()

  // Sesiones cerradas por método de pago
  let sessionsQuery = supabaseAdmin
    .from('table_sessions')
    .select('payment_method, total')
    .eq('payment_status', 'pagado')
    .gte('created_at', fromISO)

  if (auth.tenantId) {
    sessionsQuery = sessionsQuery.eq('tenant_id', auth.tenantId)
  }

  const { data: sessions } = await sessionsQuery

  // Órdenes delivery/para llevar por método de pago
  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('payment_method, total, payment_status')
    .eq('payment_status', 'pagado')
    .in('canal', ['delivery', 'para_llevar'])
    .gte('created_at', fromISO)

  if (auth.tenantId) {
    ordersQuery = ordersQuery.eq('tenant_id', auth.tenantId)
  }

  const { data: orders } = await ordersQuery

  // Créditos Waitless recibidos (wallet_transactions de tipo payment hacia este tenant)
  let walletQuery = supabaseAdmin
    .from('wallet_transactions')
    .select('amount_cents')
    .eq('type', 'payment')
    .eq('status', 'completed')
    .gte('created_at', fromISO)

  if (auth.tenantId) {
    walletQuery = walletQuery.eq('tenant_id', auth.tenantId)
  }

  const { data: walletTxns } = await walletQuery

  // Agrupar por método
  const breakdown: Record<string, number> = {}

  for (const s of sessions ?? []) {
    const method = s.payment_method ?? 'sin_especificar'
    breakdown[method] = (breakdown[method] ?? 0) + Number(s.total ?? 0)
  }

  for (const o of orders ?? []) {
    const method = o.payment_method ?? 'sin_especificar'
    breakdown[method] = (breakdown[method] ?? 0) + Number(o.total ?? 0)
  }

  // Waitless créditos desde wallet_transactions (amount_cents es negativo en el consumidor, positivo aquí es lo recibido)
  const walletTotal = (walletTxns ?? []).reduce((sum, t) => sum + Math.abs(t.amount_cents) / 100, 0)
  if (walletTotal > 0) {
    breakdown['waitless_creditos'] = (breakdown['waitless_creditos'] ?? 0) + walletTotal
  }

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0)

  return NextResponse.json({ breakdown, total, range, from: fromISO })
}
