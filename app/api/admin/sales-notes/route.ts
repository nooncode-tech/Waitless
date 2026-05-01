/**
 * GET /api/admin/sales-notes
 * Lista notas de venta internas del tenant.
 * Query params: status, from (ISO date), to (ISO date), limit (default 100)
 * Requiere: admin o manager
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
  const limit = parseInt(searchParams.get('limit') ?? '100')

  let query = supabaseAdmin
    .from('internal_sales_notes')
    .select(`
      *,
      table_sessions (id, mesa),
      payments (
        id, monto_requerido, moneda,
        payment_methods (nombre, tipo)
      )
    `)
    .order('generated_at', { ascending: false })
    .limit(limit)

  if (auth.tenantId) query = query.eq('tenant_id', auth.tenantId)
  if (status) query = query.eq('status', status)
  if (from) query = query.gte('generated_at', from)
  if (to) query = query.lte('generated_at', to)

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/admin/sales-notes]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notes: data ?? [] })
}
