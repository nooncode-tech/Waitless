/**
 * GET /api/admin/disputes
 * Lists all dispute_tickets for the tenant, newest first.
 * Optional ?status= filter.
 * Auth: admin or manager.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if ('error' in auth) return auth.error

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Requiere cuenta de restaurante' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status')

  let query = supabaseAdmin
    .from('dispute_tickets')
    .select(
      'id, consumer_id, order_id, motivo, descripcion, foto_urls, status, resolucion, restaurante_respuesta, restaurante_respondio_at, resolved_at, created_at, updated_at',
    )
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data: disputes } = await query

  return NextResponse.json({ disputes: disputes ?? [] })
}
