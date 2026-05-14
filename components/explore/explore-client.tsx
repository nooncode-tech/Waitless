'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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
  { id: 'todos',        label: 'Todos',     icon: '★', bg: '#000' },
  { id: 'tacos',        label: 'Tacos',     icon: 'T', bg: '#2a1818', keywords: ['taco', 'mexicano', 'mexicana', 'burritos', 'quesadil'] },
  { id: 'hamburguesas', label: 'Burgers',   icon: 'B', bg: '#3a2418', keywords: ['hamburgues', 'burger', 'smash'] },
  { id: 'pizza',        label: 'Pizza',     icon: 'P', bg: '#2a2218', keywords: ['pizza', 'pizzer'] },
  { id: 'sushi',        label: 'Sushi',     icon: 'S', bg: '#1a2a2a', keywords: ['sushi', 'japones', 'japonesa', 'ramen', 'roll'] },
  { id: 'pollo',        label: 'Pollo',     icon: 'P', bg: '#2a280f', keywords: ['pollo', 'chicken', 'alitas', 'wings'] },
  { id: 'saludable',    label: 'Veggie',    icon: 'V', bg: '#1a2a1a', keywords: ['saludable', 'ensalada', 'vegano', 'vegana', 'bowl', 'fitness'] },
  { id: 'postres',      label: 'Postres',   icon: 'D', bg: '#2a1f2a', keywords: ['postre', 'helado', 'pastel', 'dulce', 'cake'] },
  { id: 'cafe',         label: 'Café',      icon: 'C', bg: '#2a2218', keywords: ['cafe', 'café', 'cafeter', 'coffee'] },
  { id: 'bebidas',      label: 'Bebidas',   icon: 'B', bg: '#181818', keywords: ['bebida', 'bar', 'coctele'] },
  { id: 'mariscos',     label: 'Mariscos',  icon: 'M', bg: '#2a1810', keywords: ['marisco', 'pescado', 'ceviche', 'camar'] },
  { id: 'asiatica',     label: 'Asiática',  icon: 'A', bg: '#1a1a2a', keywords: ['asiatica', 'chino', 'thai', 'vietnamita'] },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

const PALETTE = ['exp-pal-1','exp-pal-2','exp-pal-3','exp-pal-4','exp-pal-5','exp-pal-6','exp-pal-7','exp-pal-8'] as const

function matchesCategory(r: Restaurant, catId: CategoryId): boolean {
  if (catId === 'todos') return true
  const cat = CATEGORIES.find(c => c.id === catId)
  if (!cat || !('keywords' in cat)) return true
  const text = [r.nombre, r.descripcion ?? '', ...r.featuredItems.map(i => i.nombre)]
    .join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return (cat as { keywords: readonly string[] }).keywords.some((kw: string) => text.includes(kw))
}

function matchesSearch(r: Restaurant, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const text = [r.nombre, r.descripcion ?? '', ...r.featuredItems.map(i => i.nombre)]
    .join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return text.includes(q)
}

// ─── Restaurant card (grid) ───────────────────────────────────────────────────

