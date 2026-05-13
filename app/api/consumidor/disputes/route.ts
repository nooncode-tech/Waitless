/**
 * GET  /api/consumidor/disputes   — list the consumer's disputes
 * POST /api/consumidor/disputes   — open a new dispute on an order
 *
 * Body (POST): { order_id, tenant_id, motivo, descripcion, foto_urls? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'
import { pushToTenantStaff } from '@/lib/push-server'

export async function GET(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { data: disputes } = await supabaseAdmin
    .from('dispute_tickets')
    .select(
      'id, order_id, tenant_id, motivo, descripcion, foto_urls, status, resolucion, created_at, updated_at, restaurante_respuesta, restaurante_respondio_at',
    )
    .eq('consumer_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ disputes: disputes ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  let body: {
    order_id: string
    tenant_id: string
    motivo: string
    descripcion?: string
    foto_urls?: string[]
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { order_id, tenant_id, motivo, descripcion, foto_urls } = body

  if (!order_id || !tenant_id || !motivo) {
    return NextResponse.json({ error: 'order_id, tenant_id y motivo son requeridos' }, { status: 400 })
  }

  // Verify the order belongs to this consumer
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, email, tenant_id')
    .eq('id', order_id)
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  // Verify email matches consumer profile
  const { data: consumer } = await supabaseAdmin
    .from('consumer_profiles')
    .select('email')
    .eq('id', auth.userId)
    .single()

  if (!consumer || order.email !== consumer.email) {
    return NextResponse.json({ error: 'El pedido no pertenece a esta cuenta' }, { status: 403 })
  }

  // Prevent duplicate open disputes on same order
  const { data: existing } = await supabaseAdmin
    .from('dispute_tickets')
    .select('id, status')
    .eq('order_id', order_id)
    .eq('consumer_id', auth.userId)
    .not('status', 'in', '("resuelto_favor_cliente","resuelto_favor_restaurante")')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: `Ya existe un reclamo activo para este pedido (${existing.status})`, dispute: existing },
      { status: 409 },
    )
  }

  const { data: dispute, error: insertErr } = await supabaseAdmin
    .from('dispute_tickets')
    .insert({
      consumer_id:  auth.userId,
      order_id,
      tenant_id,
      motivo,
      descripcion:  descripcion ?? null,
      foto_urls:    foto_urls   ?? [],
      status:       'abierto',
    })
    .select()
    .single()

  if (insertErr) {
    console.error('[disputes] insert error:', insertErr.message)
    return NextResponse.json({ error: 'Error guardando reclamo' }, { status: 500 })
  }

  // Notify restaurant staff (fire-and-forget)
  pushToTenantStaff(tenant_id, {
    title: 'Nuevo reclamo de cliente',
    body: `Motivo: ${motivo}`,
    url: '/admin',
  }).catch(() => {})

  return NextResponse.json({ dispute }, { status: 201 })
}
