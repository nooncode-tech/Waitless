'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Star, ChevronRight, Utensils, Search, X } from 'lucide-react'
import type { ExploreRestaurant } from '@/app/api/public/explore/route'

type Restaurant = ExploreRestaurant & { tiendaAbierta: boolean }

interface Dish {
  id: string
  nombre: string
  precio: number
  imagen: string | null
  restaurantSlug: string
  restaurantNombre: string
}

interface Props {
  restaurants: Restaurant[]
  dishes: Dish[]
}

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'todos', label: 'Para ti', emoji: '⭐' },
  { id: 'hamburguesas', label: 'Hamburguesas', emoji: '🍔', keywords: ['hamburgues', 'burger', 'smash'] },
  { id: 'pizza', label: 'Pizza', emoji: '🍕', keywords: ['pizza', 'pizzer'] },
  { id: 'sushi', label: 'Sushi', emoji: '🍱', keywords: ['sushi', 'japones', 'japonesa', 'ramen', 'roll'] },
  { id: 'tacos', label: 'Tacos', emoji: '🌮', keywords: ['taco', 'mexicano', 'mexicana', 'burritos', 'quesadil'] },
  { id: 'pollo', label: 'Pollo', emoji: '🍗', keywords: ['pollo', 'chicken', 'alitas', 'wings'] },
  { id: 'pasta', label: 'Pastas', emoji: '🍝', keywords: ['pasta', 'italiano', 'italiana', 'fideos', 'lasaña'] },
  { id: 'saludable', label: 'Saludable', emoji: '🥗', keywords: ['saludable', 'ensalada', 'vegano', 'vegana', 'bowl', 'fitness'] },
  { id: 'postres', label: 'Postres', emoji: '🍰', keywords: ['postre', 'helado', 'pastel', 'torta', 'dulce', 'cake'] },
  { id: 'cafe', label: 'Café', emoji: '☕', keywords: ['cafe', 'café', 'cafeter', 'coffee'] },
  { id: 'mariscos', label: 'Mariscos', emoji: '🦐', keywords: ['marisco', 'mariscos', 'pescado', 'ceviche', 'camar'] },
  { id: 'sandwiches', label: 'Sandwiches', emoji: '🥪', keywords: ['sandwich', 'sándwich', 'torta', 'sub'] },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

function matchesCategory(r: Restaurant, catId: CategoryId): boolean {
  if (catId === 'todos') return true
  const cat = CATEGORIES.find(c => c.id === catId)
  if (!cat || !('keywords' in cat)) return true
  const searchText = [r.nombre, r.descripcion ?? '', ...r.featuredItems.map(i => i.nombre)]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return cat.keywords.some(kw => searchText.includes(kw))
}

function matchesSearch(r: Restaurant, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const text = [r.nombre, r.descripcion ?? '', ...r.featuredItems.map(i => i.nombre)]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return text.includes(q)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const r = Math.round(rating)
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= r ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
      ))}
    </span>
  )
}