function RestaurantCard({ r, idx }: { r: Restaurant; idx: number }) {
  const pal = PALETTE[idx % PALETTE.length]
  const cerrada = !r.tiendaAbierta
  const initials = r.nombre.slice(0, 2).toLowerCase()
  return (
    <Link href={`/menu/${r.slug}`} className="col-span-12 sm:col-span-6 lg:col-span-3 group block">
      <div className={`exp-photo ${pal} aspect-[5/4] rounded-2xl relative overflow-hidden`}>
        {r.coverUrl && (
          <img src={r.coverUrl} alt={r.nombre} className={`absolute inset-0 w-full h-full object-cover ${cerrada ? 'grayscale' : ''}`} />
        )}
        {cerrada
          ? <span className="exp-pill bg-black/75 text-white absolute top-3 left-3 z-10">Cerrado</span>
          : r.totalRatings > 20
            ? <span className="exp-pill exp-mint exp-mint-fg absolute top-3 left-3 z-10">★ Destacado</span>
            : r.rating === 0
              ? <span className="exp-pill bg-white text-black absolute top-3 left-3 z-10 border exp-hairline">Nuevo</span>
              : null
        }
        <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white flex items-center justify-center exp-font-display text-[10px] tracking-tight z-10 overflow-hidden">
          {r.logoUrl
            ? <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
            : initials
          }
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="exp-font-display text-[20px] truncate">{r.nombre}</div>
          {r.rating > 0 && (
            <div className="exp-mono text-[11.5px] flex items-center gap-1 shrink-0">
              <span className="exp-star" />
              {r.rating.toFixed(1)}
            </div>
          )}
        </div>
        <div className="text-[12.5px] text-black/55 exp-medium-tight truncate">
          {r.descripcion ?? r.featuredItems.map(i => i.nombre).join(' · ')}
        </div>
        <div className="mt-2 flex items-center gap-2 exp-mono text-[11.5px] text-black/70">
          {r.totalRatings > 0 && (
            <><span>{r.totalRatings} reseñas</span><span className="text-black/30">·</span></>
          )}
          <span className={cerrada ? 'text-red-500' : ''}>{cerrada ? 'Cerrado' : 'Abierto'}</span>
        </div>
      </div>
    </Link>
  )
}

// ─── Ranked row (editorial list) ─────────────────────────────────────────────

