import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const canal = url.searchParams.get('canal')
  const q = url.searchParams.get('q')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const limit = 30
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact' })
    .or('status.eq.entregado,cancelado.eq.true')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (auth.tenantId) query = query.eq('tenant_id', auth.tenantId)
  if (canal && canal !== 'all') query = query.eq('canal', canal)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to + 'T23:59:59Z')
  if (q) {
    query = query.or(
      `nombre_cliente.ilike.%${q}%,telefono.ilike.%${q}%,email.ilike.%${q}%`
    )
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const orders = (data ?? []).map(row => ({
    id: row.id as string,
    numero: row.numero as number,
    canal: row.canal as string,
    mesa: row.mesa as number | null,
    items: row.items as unknown[],
    status: row.status as string,
    nombreCliente: (row.nombre_cliente as string | null) ?? null,
    telefono: (row.telefono as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    direccion: (row.direccion as string | null) ?? null,
    zonaReparto: (row.zona_reparto as string | null) ?? null,
    notas: (row.notas as string | null) ?? null,
    cancelado: (row.cancelado as boolean) ?? false,
    cancelReason: (row.cancel_reason as string | null) ?? null,
    cancelMotivo: (row.cancel_motivo as string | null) ?? null,
    subtotal: Number(row.subtotal ?? 0),
    impuestos: Number(row.impuestos ?? 0),
    propina: Number(row.propina ?? 0),
    total: Number(row.total ?? 0),
    paymentMethod: (row.payment_method as string | null) ?? null,
    paymentStatus: (row.payment_status as string | null) ?? null,
    createdAt: row.created_at as string,
    tiempoFinPreparacion: (row.tiempo_fin_preparacion as string | null) ?? null,
  }))

  return NextResponse.json({ orders, total: count ?? 0, page, limit })
}
