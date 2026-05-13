import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager', 'mesero'])
  if ('error' in auth) return auth.error

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('menu_items')
    .insert([{
      tenant_id: auth.tenantId,
      name: body.name,
      description: body.description ?? '',
      price: body.price ?? 0,
      available: body.available ?? true,
      image: body.image ?? null,
      imagenes: body.imagenes ?? [],
      identificador: body.identificador ?? null,
      color_fondo: body.color_fondo ?? null,
      color_borde: body.color_borde ?? null,
      stock_habilitado: body.stock_habilitado ?? false,
      stock_cantidad: body.stock_cantidad ?? 0,
      mostrar_en_menu_digital: body.mostrar_en_menu_digital ?? true,
      category_id: body.category_id ?? null,
      extras: body.extras ?? [],
      receta: body.receta ?? [],
      orden: body.orden ?? 0,
    }])
    .select()
    .single()

  if (error) {
    console.error('[POST /api/admin/menu-items]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}
