import { supabaseAdmin } from '@/lib/supabase-admin'
import { computeStoreOpen } from '@/lib/store-hours'
import type { ExploreRestaurant } from '@/app/api/public/explore/route'
import { ExploreClient } from '@/components/explore/explore-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Explorar restaurantes — WAITLESS',
  description: 'Descubre los mejores restaurantes de tu ciudad.',
}

type Restaurant = ExploreRestaurant & { tiendaAbierta: boolean }

async function getData(): Promise<{
  restaurants: Restaurant[]
  dishes: { id: string; nombre: string; precio: number; imagen: string | null; restaurantSlug: string; restaurantNombre: string }[]
}> {
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, nombre')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (!tenants?.length) return { restaurants: [], dishes: [] }

  const ids = tenants.map(t => t.id as string)

  const [{ data: configs }, { data: feedbacks }, { data: items }] = await Promise.all([
    supabaseAdmin
      .from('app_config')
      .select('tenant_id, restaurant_name, logo_url, cover_url, descripcion, primary_color, tienda_abierta, tienda_visible, auto_horario_apertura, auto_horario_cierre')
      .in('tenant_id', ids),
    supabaseAdmin
      .from('feedback')
      .select('tenant_id, rating')
      .in('tenant_id', ids)
      .gt('rating', 0),
    supabaseAdmin
      .from('menu_items')
      .select('id, name, price, image, tenant_id')
      .in('tenant_id', ids)
      .eq('available', true)
      .order('orden', { ascending: true })
      .limit(200),
  ])

  const configMap = Object.fromEntries((configs ?? []).map(c => [c.tenant_id as string, c]))
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id as string, t]))

  const ratingMap: Record<string, { sum: number; count: number }> = {}
  for (const f of feedbacks ?? []) {
    const tid = f.tenant_id as string | null
    if (!tid) continue
    if (!ratingMap[tid]) ratingMap[tid] = { sum: 0, count: 0 }
    ratingMap[tid].sum += f.rating as number
    ratingMap[tid].count++
  }

  const itemMap: Record<string, ExploreRestaurant['featuredItems']> = {}
  for (const item of items ?? []) {
    const tid = item.tenant_id as string | null
    if (!tid) continue
    if (!itemMap[tid]) itemMap[tid] = []
    if (itemMap[tid].length < 4) {
      itemMap[tid].push({
        id: item.id as string,
        nombre: item.name as string,
        precio: Number(item.price),
        imagen: (item.image as string | null) ?? null,
      })
    }
  }

  const restaurants: Restaurant[] = tenants.map(t => {
    const tid = t.id as string
    const cfg = configMap[tid]
    const rd = ratingMap[tid]
    const tiendaAbierta = (cfg?.tienda_abierta as boolean | null) ?? true
    const apertura = (cfg?.auto_horario_apertura as string | null) ?? null
    const cierre = (cfg?.auto_horario_cierre as string | null) ?? null
    const storeOpen = computeStoreOpen(tiendaAbierta, apertura, cierre)
    const tiendaVisible = (cfg?.tienda_visible as boolean | null) ?? true
    return {
      slug: t.slug as string,
      nombre: (cfg?.restaurant_name as string | null) ?? (t.nombre as string),
      logoUrl: (cfg?.logo_url as string | null) ?? null,
      coverUrl: (cfg?.cover_url as string | null) ?? null,
      descripcion: (cfg?.descripcion as string | null) ?? null,
      primaryColor: (cfg?.primary_color as string | null) ?? '#18181b',
      rating: rd ? Math.round((rd.sum / rd.count) * 10) / 10 : 0,
      totalRatings: rd?.count ?? 0,
      featuredItems: itemMap[tid] ?? [],
      tiendaAbierta: storeOpen,
      tiendaVisible,
    }
  }).filter(r => r.tiendaVisible)

  restaurants.sort((a, b) => b.rating - a.rating || b.totalRatings - a.totalRatings)

  // Cross-restaurant dish grid (items with images only)
  const allItems = (items ?? []).filter(i => i.image)
  const seen = new Set<string>()
  const dishes = allItems
    .filter(i => { if (seen.has(i.id as string)) return false; seen.add(i.id as string); return true })
    .slice(0, 12)
    .map(i => {
      const tid = i.tenant_id as string
      const cfg = configMap[tid]
      const tenant = tenantMap[tid]
      return {
        id: i.id as string,
        nombre: i.name as string,
        precio: Number(i.price),
        imagen: (i.image as string | null) ?? null,
        restaurantSlug: (tenant?.slug as string) ?? '',
        restaurantNombre: (cfg?.restaurant_name as string | null) ?? (tenant?.nombre as string) ?? '',
      }
    })

  return { restaurants, dishes }
}

export default async function ExplorePage() {
  const { restaurants, dishes } = await getData()
  return <ExploreClient restaurants={restaurants} dishes={dishes} />
}
