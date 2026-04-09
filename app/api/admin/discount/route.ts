/**
 * POST /api/admin/discount
 * Aplica un descuento a una sesión de mesa. Solo manager y admin pueden ejecutarlo.
 *
 * Sprint 3 — invariantes server-side:
 * - Rol manager/admin validado contra DB (requireRole)
 * - Sesión debe existir, estar activa y en estado cobrable
 * - Descuento entre 0 y 100 (porcentaje) o monto no negativo
 * - Registra en audit_logs con antes/después
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  // Solo manager o admin pueden aplicar descuentos
  const auth = await requireRole(req, ['manager', 'admin'])
  if ('error' in auth) return auth.error

  let body: { sessionId: string; descuento: number; motivo: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { sessionId, descuento, motivo } = body

  if (!sessionId || !motivo) {
    return NextResponse.json({ error: 'Faltan campos requeridos: sessionId, motivo' }, { status: 400 })
  }

  if (typeof descuento !== 'number' || descuento < 0) {
    return NextResponse.json({ error: 'descuento debe ser un número no negativo' }, { status: 400 })
  }

  // Verificar que la sesión existe, está activa y pertenece al tenant del llamador
  let sessionQuery = supabaseAdmin
    .from('table_sessions')
    .select('id, activa, bill_status, descuento, mesa')
    .eq('id', sessionId)
  if (auth.tenantId) sessionQuery = sessionQuery.eq('tenant_id', auth.tenantId)
  const { data: session, error: sessionError } = await sessionQuery.single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  if (!session.activa) {
    return NextResponse.json({ error: 'No se puede aplicar descuento a una sesión inactiva' }, { status: 409 })
  }

  if (session.bill_status === 'pagada' || session.bill_status === 'liberada') {
    return NextResponse.json(
      { error: `No se puede aplicar descuento a sesión en estado: ${session.bill_status}` },
      { status: 409 },
    )
  }

  const descuentoAnterior = Number(session.descuento ?? 0)

  // Aplicar descuento
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('table_sessions')
    .update({ descuento, descuento_motivo: motivo })
    .eq('id', sessionId)
    .select('id, descuento, descuento_motivo')
    .single()

  if (updateError) {
    console.error('[/api/admin/discount] Error aplicando descuento:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'aplicar_descuento',
    entidad: 'table_sessions',
    entidad_id: sessionId,
    detalles: `Descuento aplicado en mesa ${session.mesa}: $${descuento} — motivo: ${motivo}`,
    antes: { descuento: descuentoAnterior },
    despues: { descuento, descuento_motivo: motivo },
  }).then(() => {})

  return NextResponse.json({ session: updated })
}
