'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, User, Home, ShoppingBag, Star,
  Clock, ChevronRight, Wallet,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Restaurant {
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

const CATEGORIES = [
  { id: 'todos',    label: 'Todos',    emoji: '🍽️' },
  { id: 'tacos',    label: 'Tacos',    emoji: '🌮' },
  { id: 'burger',   label: 'Burgers',  emoji: '🍔' },
  { id: 'pizza',    label: 'Pizza',    emoji: '🍕' },
  { id: 'sushi',    label: 'Sushi',    emoji: '🍱' },
  { id: 'pollo',    label: 'Pollo',    emoji: '🍗' },
  { id: 'postres',  label: 'Postres',  emoji: '🍰' },
  { id: 'bebidas',  label: 'Bebidas',  emoji: '🥤' },
]

function hashSlug(slug: string) {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function getDeliveryInfo(slug: string) {
  const h = hashSlug(slug)
  const times = ['15–25', '20–30', '25–35', '30–40']
  const fees  = ['$0.99', '$1.49', 'Gratis', '$0.49']
  return {
    time: times[h % times.length],
    fee:  fees[(h >> 2) % fees.length],
  }
}

export function ConsumerExploreView() {
  const router  = useRouter()
  const catRef  = useRef<HTMLDivElement>(null)

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filtered,    setFiltered]    = useState<Restaurant[]>([])
  const [search,      setSearch]      = useState('')
  const [category,    setCategory]    = useState('todos')
  const [isLoading,   setIsLoading]   = useState(true)
  const [userName,    setUserName]    = useState<string | null>(null)
  const [showSearch,  setShowSearch]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/consumidor'); return }
      fetch('/api/consumidor/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then(r => r.json()).then(d => {
        if (d?.profile?.nombre) setUserName(d.profile.nombre)
      }).catch(() => null)
    })

    fetch('/api/public/explore')
      .then(r => r.json())
      .then((data: Restaurant[]) => {
        setRestaurants(data)
        setFiltered(data)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [router])

  useEffect(() => {
    let list = [...restaurants]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.nombre.toLowerCase().includes(q) ||
        r.descripcion?.toLowerCase().includes(q) ||
        r.featuredItems.some(i => i.nombre.toLowerCase().includes(q))
      )
    }
    if (category !== 'todos') {
      list = list.filter(r =>
        r.descripcion?.toLowerCase().includes(category) ||
        r.nombre.toLowerCase().includes(category) ||
        r.featuredItems.some(i => i.nombre.toLowerCase().includes(category))
      )
    }
    setFiltered(list)
  }, [search, category, restaurants])

  const featured  = filtered.slice(0, 3)
  const rest      = filtered.slice(3)

  return (
    <div className="min-h-screen bg-[#F6F6F6]" style={{ fontFamily: "'Sora', system-ui, sans-serif", paddingBottom: 72 }}>

      {/* ── Top header ── */}
      <header className="bg-white sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">

          {/* Logo + location */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[11px] tracking-tight">W</span>
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-[10px] text-gray-400 font-medium leading-none mb-0.5">Entrega a</p>
              <p className="text-sm font-bold text-gray-900 leading-none truncate">Tu ubicación</p>
            </div>
          </div>

          {/* Search bar — inline en desktop */}
          <div
            className="flex-1 max-w-lg hidden md:flex items-center gap-2.5 h-10 bg-gray-100 rounded-xl px-3.5 cursor-text"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar restaurante o plato..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            )}
          </div>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => item.href ? router.push(item.href) : router.push('/consumidor/perfil')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  item.id === 'explorar' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Profile — mobile only */}
          <button
            onClick={() => router.push('/consumidor/perfil')}
            className="md:hidden w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors"
          >
            <User className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Search bar — mobile only (below header) */}
        <div className="md:hidden px-4 pb-3">
          <div
            className="flex items-center gap-2.5 h-11 bg-gray-100 rounded-xl px-3.5 cursor-text"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            {showSearch ? (
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onBlur={() => { if (!search) setShowSearch(false) }}
                placeholder="Buscar restaurante o plato..."
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
            ) : (
              <span className="text-sm text-gray-400">{search || 'Buscar restaurante o plato...'}</span>
            )}
            {search && (
              <button
                onClick={e => { e.stopPropagation(); setSearch(''); setShowSearch(false) }}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold"
              >✕</button>
            )}
          </div>
        </div>
      </header>

      {/* ── Category pills ── */}
      <div
        ref={catRef}
        className="flex gap-2 px-4 md:px-8 py-3 overflow-x-auto bg-white border-b border-gray-100 max-w-screen-xl mx-auto w-full"
        style={{ scrollbarWidth: 'none' }}
      >
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
              category === cat.id
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-base leading-none">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-6 space-y-8">

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Search className="h-8 w-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-800 text-lg">Sin resultados</p>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              {search ? `No encontramos "${search}"` : 'No hay restaurantes disponibles'}
            </p>
          </div>
        )}

        {/* ── Destacados ── */}
        {!isLoading && featured.length > 0 && (
          <section>
            <h2 className="text-xl font-black text-gray-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              {userName ? `Hola, ${userName} 👋` : 'Destacados'}
            </h2>

            {/* Mobile: scroll horizontal / Desktop: grid */}
            <div className="md:hidden flex gap-3 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {featured.map(r => (
                <FeaturedCard key={r.slug} restaurant={r} onClick={() => router.push(`/menu/${r.slug}`)} />
              ))}
            </div>
            <div className="hidden md:grid grid-cols-3 gap-4">
              {featured.map(r => (
                <FeaturedCard key={r.slug} restaurant={r} onClick={() => router.push(`/menu/${r.slug}`)} desktop />
              ))}
            </div>
          </section>
        )}

        {/* ── Todos los restaurantes ── */}
        {!isLoading && (featured.length > 0 ? rest : filtered).length > 0 && (
          <section>
            <h2 className="text-xl font-black text-gray-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              {featured.length > 0 ? 'Cerca de ti' : 'Restaurantes'}
            </h2>
            {/* Mobile: 1 col / Tablet: 2 col / Desktop: 3 col */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(featured.length > 0 ? rest : filtered).map(r => (
                <RestaurantCard key={r.slug} restaurant={r} onClick={() => router.push(`/menu/${r.slug}`)} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Bottom nav — mobile only ── */}
      <div className="md:hidden">
        <BottomNav active="explorar" onProfile={() => router.push('/consumidor/perfil')} />
      </div>
    </div>
  )
}

// ── Featured card (horizontal scroll, square-ish) ────────────────────────────
function FeaturedCard({ restaurant: r, onClick, desktop }: { restaurant: Restaurant; onClick: () => void; desktop?: boolean }) {
  const { time, fee } = getDeliveryInfo(r.slug)
  const initials = r.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform ${desktop ? 'w-full' : 'shrink-0 w-56'}`}
    >
      {/* Cover */}
      <div className="relative h-32 overflow-hidden">
        {r.coverUrl ? (
          <img src={r.coverUrl} alt={r.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: r.primaryColor + '20' }}>
            <span className="text-3xl font-black opacity-20" style={{ color: r.primaryColor }}>{initials}</span>
          </div>
        )}
        {r.totalRatings > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/95 rounded-full px-2 py-0.5 shadow-sm">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold text-gray-900">{r.rating.toFixed(1)}</span>
          </div>
        )}
        {/* Promo badge */}
        <div className="absolute top-2 left-2 bg-[#06C167] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
          Destacado
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-black text-gray-900 text-sm truncate" style={{ letterSpacing: '-0.01em' }}>{r.nombre}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <Clock className="h-3 w-3" />
            {time} min
          </div>
          <span className="text-gray-300">·</span>
          <span className="text-[11px] text-gray-500">{fee} envío</span>
        </div>
      </div>
    </button>
  )
}

// ── Full-width restaurant card ────────────────────────────────────────────────
function RestaurantCard({ restaurant: r, onClick }: { restaurant: Restaurant; onClick: () => void }) {
  const { time, fee } = getDeliveryInfo(r.slug)
  const initials = r.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.99] transition-transform"
    >
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden">
        {r.coverUrl ? (
          <img src={r.coverUrl} alt={r.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: r.primaryColor + '18' }}>
            <span className="text-5xl font-black opacity-15" style={{ color: r.primaryColor }}>{initials}</span>
          </div>
        )}

        {/* Logo badge */}
        {r.logoUrl && (
          <div className="absolute bottom-3 left-4 w-11 h-11 rounded-xl bg-white shadow-md overflow-hidden border-2 border-white">
            <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Rating */}
        {r.totalRatings > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-900">{r.rating.toFixed(1)}</span>
            <span className="text-[10px] text-gray-400">({r.totalRatings})</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-black text-gray-900 text-base leading-tight" style={{ letterSpacing: '-0.02em' }}>
            {r.nombre}
          </h3>
          <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
        </div>

        {/* Delivery info */}
        <div className="flex items-center gap-3 mb-2.5">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{time} min</span>
          </div>
          <span className="text-gray-200">|</span>
          <span className="text-xs text-gray-500">{fee} envío</span>
          {r.totalRatings > 0 && (
            <>
              <span className="text-gray-200">|</span>
              <div className="flex items-center gap-0.5 text-xs text-gray-500">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{r.rating.toFixed(1)}</span>
              </div>
            </>
          )}
        </div>

        {/* Featured items */}
        {r.featuredItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.featuredItems.slice(0, 4).map(item => (
              <span
                key={item.id}
                className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5"
              >
                {item.nombre}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Bottom navigation ─────────────────────────────────────────────────────────
type NavId = 'explorar' | 'buscar' | 'pedidos' | 'cuenta'

const NAV_ITEMS: { id: NavId; label: string; icon: React.ReactNode; href?: string }[] = [
  { id: 'explorar', label: 'Inicio',   icon: <Home className="h-5 w-5" />,        href: '/consumidor/explorar' },
  { id: 'buscar',   label: 'Buscar',   icon: <Search className="h-5 w-5" />,      href: '/consumidor/explorar' },
  { id: 'pedidos',  label: 'Pedidos',  icon: <ShoppingBag className="h-5 w-5" />, href: '/consumidor/perfil' },
  { id: 'cuenta',   label: 'Cuenta',   icon: <User className="h-5 w-5" />,        href: '/consumidor/perfil' },
]

function BottomNav({ active, onProfile }: { active: NavId; onProfile: () => void }) {
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-center"
      style={{ height: 60, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = item.id === active
        return (
          <button
            key={item.id}
            onClick={() => item.href ? router.push(item.href) : onProfile()}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors"
          >
            <span className={isActive ? 'text-black' : 'text-gray-400'}>
              {item.icon}
            </span>
            <span className={`text-[10px] font-semibold ${isActive ? 'text-black' : 'text-gray-400'}`}>
              {item.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 block w-8 h-0.5 bg-black rounded-full" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
