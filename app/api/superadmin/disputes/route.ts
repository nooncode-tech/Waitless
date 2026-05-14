/**
 * GET /api/superadmin/disputes
 * Returns all dispute tickets across all tenants for WAITLESS operators.
 * Protected by X-Superadmin-Key header matching SUPERADMIN_KEY env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function checkKey(req: NextRequest) {
  const key = req.headers.get('x-superadmin-key')
  const expected = process.env.SUPERADMIN_KEY
  if (!expected) return { ok: false, error: 'SUPERADMIN_KEY no configurada' }
  if (!key || key !== expected) return { ok: false, error: 'No autorizado' }
  return { ok: true, error: null }
}

export async function GET(req: NextRequest) {
  const { ok, error } = checkKey(req)
  if (!ok) return NextResponse.json({ error }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('dispute_tickets')
    .select('id, consumer_id, order_id, tenant_id, motivo, descripcion, foto_urls, status, resolucion, restaurante_respuesta, restaurante_respondio_at, refund_cents, resolved_at, created_at, tenants(nombre, slug)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: disputes, error: dbErr } = await query

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json({ disputes: disputes ?? [] })
}
