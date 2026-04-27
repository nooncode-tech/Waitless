/**
 * GET /api/tracking/[orderId]
 * Devuelve el estado público de una orden de delivery sin autenticación.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, numero, status, canal, nombre_cliente, direccion, zona_reparto, updated_at, created_at')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  }

  if (data.canal !== 'delivery' && data.canal !== 'para_llevar') {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  }

  return NextResponse.json({
    id:           data.id,
    numero:       data.numero,
    status:       data.status,
    canal:        data.canal,
    nombreCliente: data.nombre_cliente,
    direccion:    data.direccion,
    zonaReparto:  data.zona_reparto,
    updatedAt:    data.updated_at,
    createdAt:    data.created_at,
  })
}
