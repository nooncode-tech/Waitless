'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Star, Search, X, ChevronLeft, Utensils } from 'lucide-react'
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
  { id: 'todos',        label: 'Todos',       emoji: '🍽️' },
  { id: 'hamburguesas', label: 'Hamburguesas', emoji: '🍔', keywords: ['hamburgues', 'burger', 'smash'] },
  { id: 'pizza',        label: 'Pizza',        emoji: '🍕', keywords: ['pizza', 'pizzer'] },
  { id: 'sushi',        label: 'Sushi',        emoji: '🍱', keywords: ['sushi', 'japones', 'japonesa', 'ramen', 'roll'] },
  { id: 'tacos',        label: 'Tacos',        emoji: '🌮', keywords: ['taco', 'mexicano', 'mexicana', 'burritos', 'quesadil'] },
  { id: 'pollo',        label: 'Pollo',        emoji: '🍗', keywords: ['pollo', 'chicken', 'alitas', 'wings'] },
  { id: 'pasta',        label: 'Pastas',       emoji: '🍝', keywords: ['pasta', 'italiano', 'italiana', 'fideos', 'lasaña'] },
  { id: 'saludable',    label: 'Saludable',    emoji: '🥗', keywords: ['saludable', 'ensalada', 'vegano', 'vegana', 'bowl', 'fitness'] },
  { id: 'postres',      label: 'Postres',      emoji: '🍰', keywords: ['postre', 'helado', 'pastel', 'torta', 'dulce', 'cake'] },
  { id: 'cafe',         label: 'Café',         emoji: '☕', keywords: ['cafe', 'café', 'cafeter', 'coffee'] },
  { id: 'mariscos',     label: 'Mariscos',     emoji: '🦐', keywords: ['marisco', 'mariscos', 'pescado', 'ceviche', 'camar'] },
  { id: 'sandwiches',   label: 'Sandwiches',   emoji: '🥪', keywords: ['sandwich', 'sándwich', 'torta', 'sub'] },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

function matchesCategory(r: Restaurant, catId: CategoryId): boolean {
  if (catId === 'todos') return true
  const cat = CATEGORIES.find(c => c.id === catId)
  if (!cat || !('keywords' in cat)) return true
  const text = [r.nombre, r.descripcion ?? '', ...r.featuredItems.map(i => i.nombre)]
    .join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return cat.keywords.some(kw => text.includes(kw))
}

function matchesSearch(r: Restaurant, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const text = [r.nombre, r.descripcion ?? '', ...r.featuredItems.map(i => i.nombre)]
    .join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return text.includes(q)
}

// ─── Card ────────────────────────────────────────────────────────────────────

function RestaurantCard({ r }: { r: Restaurant }) {
  const cerrada = !r.tiendaAbierta
  return (
    <Link
      href={`/menu/${r.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Cover */}
      <div
        className="relative overflow-hidden"
        style={{ height: '11rem', background: r.primaryColor }}
      >
        {r.coverUrl ? (
          <img
            src={r.coverUrl}
            alt={r.nombre}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${cerrada ? 'brightness-75' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <Utensils className="w-12 h-12 text-white" />
          </div>
        )}

        {/* Dark gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Closed badge */}
        {cerrada && (
          <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
            Cerrado
          </span>
        )}

        {/* Logo */}
        {r.logoUrl && (
          <div className="absolute bottom-3 left-3 w-9 h-9 rounded-xl bg-white shadow-md overflow-hidden ring-2 ring-white/80">
            <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Rating pill over image */}
        {r.rating > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-900">{r.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pt-3.5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[15px] text-gray-900 leading-snug line-clamp-1 flex-1">
            {r.nombre}
          </h3>
          {r.rating === 0 && (
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
              Nuevo
            </span>
          )}
        </div>

        {r.descripcion ? (
          <p className="text-xs text-gray-400 mt-1 line-clamp-1 leading-relaxed">{r.descripcion}</p>
        ) : r.featuredItems.length > 0 ? (
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{r.featuredItems.map(i => i.nombre).join(' · ')}</p>
        ) : null}

        <div className="flex items-center gap-3 mt-2.5">
          <span className={`flex items-center gap-1 text-[11px] font-semibold ${cerrada ? 'text-red-400' : 'text-emerald-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cerrada ? 'bg-red-400' : 'bg-emerald-500'}`} />
            {cerrada ? 'Cerrado' : 'Abierto'}
          </span>
          {r.totalRatings > 0 && (
            <span className="text-[11px] text-gray-400">
              {r.totalRatings} reseña{r.totalRatings !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ExploreClient({ restaurants }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryId>('todos')

  const filtered = useMemo(() => (
    restaurants.filter(r => matchesCategory(r, activeCategory) && matchesSearch(r, search))
  ), [restaurants, activeCategory, search])

  const isFiltering = search.trim() !== '' || activeCategory !== 'todos'
  const sectionTitle = isFiltering
    ? activeCategory !== 'todos'
      ? CATEGORIES.find(c => c.id === activeCategory)?.label ?? 'Resultados'
      : 'Resultados'
    : 'Restaurantes'

  return (
    <div className="min-h-screen" style={{ background: '#f6f6f6', fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-5xl mx-auto px-4">

          {/* Top bar */}
          <div className="h-14 flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Inicio</span>
            </Link>

            {/* Search bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar restaurantes o platillos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-100 hover:bg-gray-150 focus:bg-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Brand + Mi cuenta — desktop only */}
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              <Link href="/consumidor" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap">
                Mi cuenta
              </Link>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-[11px] tracking-tight">W</span>
                </div>
                <span className="font-black text-sm text-gray-900" style={{ letterSpacing: '-0.02em' }}>WAITLESS</span>
              </Link>
            </div>
          </div>

          {/* Category chips */}
          <div
            className="flex gap-2 pb-3"
            style={{ overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as CategoryId)}
                className={`flex-none flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  activeCategory === cat.id
                    ? 'bg-gray-900 text-white shadow-sm'
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

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Heading */}
        <div className="mb-5">
          <h1 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.03em' }}>
            {sectionTitle}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {filtered.length} restaurante{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl py-20 text-center shadow-sm">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-bold text-gray-700 text-lg">Sin resultados</p>
            <p className="text-sm text-gray-400 mt-1">Intenta con otra búsqueda o categoría</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('todos') }}
              className="mt-5 text-sm font-semibold text-white bg-gray-900 px-6 py-2.5 rounded-full hover:bg-gray-700 transition-colors"
            >
              Ver todos
            </button>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-3xl py-20 text-center shadow-sm">
            <Utensils className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="font-bold text-gray-400 text-lg">Próximamente</p>
            <p className="text-sm text-gray-300 mt-1">Los restaurantes de tu ciudad llegarán pronto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => <RestaurantCard key={r.slug} r={r} />)}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-10 mt-2">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <Link href="/" className="font-bold text-gray-600 hover:text-gray-900 transition-colors">
            WAITLESS
          </Link>
        </p>
      </footer>
    </div>
  )
}
