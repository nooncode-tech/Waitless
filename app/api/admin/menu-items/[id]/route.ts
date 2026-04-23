import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const allowed = [
    'available', 'name', 'description', 'price', 'category_id', 'cocina',
    'image', 'imagenes', 'identificador', 'color_fondo', 'color_borde',
    'stock_habilitado', 'stock_cantidad', 'mostrar_en_menu_digital',
    'extras', 'receta', 'orden',
  ]

  const payload: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) payload[key] = body[key]
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('menu_items')
    .update(payload)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
