'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Search, User, ChevronRight, MapPin } from 'lucide-react'
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

export function ConsumerExploreView() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filtered, setFiltered] = useState<Restaurant[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/consumidor'); return }
      // Get display name
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
    if (!search.trim()) {
      setFiltered(restaurants)
      return
    }
    const q = search.toLowerCase()
    setFiltered(restaurants.filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      r.descripcion?.toLowerCase().includes(q) ||
      r.featuredItems.some(i => i.nombre.toLowerCase().includes(q))
    ))
  }, [search, restaurants])

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[11px]">W</span>
            </div>
            <span className="font-bold text-sm text-gray-900">Explorar</span>
          </div>
          <button
            onClick={() => router.push('/consumidor/perfil')}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
          >
            <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-gray-600" />
            </div>
            {userName && <span className="font-medium hidden sm:block">{userName}</span>}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Hero */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.03em' }}>
            {userName ? `Hola, ${userName} 👋` : 'Restaurantes'}
          </h1>
          <p className="text-sm text-gray-500">¿Qué vas a pedir hoy?</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar restaurante o plato..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <MapPin className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="font-bold text-gray-700">
              {search ? 'Sin resultados' : 'Sin restaurantes disponibles'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Probá con otro término de búsqueda' : 'Pronto habrá más opciones cerca tuyo'}
            </p>
          </div>
        )}

        {/* Restaurant list */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map(r => (
              <RestaurantCard key={r.slug} restaurant={r} onClick={() => router.push(`/menu/${r.slug}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RestaurantCard({ restaurant: r, onClick }: { restaurant: Restaurant; onClick: () => void }) {
  const initials = r.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm overflow-hidden text-left hover:shadow-md transition-shadow active:scale-[0.99] transition-transform"
    >
      {/* Cover */}
      <div className="relative h-36 overflow-hidden" style={{ background: r.coverUrl ? undefined : r.primaryColor + '22' }}>
        {r.coverUrl ? (
          <img src={r.coverUrl} alt={r.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: r.primaryColor + '15' }}>
            <span className="text-4xl font-black opacity-20" style={{ color: r.primaryColor }}>{initials}</span>
          </div>
        )}

        {/* Logo badge */}
        {r.logoUrl && (
          <div className="absolute bottom-3 left-4 w-12 h-12 rounded-xl bg-white shadow-md overflow-hidden border border-white/80">
            <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Rating pill */}
        {r.totalRatings > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-900">{r.rating.toFixed(1)}</span>
            <span className="text-[10px] text-gray-500">({r.totalRatings})</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="font-black text-gray-900 text-base leading-tight" style={{ letterSpacing: '-0.02em' }}>
            {r.nombre}
          </h2>
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
        </div>

        {r.descripcion && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{r.descripcion}</p>
        )}

        {/* Featured items */}
        {r.featuredItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.featuredItems.slice(0, 4).map(item => (
              <span
                key={item.id}
                className="text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5"
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
