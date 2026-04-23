/**
 * POST /api/public/[slug]/mensaje
 * Guarda un mensaje libre desde el menú digital en la tabla feedback.
 * Aparece en el panel de feedback del admin (mesa: 0 = menú digital).
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let body: { mensaje: string; nombre?: string; telefono?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.mensaje?.trim()) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  }

  if (body.mensaje.trim().length > 1000) {
    return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('activo', true)
    .single()

  const tenantId: string | null = tenant?.id ?? null

  const remitente = body.nombre?.trim() ? `${body.nombre.trim()}${body.telefono ? ` (${body.telefono.trim()})` : ''}` : 'Anónimo'

  const payload: Record<string, unknown> = {
    id: crypto.randomUUID(),
    mesa: 0,
    rating: 0,
    comentario: `[Mensaje] ${remitente}: ${body.mensaje.trim()}`,
  }
  if (tenantId) payload.tenant_id = tenantId

  const { error } = await supabaseAdmin.from('feedback').insert(payload)
  if (error) {
    return NextResponse.json({ error: 'Error al enviar el mensaje' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
