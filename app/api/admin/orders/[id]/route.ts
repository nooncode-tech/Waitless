import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendOrderCancellation } from '@/lib/email'
import { pushToConsumer } from '@/lib/push-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, ['admin', 'manager', 'mesero', 'cocina'])
  if ('error' in auth) return auth.error

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const allowed = ['status', 'cancelado', 'cancel_reason', 'cancel_motivo', 'cancelado_por',
    'cancelado_at', 'tiempo_inicio_preparacion', 'tiempo_fin_preparacion', 'updated_at']

  const payload: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) payload[key] = body[key]
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('orders').update(payload).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Auto-push consumer on recibido / listo (fire-and-forget)
  if (payload.status === 'recibido' || payload.status === 'listo') {
    const { data: ord } = await supabaseAdmin
      .from('orders')
      .select('numero, email, canal')
      .eq('id', id)
      .maybeSingle()

    if (ord?.email) {
      const { data: consumer } = await supabaseAdmin
        .from('consumer_profiles')
        .select('id')
        .eq('email', (ord.email as string).toLowerCase())
        .maybeSingle()

      if (consumer) {
        const msg = payload.status === 'recibido'
          ? { title: '¡Pedido confirmado!', body: `Tu pedido #${ord.numero} fue aceptado y está en preparación.` }
          : {
              title: 'Pedido listo',
              body: (ord.canal as string) === 'delivery'
                ? `Tu pedido #${ord.numero} está listo para despacho.`
                : `Tu pedido #${ord.numero} está listo para retirar.`,
            }
        pushToConsumer(consumer.id, { ...msg, url: '/consumidor/pedidos' }).catch(() => {})
      }
    }
  }

  // Send cancellation email if applicable
  if (payload.status === 'cancelado') {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('numero, email, nombre_cliente, tenant_id')
      .eq('id', id)
      .maybeSingle()

    if (order?.email) {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('nombre')
        .eq('id', order.tenant_id)
        .maybeSingle()

      sendOrderCancellation({
        to:            order.email as string,
        nombreCliente: (order.nombre_cliente as string | null) ?? 'Cliente',
        numeroPedido:  order.numero as number,
        restaurante:   (tenant?.nombre as string | null) ?? 'el restaurante',
        motivo:        (payload.cancel_motivo ?? payload.cancel_reason) as string | undefined,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}
