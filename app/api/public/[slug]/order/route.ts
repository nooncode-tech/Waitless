/**
 * POST /api/public/[slug]/order
 * Crea un pedido desde el menú digital (sin autenticación).
 * Canal: 'para_llevar'. Total calculado server-side.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface CartItem {
  itemId: string
  cantidad: number
  extras?: Array<{ id: string; nombre: string; precio: number }>
  notas?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let body: {
    items: CartItem[]
    nombreCliente?: string
    telefono?: string
    metodoPago?: string
    notas?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 })
  }

  // Resolver tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('activo', true)
    .single()

  const tenantId: string | null = tenant?.id ?? null

  // Obtener ítems del menú para calcular total server-side
  const itemIds = body.items.map(i => i.itemId)
  let menuQuery = supabaseAdmin
    .from('menu_items')
    .select('*')
    .in('id', itemIds)
  if (tenantId) menuQuery = menuQuery.eq('tenant_id', tenantId)

  const { data: menuItems } = await menuQuery
  if (!menuItems || menuItems.length === 0) {
    return NextResponse.json({ error: 'Ítems no encontrados' }, { status: 400 })
  }

  // Construir order items con precios validados
  const orderItems = body.items.map(cartItem => {
    const menuItem = menuItems.find(m => m.id === cartItem.itemId)
    if (!menuItem) return null

    const disponible = (menuItem.available ?? menuItem.disponible ?? true) as boolean
    const conStock = menuItem.stock_habilitado ? (menuItem.stock_cantidad ?? 0) > 0 : true
    if (!disponible || !conStock) return null

    const precioBase = Number(menuItem.price ?? menuItem.precio)
    const extrasValidados = (cartItem.extras ?? []).map(e => {
      const menuExtra = ((menuItem.extras ?? []) as Array<{ id: string; nombre: string; precio: number }>)
        .find(me => me.id === e.id)
      return menuExtra ?? null
    }).filter(Boolean) as Array<{ id: string; nombre: string; precio: number }>

    const precioExtras = extrasValidados.reduce((sum, e) => sum + e.precio, 0)
    const precioUnitario = precioBase + precioExtras

    return {
      id: crypto.randomUUID(),
      menuItem: {
        id: menuItem.id,
        nombre: (menuItem.name ?? menuItem.nombre) as string,
        descripcion: ((menuItem.description ?? menuItem.descripcion) ?? '') as string,
        precio: precioBase,
        imagen: (menuItem.image ?? menuItem.imagen) ?? undefined,
        disponible: true,
        categoria: menuItem.category_id,
      },
      cantidad: cartItem.cantidad,
      extras: extrasValidados,
      notas: cartItem.notas,
      precioUnitario,
    }
  }).filter(Boolean)

  if (orderItems.length === 0) {
    return NextResponse.json({ error: 'Ningún ítem disponible en el carrito' }, { status: 400 })
  }

  // Calcular total
  const subtotal = orderItems.reduce((sum, item) => {
    return sum + (item!.precioUnitario * item!.cantidad)
  }, 0)

  // Obtener número de pedido (max + 1 por tenant)
  let nextNumQuery = supabaseAdmin
    .from('orders')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
  if (tenantId) nextNumQuery = nextNumQuery.eq('tenant_id', tenantId)
  const { data: lastOrder } = await nextNumQuery
  const numero = ((lastOrder?.[0]?.numero as number | null) ?? 0) + 1

  const orderId = crypto.randomUUID()

  const orderPayload: Record<string, unknown> = {
    id: orderId,
    numero,
    canal: 'para_llevar',
    mesa: null,
    items: orderItems,
    status: 'recibido',
    cocina_a_status: 'en_cola',
    nombre_cliente: body.nombreCliente?.trim() || null,
    telefono: body.telefono?.trim() || null,
    cancelado: false,
    payment_status: 'pendiente',
    payment_method: body.metodoPago || null,
    subtotal,
    total: subtotal,
    impuestos: 0,
    propina: 0,
  }

  if (tenantId) orderPayload.tenant_id = tenantId

  const { error } = await supabaseAdmin.from('orders').insert(orderPayload)
  if (error) {
    console.error('[public/order] Error creando pedido:', error.message)
    return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
  }

  // Si hay nota/mensaje, guardarlo en feedback (mesa: 0 = menú digital)
  if (body.notas?.trim()) {
    const feedbackPayload: Record<string, unknown> = {
      id: crypto.randomUUID(),
      mesa: 0,
      rating: 0,
      comentario: `[Menú Digital] ${body.nombreCliente ? body.nombreCliente + ': ' : ''}${body.notas.trim()}`,
    }
    if (tenantId) feedbackPayload.tenant_id = tenantId
    await supabaseAdmin.from('feedback').insert(feedbackPayload).then(() => {})
  }

  return NextResponse.json({ orderId, numero })
}
