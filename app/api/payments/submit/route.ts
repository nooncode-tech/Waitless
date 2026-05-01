/**
 * POST /api/payments/submit
 * El cliente o el mesero inicia un pago y/o carga un comprobante.
 * No requiere JWT — usa sessionId como scope (igual que /api/payments/status).
 *
 * Body: { sessionId, paymentMethodId, referencia?, fileUrl?, montoDeclarado }
 * Crea/actualiza el registro `payments` y añade una fila en `payment_receipts`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  let body: {
    sessionId: string
    paymentMethodId?: string
    referencia?: string
    fileUrl?: string
    fileType?: string
    montoDeclarado: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { sessionId, paymentMethodId, referencia, fileUrl, fileType, montoDeclarado } = body

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
  }
  if (typeof montoDeclarado !== 'number' || montoDeclarado <= 0) {
    return NextResponse.json({ error: 'montoDeclarado debe ser un número positivo' }, { status: 400 })
  }
  if (!referencia && !fileUrl) {
    return NextResponse.json({ error: 'Se requiere al menos una referencia o un comprobante adjunto' }, { status: 400 })
  }

  // Verificar que la sesión existe
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('table_sessions')
    .select('id, tenant_id, bill_total, activa')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  // Buscar un pago existente no finalizado para esta sesión
  const { data: existingPayment } = await supabaseAdmin
    .from('payments')
    .select('id, status')
    .eq('session_id', sessionId)
    .not('status', 'in', '("PAGO_VALIDADO","ANULADO")')
    .maybeSingle()

  let paymentId: string

  if (existingPayment) {
    // Reusar el registro y actualizar status
    paymentId = existingPayment.id
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        payment_method_id: paymentMethodId ?? null,
        monto_declarado: montoDeclarado,
        status: 'COMPROBANTE_CARGADO',
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('[POST /api/payments/submit] update payment:', updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  } else {
    // Crear nuevo registro de pago
    const { data: newPayment, error: insertError } = await supabaseAdmin
      .from('payments')
      .insert({
        tenant_id: session.tenant_id,
        session_id: sessionId,
        payment_method_id: paymentMethodId ?? null,
        monto_requerido: session.bill_total ?? montoDeclarado,
        monto_declarado: montoDeclarado,
        status: 'COMPROBANTE_CARGADO',
      })
      .select('id')
      .single()

    if (insertError || !newPayment) {
      console.error('[POST /api/payments/submit] insert payment:', insertError?.message)
      return NextResponse.json({ error: insertError?.message ?? 'Error al crear pago' }, { status: 500 })
    }
    paymentId = newPayment.id
  }

  // Insertar comprobante
  const { data: receipt, error: receiptError } = await supabaseAdmin
    .from('payment_receipts')
    .insert({
      payment_id: paymentId,
      tenant_id: session.tenant_id,
      file_url: fileUrl ?? null,
      file_type: fileType ?? (fileUrl ? 'imagen' : 'referencia'),
      referencia: referencia ?? null,
      monto_declarado: montoDeclarado,
      review_status: 'pendiente',
    })
    .select('id')
    .single()

  if (receiptError) {
    console.error('[POST /api/payments/submit] insert receipt:', receiptError.message)
    return NextResponse.json({ error: receiptError.message }, { status: 500 })
  }

  return NextResponse.json({ paymentId, receiptId: receipt.id }, { status: 201 })
}
