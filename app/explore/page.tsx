import Link from 'next/link'
import { Star, ChevronRight, TrendingUp, Award, Utensils, Flame } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { ExploreRestaurant } from '@/app/api/public/explore/route'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Explorar restaurantes — WAITLESS',
  description: 'Descubre los mejores restaurantes de tu ciudad.',
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getData(): Promise<{
  restaurants: ExploreRestaurant[]
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

  // Cross-restaurant dish grid
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const r = Math.round(rating)
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= r ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
      ))}
    </span>
  )
}

function RestaurantBigCard({ r, badge }: { r: ExploreRestaurant; badge?: string }) {
  return (
    <Link
      href={`/menu/${r.slug}`}
      className="group flex-none w-72 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* Cover */}
      <div className="relative h-44 overflow-hidden" style={{ backgroundColor: r.primaryColor }}>
        {r.coverUrl
          ? <img src={r.coverUrl} alt={r.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center opacity-20"><Utensils className="w-20 h-20 text-white" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {badge && (
          <span className="absolute top-3 left-3 bg-white text-black text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
            {badge}
          </span>
        )}

        {r.logoUrl && (
          <div className="absolute bottom-3 left-3 w-11 h-11 rounded-xl bg-white shadow-lg overflow-hidden border-2 border-white">
            <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-bold text-black">{r.rating > 0 ? r.rating.toFixed(1) : 'Nuevo'}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-bold text-[15px] text-black tracking-tight leading-tight">{r.nombre}</h3>
        {r.descripcion && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{r.descripcion}</p>
        )}
        {r.featuredItems.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.featuredItems.slice(0, 3).map(item => (
              <span key={item.id} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
                {item.nombre}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {r.totalRatings > 0 ? `${r.totalRatings} reseñas` : 'Sin reseñas aún'}
          </span>
          <span className="text-[11px] font-semibold text-black flex items-center gap-1 group-hover:gap-2 transition-all">
            Ver menú <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}

function PromoCard({ r, index }: { r: ExploreRestaurant; index: number }) {
  const promos = ['Oferta del día', 'Más pedido', 'Destacado', 'En tendencia']
  const badge = promos[index % promos.length]
  return (
    <Link
      href={`/menu/${r.slug}`}
      className="group flex-none w-52 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative h-32 overflow-hidden" style={{ backgroundColor: r.primaryColor }}>
        {r.coverUrl
          ? <img src={r.coverUrl} alt={r.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : r.logoUrl
          ? <img src={r.logoUrl} alt={r.nombre} className="w-full h-full object-contain p-4 opacity-60" />
          : <div className="w-full h-full flex items-center justify-center opacity-20"><Utensils className="w-10 h-10 text-white" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute top-2.5 left-2.5 bg-black text-white text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
          {badge}
        </span>
      </div>
      <div className="p-3">
        <p className="font-bold text-sm text-black line-clamp-1 tracking-tight">{r.nombre}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-medium text-gray-700">{r.rating > 0 ? r.rating.toFixed(1) : 'Nuevo'}</span>
          {r.totalRatings > 0 && <span className="text-[10px] text-gray-400">({r.totalRatings})</span>}
        </div>
      </div>
    </Link>
  )
}

function DishCard({ dish }: { dish: { id: string; nombre: string; precio: number; imagen: string | null; restaurantSlug: string; restaurantNombre: string } }) {
  return (
    <Link href={`/menu/${dish.restaurantSlug}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border border-gray-50">
      <div className="h-36 bg-gray-100 overflow-hidden">
        {dish.imagen
          ? <img src={dish.imagen} alt={dish.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center bg-gray-50"><Utensils className="w-8 h-8 text-gray-200" /></div>}
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm text-black line-clamp-1 tracking-tight">{dish.nombre}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{dish.restaurantNombre}</p>
        <p className="text-sm font-bold text-black mt-2">${dish.precio.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
      </div>
    </Link>
  )
}

function RestaurantRowCard({ r }: { r: ExploreRestaurant }) {
  return (
    <Link
      href={`/menu/${r.slug}`}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200"
    >
      <div
        className="flex-none w-16 h-16 rounded-xl overflow-hidden"
        style={{ backgroundColor: r.primaryColor }}
      >
        {r.logoUrl
          ? <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
          : r.coverUrl
          ? <img src={r.coverUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center opacity-20"><Utensils className="w-7 h-7 text-white" /></div>}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[15px] text-black tracking-tight line-clamp-1">{r.nombre}</h3>
        {r.descripcion
          ? <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.descripcion}</p>
          : r.featuredItems.length > 0
          ? <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.featuredItems.map(i => i.nombre).join(' · ')}</p>
          : null}
        <div className="flex items-center gap-2 mt-1.5">
          <Stars rating={r.rating} />
          <span className="text-xs font-semibold text-black">{r.rating > 0 ? r.rating.toFixed(1) : 'Nuevo'}</span>
          {r.totalRatings > 0 && <span className="text-[10px] text-gray-400">· {r.totalRatings} reseñas</span>}
        </div>
      </div>

      <ChevronRight className="flex-none w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-4 pb-3"
      style={{ overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

function Section({ title, icon: Icon, subtitle, children }: { title: string; icon: React.ElementType; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-end gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-black" />
          <h2 className="text-xl font-black text-black tracking-tight" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
        </div>
        {subtitle && <span className="text-sm text-gray-400 pb-px">{subtitle}</span>}
      </div>
      {children}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ExplorePage() {
  const { restaurants, dishes } = await getData()

  const featured = restaurants.filter(r => r.coverUrl || r.logoUrl)
  const topRated = restaurants.filter(r => r.rating >= 4)
  const hasData = restaurants.length > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb', fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 bg-black border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-black text-[11px] tracking-tight">W</span>
            </div>
            <span className="text-white font-black text-sm tracking-tight" style={{ letterSpacing: '-0.02em' }}>WAITLESS</span>
          </Link>
          <Link href="/" className="text-white/50 text-xs hover:text-white/80 transition-colors">
            Soy restaurante →
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="bg-black">
        <div className="max-w-6xl mx-auto px-5 pt-12 pb-16">
          <p className="text-white/30 text-xs tracking-[0.2em] uppercase mb-4">Waitless · Marketplace</p>
          <h1
            className="text-4xl sm:text-5xl font-black text-white leading-none"
            style={{ letterSpacing: '-0.04em' }}
          >
            Los mejores<br />restaurantes,<br />en un solo lugar.
          </h1>
          <p className="text-white/40 text-sm mt-5 max-w-sm leading-relaxed">
            Descubre, explora y ordena directo desde los restaurantes de tu ciudad. Sin comisiones, sin intermediarios.
          </p>

          {/* Stats */}
          {hasData && (
            <div className="flex gap-8 mt-8 pt-8 border-t border-white/10">
              <div>
                <p className="text-2xl font-black text-white">{restaurants.length}</p>
                <p className="text-white/40 text-xs mt-0.5">Restaurantes</p>
              </div>
              {dishes.length > 0 && (
                <div>
                  <p className="text-2xl font-black text-white">{dishes.length}+</p>
                  <p className="text-white/40 text-xs mt-0.5">Platillos</p>
                </div>
              )}
              {restaurants.some(r => r.rating > 0) && (
                <div>
                  <p className="text-2xl font-black text-white">
                    {(restaurants.reduce((s, r) => s + r.rating, 0) / restaurants.filter(r => r.rating > 0).length || 0).toFixed(1)}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">Rating prom.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-5 py-10">

        {!hasData ? (
          <div className="bg-white rounded-3xl shadow-sm p-20 text-center">
            <Utensils className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="font-bold text-gray-400">Próximamente</p>
            <p className="text-sm text-gray-300 mt-1">Los restaurantes de tu ciudad llegarán pronto.</p>
          </div>
        ) : (
          <>
            {/* Destacados */}
            {featured.length > 0 && (
              <Section icon={Award} title="Destacados" subtitle="Los favoritos de la plataforma">
                <HorizontalScroll>
                  {featured.map((r, i) => (
                    <RestaurantBigCard key={r.slug} r={r} badge={i === 0 ? '⭐ Top' : undefined} />
                  ))}
                </HorizontalScroll>
              </Section>
            )}

            {/* Promociones */}
            <Section icon={Flame} title="En Promoción" subtitle="Ofertas de hoy">
              <HorizontalScroll>
                {restaurants.map((r, i) => (
                  <PromoCard key={r.slug} r={r} index={i} />
                ))}
              </HorizontalScroll>
            </Section>

            {/* Platos populares */}
            {dishes.length > 0 && (
              <Section icon={TrendingUp} title="Platos más pedidos" subtitle="Lo que todos están ordenando">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {dishes.map(d => <DishCard key={d.id} dish={d} />)}
                </div>
              </Section>
            )}

            {/* Mejor calificados */}
            {topRated.length > 0 && (
              <Section icon={Award} title="Mejor calificados" subtitle="Basado en reseñas reales">
                <HorizontalScroll>
                  {topRated.map(r => (
                    <RestaurantBigCard key={r.slug} r={r} />
                  ))}
                </HorizontalScroll>
              </Section>
            )}

            {/* Todos los restaurantes */}
            <Section icon={Utensils} title="Todos los restaurantes">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {restaurants.map(r => (
                  <RestaurantRowCard key={r.slug} r={r} />
                ))}
              </div>
            </Section>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 py-10 text-center">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <Link href="/" className="font-black text-black hover:underline">WAITLESS</Link>
        </p>
        <p className="text-[10px] text-gray-300 mt-1">La plataforma operativa para restaurantes modernos.</p>
      </footer>
    </div>
  )
}
