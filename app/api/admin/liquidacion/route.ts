/**
 * GET /api/admin/liquidacion
 * Returns the liquidaciones (weekly settlements) for the current tenant.
 * Auth: admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Requiere cuenta de restaurante' }, { status: 400 })
  }

  const url = new URL(req.url)
  const limit  = Math.min(Number(url.searchParams.get('limit')  ?? 20), 50)
  const offset = Number(url.searchParams.get('offset') ?? 0)

  const { data, count } = await supabaseAdmin
    .from('liquidaciones')
    .select('*', { count: 'exact' })
    .eq('tenant_id', auth.tenantId)
    .order('period_start', { ascending: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({ liquidaciones: data ?? [], total: count ?? 0 })
}