function RestaurantCard({ r }: { r: Restaurant }) {
  const cerrada = !r.tiendaAbierta
  return (
    <Link
      href={`/menu/${r.slug}`}
      className="group flex-none w-64 sm:w-72 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-40 overflow-hidden" style={{ backgroundColor: r.primaryColor }}>
        {r.coverUrl
          ? <img src={r.coverUrl} alt={r.nombre} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${cerrada ? 'grayscale opacity-60' : ''}`} />
          : <div className="w-full h-full flex items-center justify-center opacity-20"><Utensils className="w-16 h-16 text-white" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {cerrada && (
          <span className="absolute top-3 left-3 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Cerrada
          </span>
        )}

        {r.logoUrl && (
          <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-white shadow-lg overflow-hidden border-2 border-white">
            <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-bold text-black">{r.rating > 0 ? r.rating.toFixed(1) : 'Nuevo'}</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-[15px] text-black tracking-tight leading-tight">{r.nombre}</h3>
        {r.descripcion
          ? <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{r.descripcion}</p>
          : r.featuredItems.length > 0
          ? <p className="text-xs text-gray-400 mt-1 line-clamp-1">{r.featuredItems.map(i => i.nombre).join(' · ')}</p>
          : null}
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

function RestaurantRowCard({ r }: { r: Restaurant }) {
  const cerrada = !r.tiendaAbierta
  return (
    <Link
      href={`/menu/${r.slug}`}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200"
    >
      <div
        className={`flex-none w-16 h-16 rounded-xl overflow-hidden ${cerrada ? 'grayscale opacity-50' : ''}`}
        style={{ backgroundColor: r.primaryColor }}
      >
        {r.logoUrl
          ? <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
          : r.coverUrl
          ? <img src={r.coverUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center opacity-20"><Utensils className="w-7 h-7 text-white" /></div>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[15px] text-black tracking-tight line-clamp-1">{r.nombre}</h3>
          {cerrada && <span className="shrink-0 text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">Cerrada</span>}
        </div>
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

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="flex items-end gap-3 mb-5">
      <h2 className="text-xl font-black text-black tracking-tight" style={{ letterSpacing: '-0.02em' }}>{children}</h2>
      {subtitle && <span className="text-sm text-gray-400 pb-px">{subtitle}</span>}
    </div>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

export function ExploreClient({ restaurants, dishes }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryId>('todos')

  const filtered = useMemo(() => {
    return restaurants.filter(r =>
      matchesCategory(r, activeCategory) && matchesSearch(r, search)
    )
  }, [restaurants, activeCategory, search])

  const isFiltering = search.trim() !== '' || activeCategory !== 'todos'
  const openNow = filtered.filter(r => r.tiendaAbierta)
  const topRated = filtered.filter(r => r.rating >= 4)
  const hasData = restaurants.length > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb', fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5">

          {/* Top row: logo + nav */}
          <div className="h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 text-xs hover:text-gray-700 transition-colors flex items-center gap-1 whitespace-nowrap">
                ← Inicio
              </Link>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-[11px] tracking-tight">W</span>
                </div>
                <span className="text-black font-black text-sm tracking-tight hidden sm:block" style={{ letterSpacing: '-0.02em' }}>WAITLESS</span>
              </Link>
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar restaurante o platillo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm bg-gray-100 rounded-full border-0 outline-none focus:ring-2 focus:ring-black/10 placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <a href="/?login=1" className="text-gray-500 text-xs hover:text-black transition-colors whitespace-nowrap hidden sm:block">
              Soy restaurante →
            </a>
          </div>

          {/* Category chips */}
          <div
            className="flex gap-2 pb-3 pt-1"
            style={{ overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as CategoryId)}
                className={`flex-none flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  activeCategory === cat.id
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      {!isFiltering && (
        <div className="bg-black">
          <div className="max-w-6xl mx-auto px-5 pt-10 pb-12">
            <p className="text-white/30 text-xs tracking-[0.2em] uppercase mb-3">Waitless · Marketplace</p>
            <h1
              className="text-3xl sm:text-5xl font-black text-white leading-none"
              style={{ letterSpacing: '-0.04em' }}
            >
              Los mejores<br />restaurantes,<br />en un solo lugar.
            </h1>
            <p className="text-white/40 text-sm mt-4 max-w-sm leading-relaxed">
              Descubre, explora y ordena directo desde los restaurantes de tu ciudad. Sin comisiones, sin intermediarios.
            </p>

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
                      {(restaurants.reduce((s, r) => s + r.rating, 0) / (restaurants.filter(r => r.rating > 0).length || 1)).toFixed(1)}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">Rating prom.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-5 py-8">

        {!hasData ? (
          <div className="bg-white rounded-3xl shadow-sm p-20 text-center">
            <Utensils className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="font-bold text-gray-400">Próximamente</p>
            <p className="text-sm text-gray-300 mt-1">Los restaurantes de tu ciudad llegarán pronto.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm p-20 text-center">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="font-bold text-gray-400">Sin resultados</p>
            <p className="text-sm text-gray-300 mt-1">Intenta con otra búsqueda o categoría.</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('todos') }}
              className="mt-4 text-sm font-semibold text-black underline underline-offset-2"
            >
              Ver todos los restaurantes
            </button>
          </div>
        ) : (
          <>
            {/* Searching / filtering mode: show flat list */}
            {isFiltering ? (
              <div>
                <SectionTitle subtitle={`${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`}>
                  {activeCategory !== 'todos'
                    ? CATEGORIES.find(c => c.id === activeCategory)?.label ?? 'Resultados'
                    : 'Resultados'}
                </SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map(r => <RestaurantRowCard key={r.slug} r={r} />)}
                </div>
              </div>
            ) : (
              <>
                {/* Abiertos ahora */}
                {openNow.length > 0 && (
                  <section className="mb-10">
                    <SectionTitle subtitle="Listos para ordenar">Abiertos ahora</SectionTitle>
                    <HorizontalScroll>
                      {openNow.map(r => <RestaurantCard key={r.slug} r={r} />)}
                    </HorizontalScroll>
                  </section>
                )}

                {/* Mejor calificados */}
                {topRated.length > 0 && (
                  <section className="mb-10">
                    <SectionTitle subtitle="Basado en reseñas reales">Mejor calificados</SectionTitle>
                    <HorizontalScroll>
                      {topRated.map(r => <RestaurantCard key={r.slug} r={r} />)}
                    </HorizontalScroll>
                  </section>
                )}

                {/* Platos populares */}
                {dishes.length > 0 && (
                  <section className="mb-10">
                    <SectionTitle subtitle="Lo que todos están ordenando">Platos populares</SectionTitle>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {dishes.map(d => (
                        <Link
                          key={d.id}
                          href={`/menu/${d.restaurantSlug}`}
                          className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border border-gray-50"
                        >
                          <div className="h-32 bg-gray-100 overflow-hidden">
                            {d.imagen
                              ? <img src={d.imagen} alt={d.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              : <div className="w-full h-full flex items-center justify-center bg-gray-50"><Utensils className="w-8 h-8 text-gray-200" /></div>}
                          </div>
                          <div className="p-3">
                            <p className="font-semibold text-sm text-black line-clamp-1 tracking-tight">{d.nombre}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{d.restaurantNombre}</p>
                            <p className="text-sm font-bold text-black mt-1.5">${d.precio.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Todos los restaurantes */}
                <section className="mb-10">
                  <SectionTitle>Todos los restaurantes</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map(r => <RestaurantRowCard key={r.slug} r={r} />)}
                  </div>
                </section>
              </>
            )}
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
