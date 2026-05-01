/**
 * GET /api/admin/payments
 * Lista pagos del tenant con filtros opcionales.
 * Query params: status, from (ISO date), to (ISO date), mesa
 * Requiere: admin o manager con permiso validar_pago
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if ('error' in auth) return auth.error

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const mesa = searchParams.get('mesa')

  let query = supabaseAdmin
    .from('payments')
    .select(`
      *,
      payment_methods (id, nombre, tipo),
      table_sessions (id, mesa),
      payment_receipts (id, file_url, file_type, referencia, monto_declarado, review_status, created_at)
    `)
    .order('created_at', { ascending: false })

  if (auth.tenantId) {
    query = query.eq('tenant_id', auth.tenantId)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (from) {
    query = query.gte('created_at', from)
  }
  if (to) {
    query = query.lte('created_at', to)
  }
  if (mesa) {
    query = query.eq('table_sessions.mesa', parseInt(mesa))
  }

  const { data, error } = await query.limit(200)

  if (error) {
    console.error('[GET /api/admin/payments]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payments: data ?? [] })
}
