import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export interface ExploreRestaurant {
  slug: string
  nombre: string
  logoUrl: string | null
  coverUrl: string | null
  descripcion: string | null
  primaryColor: string
  rating: number
  totalRatings: number
  featuredItems: { id: string; nombre: string; precio: number; imagen: string | null }[]
}

export async function GET() {
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, nombre')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (!tenants?.length) return NextResponse.json([])

  const ids = tenants.map(t => t.id as string)

  const [{ data: configs }, { data: feedbacks }, { data: items }] = await Promise.all([
    supabaseAdmin
      .from('app_config')
      .select('tenant_id, restaurant_name, logo_url, cover_url, descripcion, primary_color')
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
      itemMap[tid].push({ id: item.id as string, nombre: item.name as string, precio: Number(item.price), imagen: (item.image as string | null) ?? null })
    }
  }

  const restaurants: ExploreRestaurant[] = tenants.map(t => {
    const tid = t.id as string
    const cfg = configMap[tid]
    const rd = ratingMap[tid]
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
    }
  })

  restaurants.sort((a, b) => b.rating - a.rating || b.totalRatings - a.totalRatings)

  return NextResponse.json(restaurants)
}
