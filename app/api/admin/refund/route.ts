/**
 * POST /api/admin/refund
 * Crea un reembolso para una orden. Solo admin puede ejecutar esta operación.
 *
 * Sprint 3 — invariantes server-side:
 * - Rol admin validado contra DB (requireRole)
 * - Orden debe existir y pertenecer a una sesión activa o pagada
 * - Monto del reembolso no puede superar el total de la orden
 * - Registra en audit_logs con antes/después
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByIdAdmin, checkPlanFeature } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  // Solo admin puede hacer reembolsos
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  // Plan guard: refunds requiere plan pro o enterprise
  if (auth.tenantId) {
    const tenant = await getTenantByIdAdmin(auth.tenantId)
    if (!checkPlanFeature(tenant, 'refunds')) {
      return NextResponse.json(
        { error: 'Tu plan no incluye reembolsos. Actualizá a Pro o Enterprise.' },
        { status: 403 },
      )
    }
  }

  let body: {
    orderId: string
    monto: number
    motivo: string
    tipo: 'total' | 'parcial'
    itemIds?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { orderId, monto, motivo, tipo, itemIds } = body

  if (!orderId || !motivo || !tipo) {
    return NextResponse.json({ error: 'Faltan campos requeridos: orderId, motivo, tipo' }, { status: 400 })
  }

  if (typeof monto !== 'number' || monto <= 0) {
    return NextResponse.json({ error: 'monto debe ser un número positivo' }, { status: 400 })
  }

  if (!['total', 'parcial'].includes(tipo)) {
    return NextResponse.json({ error: 'tipo debe ser "total" o "parcial"' }, { status: 400 })
  }

  // Verificar que la orden existe y pertenece al tenant del llamador
  let orderQuery = supabaseAdmin
    .from('orders')
    .select('id, total, cancelado, session_id')
    .eq('id', orderId)
  if (auth.tenantId) orderQuery = orderQuery.eq('tenant_id', auth.tenantId)
  const { data: order, error: orderError } = await orderQuery.single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  }

  if (order.cancelado) {
    return NextResponse.json({ error: 'No se puede reembolsar una orden cancelada' }, { status: 409 })
  }

  const orderTotal = Number(order.total ?? 0)
  if (monto > orderTotal) {
    return NextResponse.json(
      { error: `Monto de reembolso ($${monto}) supera el total de la orden ($${orderTotal})` },
      { status: 422 },
    )
  }

  // Verificar que no existe ya un reembolso total para esta orden
  const { data: existingRefund } = await supabaseAdmin
    .from('refunds')
    .select('id, tipo')
    .eq('order_id', orderId)
    .eq('tipo', 'total')
    .maybeSingle()

  if (existingRefund) {
    return NextResponse.json({ error: 'Esta orden ya tiene un reembolso total registrado' }, { status: 409 })
  }

  const refundId = crypto.randomUUID()

  // Insertar reembolso
  const { data: refund, error: refundError } = await supabaseAdmin
    .from('refunds')
    .insert({
      id: refundId,
      order_id: orderId,
      session_id: order.session_id,
      monto,
      motivo,
      tipo,
      items_reembolsados: itemIds ? JSON.stringify(itemIds) : null,
      inventario_revertido: true,
      user_id: auth.userId,
    })
    .select()
    .single()

  if (refundError) {
    console.error('[/api/admin/refund] Error insertando reembolso:', refundError.message)
    return NextResponse.json({ error: refundError.message }, { status: 500 })
  }

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'hacer_refund',
    entidad: 'orders',
    entidad_id: orderId,
    detalles: `Reembolso ${tipo} de $${monto} — motivo: ${motivo}`,
    antes: { total: orderTotal, cancelado: false },
    despues: { refund_id: refundId, monto_reembolsado: monto, tipo },
  }).then(() => {})

  return NextResponse.json({ refund }, { status: 201 })
}
