import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, numero, canal, status, cocina_a_status, total, subtotal, impuestos, created_at, tenant_id, items, nombre_cliente, payment_status, payment_method')
    .eq('consumer_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!orders || orders.length === 0) {
    return NextResponse.json({ orders: [] })
  }

  // Fetch restaurant names for display
  const tenantIds = [...new Set(orders.map(o => o.tenant_id).filter(Boolean))]
  const { data: tenants } = tenantIds.length > 0
    ? await supabaseAdmin
        .from('tenants')
        .select('id, nombre, slug, logo_url')
        .in('id', tenantIds)
    : { data: [] }

  const tenantMap = Object.fromEntries((tenants ?? []).map(t => [t.id, t]))

  const enriched = orders.map(order => ({
    ...order,
    restaurant: order.tenant_id ? tenantMap[order.tenant_id] ?? null : null,
  }))

  return NextResponse.json({ orders: enriched })
}