function RankedRow({ r, rank, idx }: { r: Restaurant; rank: number; idx: number }) {
  const pal = PALETTE[idx % PALETTE.length]
  return (
    <li className="grid grid-cols-12 gap-6 items-center px-8 py-6 border-b exp-hairline-2 last:border-0 hover:bg-[#FAFAFA]">
      <div className="col-span-1 exp-font-display text-[44px] exp-num">{String(rank).padStart(2, '0')}</div>
      <div className="col-span-2">
        <div className={`exp-photo ${pal} aspect-[5/4] rounded-lg overflow-hidden relative`}>
          {r.coverUrl && <img src={r.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        </div>
      </div>
      <div className="col-span-4">
        <div className="exp-font-display text-[22px]">{r.nombre}</div>
        <div className="text-[12.5px] text-black/55 exp-medium-tight">{r.descripcion ?? '—'}</div>
      </div>
      <div className="col-span-2 exp-mono text-[12.5px]">
        <div className="flex items-center gap-1">
          <span className="exp-star" />
          <span className="font-bold">{r.rating.toFixed(1)}</span>
          <span className="text-black/45">/5</span>
        </div>
        <div className="text-black/55 mt-0.5">{r.totalRatings} reseñas</div>
      </div>
      <div className="col-span-2 exp-mono text-[12.5px] text-black/65">
        <div>{r.tiendaAbierta ? 'Abierto' : 'Cerrado'}</div>
        {r.featuredItems[0] && <div className="truncate">{r.featuredItems[0].nombre}</div>}
      </div>
      <div className="col-span-1 text-right">
        <Link href={`/menu/${r.slug}`} className="font-bold text-[13px] exp-hover-line">Ver →</Link>
      </div>
    </li>
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

  const featured  = restaurants[0]
  const topRated  = restaurants.filter(r => r.rating > 0).slice(0, 5)
  const nuevos    = restaurants.filter(r => r.rating === 0 || r.totalRatings === 0).slice(0, 3)
  const activos   = restaurants.filter(r => r.tiendaAbierta).slice(0, 6)

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif", background: '#fff', color: '#000' }}>

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md exp-nav-shadow">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-[68px] flex items-center gap-4 md:gap-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="exp-w-logo">W</span>
          </Link>

          {/* search */}
          <div className="flex-1 max-w-[560px]">
            <div className="flex items-center gap-2 h-11 px-4 border exp-hairline rounded-full bg-[#FAFAFA] focus-within:border-black focus-within:bg-white transition-colors">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                className="flex-1 bg-transparent outline-none text-[14px] exp-medium-tight"
                placeholder="Restaurante, platillo o cocina"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-black/40 hover:text-black">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
              <span className="exp-mono text-[10.5px] text-black/45 hidden md:inline">⌘K</span>
            </div>
          </div>

          {/* nav */}
          <nav className="hidden lg:flex items-center gap-1 text-[13.5px] exp-medium-tight">
            <Link href="/consumidor" className="px-3 h-9 inline-flex items-center text-black/70 hover:text-black exp-hover-line">Mi cuenta</Link>
            <Link href="/restaurante" className="px-3 h-9 inline-flex items-center text-black/70 hover:text-black exp-hover-line">Restaurante</Link>
          </nav>
        </div>

        {/* category chips */}
        <div className="border-t exp-hairline">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-3 flex items-center gap-2 exp-cat-strip overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as CategoryId)}
                className={`exp-chip${activeCategory === cat.id ? ' active' : ''}`}
              >
                <span
                  className="exp-cat-icon"
                  style={{
                    background: activeCategory === cat.id && cat.id === 'todos' ? '#fff' : cat.bg,
                    color: cat.id === 'todos' && activeCategory !== 'todos' ? '#fff' : (cat.id === 'todos' ? '#000' : '#fff'),
                  }}
                >
                  {cat.icon}
                </span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── FILTERED VIEW ──────────────────────────────────────────────────── */}
      {isFiltering ? (
        <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-12">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="exp-swiss-num">—</span>
                <span className="exp-eyebrow">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
              </div>
              <h1 className="exp-font-display text-[44px]">
                {activeCategory !== 'todos'
                  ? CATEGORIES.find(c => c.id === activeCategory)?.label
                  : 'Búsqueda'}
              </h1>
            </div>
            <button onClick={() => { setSearch(''); setActiveCategory('todos') }} className="text-[13.5px] font-bold exp-hover-line">
              Borrar filtros
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="exp-font-display text-[clamp(32px,5vw,60px)] text-black/20 mb-4">Sin resultados</div>
              <p className="text-[14px] text-black/50 exp-medium-tight">Intenta con otra búsqueda o categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-5">
              {filtered.map((r, i) => <RestaurantCard key={r.slug} r={r} idx={i} />)}
            </div>
          )}
        </main>
      ) : (
        <>
          {/* ── HERO ─────────────────────────────────────────────────────── */}
          {featured && (
            <section className="border-b exp-hairline">
              <div className="max-w-[1440px] mx-auto px-4 md:px-8 pt-12 pb-10 grid grid-cols-12 gap-8 items-start">
                <div className="col-span-12 lg:col-span-7">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="exp-swiss-num" suppressHydrationWarning>
                      {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                    </span>
                    <span className="h-px w-8 bg-black/20" />
                    <span className="exp-eyebrow" suppressHydrationWarning>
                      {(() => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches' })()}
                    </span>
                  </div>
                  <h1 className="exp-font-display text-[clamp(48px,7vw,96px)]">
                    Hola.<br />
                    <span className="text-black/35">¿Qué se te antoja?</span>
                  </h1>
                  <p className="mt-5 text-[16px] text-black/60 max-w-[460px] exp-medium-tight">
                    <span className="exp-mono text-[12px] text-black/50">{restaurants.length} restaurantes activos</span>
                    {' · '}entrega en tu ciudad.
                  </p>
                </div>

                {/* featured card */}
                <div className="col-span-12 lg:col-span-5">
                  <Link href={`/menu/${featured.slug}`} className="exp-hero-card">
                    <div className={`exp-photo exp-pal-1 h-[220px] relative overflow-hidden`}>
                      {featured.coverUrl && (
                        <img src={featured.coverUrl} alt={featured.nombre} className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                        <span className="exp-pill exp-mint exp-mint-fg">★ Destacado</span>
                        {featured.rating > 0 && (
                          <span className="exp-pill bg-white/15 text-white border border-white/20">{featured.rating.toFixed(1)} ★</span>
                        )}
                      </div>
                      <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-white flex items-center justify-center exp-font-display text-[18px] z-10 overflow-hidden">
                        {featured.logoUrl
                          ? <img src={featured.logoUrl} alt="" className="w-full h-full object-cover" />
                          : featured.nombre.slice(0, 2).toLowerCase()
                        }
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="exp-font-display text-[28px]">{featured.nombre}</div>
                        {featured.rating > 0 && (
                          <div className="flex items-center gap-1.5 exp-mono text-[12px]">
                            <span className="exp-star" style={{ background: '#BEEBBE' }} />
                            {featured.rating.toFixed(1)}
                            <span className="text-white/55">·</span>
                            {featured.totalRatings}
                          </div>
                        )}
                      </div>
                      <div className="text-[13px] text-white/65 exp-medium-tight">{featured.descripcion ?? ''}</div>
                      {featured.featuredItems[0] && (
                        <div className="mt-6 flex items-center justify-between">
                          <div className="text-[12.5px] text-white/65 exp-medium-tight">
                            Pruébalo: <span className="text-white font-bold">{featured.featuredItems[0].nombre}</span>
                            {' · '}${featured.featuredItems[0].precio.toFixed(0)}
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full exp-mint exp-mint-fg text-[13px] font-bold">Ver carta →</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ── §01 TODOS ────────────────────────────────────────────────── */}
          <section className="border-b exp-hairline py-14">
            <div className="max-w-[1440px] mx-auto px-4 md:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="exp-swiss-num">§ 01</span>
                    <span className="h-px w-8 bg-black/30" />
                    <span className="exp-eyebrow">Restaurantes</span>
                  </div>
                  <h2 className="exp-font-display text-[44px]">Todos en Waitless.</h2>
                </div>
                <span className="exp-mono text-[11.5px] text-black/55">{restaurants.length} activos</span>
              </div>
              {restaurants.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="exp-font-display text-[clamp(28px,4vw,48px)] text-black/20 mb-3">Próximamente</div>
                  <p className="text-[14px] text-black/50 exp-medium-tight">Los restaurantes de tu ciudad llegarán pronto.</p>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-5">
                  {restaurants.slice(0, 8).map((r, i) => <RestaurantCard key={r.slug} r={r} idx={i} />)}
                </div>
              )}
            </div>
          </section>

          {/* ── §02 TOP CALIFICADOS ──────────────────────────────────────── */}
          {topRated.length > 0 && (
            <section className="border-b exp-hairline py-14 bg-[#FAFAFA]">
              <div className="max-w-[1440px] mx-auto px-4 md:px-8">
                <div className="grid grid-cols-12 gap-8 mb-8 items-end">
                  <div className="col-span-12 lg:col-span-7">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="exp-swiss-num">§ 02</span>
                      <span className="h-px w-8 bg-black/30" />
                      <span className="exp-eyebrow">Top · 30 días</span>
                    </div>
                    <h2 className="exp-font-display text-[44px]">Los mejor calificados.</h2>
                  </div>
                  <div className="col-span-12 lg:col-span-5 lg:col-start-8 text-[14px] text-black/60 exp-medium-tight">
                    Ranking calculado sobre reseñas verificadas.
                    Sin pagar por aparecer — sin algoritmos pagados.
                  </div>
                </div>
                <ol className="bg-white border exp-hairline rounded-2xl overflow-hidden">
                  {topRated.map((r, i) => <RankedRow key={r.slug} r={r} rank={i + 1} idx={i} />)}
                </ol>
              </div>
            </section>
          )}

          {/* ── §03 NUEVOS ───────────────────────────────────────────────── */}
          {nuevos.length > 0 && (
            <section className="border-b exp-hairline py-14">
              <div className="max-w-[1440px] mx-auto px-4 md:px-8">
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="exp-swiss-num">§ 03</span>
                      <span className="h-px w-8 bg-black/30" />
                      <span className="exp-eyebrow">Recién llegados</span>
                    </div>
                    <h2 className="exp-font-display text-[44px]">Nuevos en WAITLESS.</h2>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-5">
                  {nuevos.map((r, i) => (
                    <Link key={r.slug} href={`/menu/${r.slug}`} className="col-span-12 md:col-span-6 lg:col-span-4 group flex gap-4 border exp-hairline rounded-2xl p-4 hover:border-black transition-colors">
                      <div className={`exp-photo ${PALETTE[i % PALETTE.length]} w-[120px] h-[120px] rounded-xl shrink-0 relative overflow-hidden`}>
                        {r.coverUrl && <img src={r.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                        <span className="exp-pill exp-mint exp-mint-fg absolute top-2 left-2 text-[10px] px-2 h-5 z-10">+ Nuevo</span>
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="text-[11px] exp-mono uppercase tracking-[0.16em] text-black/45">Nuevo en Waitless</div>
                        <div className="exp-font-display text-[22px] mt-1 truncate">{r.nombre}</div>
                        <div className="text-[12.5px] text-black/55 exp-medium-tight truncate">
                          {r.descripcion ?? r.featuredItems.map(i => i.nombre).join(' · ')}
                        </div>
                        <div className="mt-auto flex items-center gap-3 exp-mono text-[11.5px] text-black/70 pt-3">
                          <span>{r.tiendaAbierta ? 'Abierto' : 'Cerrado'}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── §04 POR ANTOJO ───────────────────────────────────────────── */}
          <section className="border-b exp-hairline py-14">
            <div className="max-w-[1440px] mx-auto px-4 md:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="exp-swiss-num">§ 04</span>
                    <span className="h-px w-8 bg-black/30" />
                    <span className="exp-eyebrow">Por antojo</span>
                  </div>
                  <h2 className="exp-font-display text-[44px]">
                    Elige por <em className="italic">qué</em>, no por dónde.
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {CATEGORIES.filter(c => c.id !== 'todos').map(cat => {
                  const count = restaurants.filter(r => matchesCategory(r, cat.id as CategoryId)).length
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id as CategoryId)}
                      className="border exp-hairline rounded-xl p-5 hover:border-black hover:bg-[#FAFAFA] aspect-square flex flex-col justify-between text-left transition-colors"
                    >
                      <div
                        className="exp-cat-icon"
                        style={{ background: cat.bg, color: '#fff', width: 32, height: 32, fontSize: 14 }}
                      >
                        {cat.icon}
                      </div>
                      <div>
                        <div className="exp-font-display text-[20px]">{cat.label}</div>
                        <div className="exp-mono text-[10.5px] text-black/50">{count} restaurantes</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ── §05 AHORA ────────────────────────────────────────────────── */}
          {activos.length > 0 && (
            <section className="bg-black text-white py-16 border-b exp-hairline">
              <div className="max-w-[1440px] mx-auto px-4 md:px-8 grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="exp-dot exp-live-dot" style={{ background: '#BEEBBE' }} />
                    <span className="exp-eyebrow" suppressHydrationWarning>
                      Ahora · {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h2 className="exp-font-display text-[clamp(40px,5.5vw,72px)] leading-[0.95]">
                    Abiertos en<br />este momento.
                  </h2>
                  <p className="mt-5 text-[15px] text-white/65 max-w-[420px] exp-medium-tight">
                    Restaurantes con servicio activo ahora mismo.
                    Si pides ahora, llega caliente.
                  </p>
                </div>
                <div className="col-span-12 lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {activos.map(r => (
                    <Link key={r.slug} href={`/menu/${r.slug}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08] transition-colors block">
                      <div className="flex items-center gap-2">
                        <span className="exp-dot" style={{ background: '#BEEBBE' }} />
                        <span className="exp-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: '#BEEBBE' }}>Abierto</span>
                      </div>
                      <div className="exp-font-display text-[22px] mt-3 truncate">{r.nombre}</div>
                      <div className="text-[12px] text-white/55 exp-mono mt-1">
                        {r.totalRatings > 0 ? `${r.totalRatings} reseñas · ★${r.rating.toFixed(1)}` : 'Nuevo'}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-14">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-2.5">
            <span className="exp-w-logo-sm">W</span>
            <span className="exp-font-display text-[14px]">Powered by WAITLESS</span>
            <span className="exp-mono text-[10px] text-black/40 uppercase tracking-[0.16em]">v10</span>
          </div>
          <div className="flex items-center gap-6 text-[12.5px] text-black/55 exp-medium-tight">
            <Link href="/legal/terminos" className="hover:text-black transition-colors">Términos</Link>
            <Link href="/legal/privacidad" className="hover:text-black transition-colors">Privacidad</Link>
            <Link href="/restaurante" className="hover:text-black transition-colors">
              ¿Tienes restaurante? <span className="text-black font-bold">Súmate →</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
