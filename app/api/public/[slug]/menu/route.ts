/**
 * GET /api/public/[slug]/menu
 * Endpoint público — devuelve el menú digital del restaurante.
 * No requiere autenticación. Solo ítems con mostrar_en_menu_digital = true.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Resolver tenant por slug
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, nombre')
    .eq('slug', slug)
    .eq('activo', true)
    .single()

  // Soporte single-tenant (slug = 'default' o sin multi-tenant)
  let tenantId: string | null = tenant?.id ?? null

  // Cargar config (branding + métodos de pago + whatsapp)
  let configQuery = supabaseAdmin
    .from('app_config')
    .select('restaurant_name, logo_url, primary_color, accent_color, metodos_pago_activos, whatsapp_numero, powered_by_waitless')

  if (tenantId) {
    configQuery = configQuery.eq('tenant_id', tenantId)
  } else {
    configQuery = configQuery.eq('id', 'default')
  }

  const { data: config } = await configQuery.single()

  if (!config && !tenantId) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
  }

  // Cargar categorías
  let catQuery = supabaseAdmin
    .from('categories')
    .select('id, name, orden')
    .eq('activa', true)
    .order('orden', { ascending: true })
  if (tenantId) catQuery = catQuery.eq('tenant_id', tenantId)
  const { data: categories } = await catQuery

  // Cargar ítems del menú digital
  let itemsQuery = supabaseAdmin
    .from('menu_items')
    .select('*')
    .order('orden', { ascending: true })

  if (tenantId) itemsQuery = itemsQuery.eq('tenant_id', tenantId)

  const { data: rawItems, error: itemsError } = await itemsQuery

  if (itemsError) {
    console.error('[public/menu] Error cargando ítems:', itemsError.message)
  }

  // Filtrar: disponibles y visibles en menú digital
  // mostrar_en_menu_digital puede no existir aún (migración pendiente) → tratar como true
  const items = (rawItems ?? []).filter(item => {
    const disponible = (item.available ?? item.disponible ?? true) as boolean
    const enMenuDigital = item.mostrar_en_menu_digital !== false   // null/undefined → true
    const conStock = item.stock_habilitado ? (item.stock_cantidad ?? 0) > 0 : true
    return disponible && enMenuDigital && conStock
  }).map(item => ({
    id: item.id as string,
    nombre: (item.name ?? item.nombre) as string,
    descripcion: ((item.description ?? item.descripcion) ?? '') as string,
    precio: Number(item.price ?? item.precio),
    imagen: (item.image ?? item.imagen ?? null) as string | null,
    imagenes: (item.imagenes as string[] | null) ?? [],
    colorFondo: (item.color_fondo ?? null) as string | null,
    colorBorde: (item.color_borde ?? null) as string | null,
    categoriaId: (item.category_id ?? null) as string | null,
    extras: (item.extras ?? []) as Array<{ id: string; nombre: string; precio: number }>,
  }))

  const metodosPago = (config?.metodos_pago_activos as Record<string, boolean> | null) ?? {
    efectivo: true,
    tarjeta: true,
    transferencia: true,
  }

  return NextResponse.json({
    restaurantName: (config?.restaurant_name as string | null) ?? 'Restaurante',
    logoUrl: (config?.logo_url as string | null) ?? null,
    primaryColor: (config?.primary_color as string | null) ?? '#000000',
    accentColor: (config?.accent_color as string | null) ?? '#BEBEBE',
    poweredByWaitless: (config?.powered_by_waitless as boolean | null) ?? true,
    whatsappNumero: (config?.whatsapp_numero as string | null) ?? null,
    metodosPago,
    categories: (categories ?? []).map(c => ({
      id: c.id as string,
      nombre: c.name as string,
      orden: c.orden as number,
    })),
    items,
    tenantId,
  })
}
