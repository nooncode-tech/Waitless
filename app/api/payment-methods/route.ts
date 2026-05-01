/**
 * GET  /api/payment-methods  — Lista métodos de pago activos del tenant (público, para cliente QR)
 * POST /api/payment-methods  — Crea un método de pago nuevo (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId')
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('payment_methods')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (error) {
    console.error('[GET /api/payment-methods]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const methods = (data ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    tipo: r.tipo,
    moneda: r.moneda,
    instrucciones: r.instrucciones,
    datosPago: r.datos_pago ?? {},
    requiereComprobante: r.requiere_comprobante,
    requiereValidacionManual: r.requiere_validacion_manual,
    orden: r.orden,
  }))

  return NextResponse.json({ methods })
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  let body: {
    nombre: string
    tipo: string
    moneda?: string
    instrucciones?: string
    datosPago?: Record<string, string>
    requiereComprobante?: boolean
    requiereValidacionManual?: boolean
    orden?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { nombre, tipo } = body
  if (!nombre || !tipo) {
    return NextResponse.json({ error: 'Faltan campos requeridos: nombre, tipo' }, { status: 400 })
  }

  const TIPOS_VALIDOS = ['efectivo', 'pago_movil', 'transferencia', 'zelle', 'paypal', 'punto_venta', 'otro']
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: `tipo inválido. Opciones: ${TIPOS_VALIDOS.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('payment_methods')
    .insert({
      tenant_id: auth.tenantId,
      nombre,
      tipo,
      moneda: body.moneda ?? 'USD',
      instrucciones: body.instrucciones ?? null,
      datos_pago: body.datosPago ?? {},
      requiere_comprobante: body.requiereComprobante ?? true,
      requiere_validacion_manual: body.requiereValidacionManual ?? true,
      orden: body.orden ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/payment-methods]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'editar_config',
    entidad: 'payment_methods',
    entidad_id: data.id,
    detalles: `Creó método de pago: ${nombre} (${tipo})`,
  })

  return NextResponse.json({ method: data }, { status: 201 })
}
