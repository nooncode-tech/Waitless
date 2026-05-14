'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'
const LINE = '#E5E5E5'

const PALETTES = [
  'linear-gradient(135deg,#2a1810,#0e0805)',
  'linear-gradient(135deg,#3a2418,#1a0e08)',
  'linear-gradient(135deg,#1a2a2a,#08161a)',
  'linear-gradient(135deg,#2a1818,#1a0808)',
  'linear-gradient(135deg,#2a280f,#181708)',
  'linear-gradient(135deg,#2a1f2a,#10081a)',
  'linear-gradient(135deg,#1a2a1a,#081a08)',
  'linear-gradient(135deg,#2a2218,#1a1408)',
]

const CATEGORIES = [
  { id: 'todos',    label: 'Todos',    icon: '★', bg: '#000',    fg: '#fff' },
  { id: 'tacos',    label: 'Tacos',    icon: 'T', bg: '#2a1818', fg: '#fff', keywords: ['taco','mexicano','mexicana','burritos'] },
  { id: 'burger',   label: 'Burgers',  icon: 'B', bg: '#3a2418', fg: '#fff', keywords: ['hamburgues','burger','smash'] },
  { id: 'pizza',    label: 'Pizza',    icon: 'P', bg: '#2a2218', fg: '#fff', keywords: ['pizza','pizzer'] },
  { id: 'sushi',    label: 'Sushi',    icon: 'S', bg: '#1a2a2a', fg: '#fff', keywords: ['sushi','japones','ramen','roll'] },
  { id: 'pollo',    label: 'Pollo',    icon: 'P', bg: '#2a280f', fg: '#fff', keywords: ['pollo','chicken','alitas','wings'] },
  { id: 'veggie',   label: 'Veggie',   icon: 'V', bg: '#1a2a1a', fg: '#fff', keywords: ['saludable','ensalada','vegano','bowl'] },
  { id: 'postres',  label: 'Postres',  icon: 'D', bg: '#2a1f2a', fg: '#fff', keywords: ['postre','helado','pastel','dulce'] },
  { id: 'cafe',     label: 'Café',     icon: 'C', bg: '#2a2218', fg: '#fff', keywords: ['cafe','café','cafeter','coffee'] },
  { id: 'bebidas',  label: 'Bebidas',  icon: 'B', bg: '#181818', fg: '#fff', keywords: ['bebida','bar','coctele'] },
  { id: 'mariscos', label: 'Mariscos', icon: 'M', bg: '#2a1810', fg: '#fff', keywords: ['marisco','pescado','ceviche'] },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

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

function hashSlug(slug: string) {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function getPalette(slug: string) {
  return PALETTES[hashSlug(slug) % PALETTES.length]
}

function getDeliveryInfo(slug: string) {
  const h = hashSlug(slug)
  const times = ['15–25', '20–30', '25–35', '30–40']
  const fees  = ['$0.99', '$1.49', 'Gratis', '$0.49']
  return { time: times[h % times.length], fee: fees[(h >> 2) % fees.length] }
}

function getInitials(nombre: string) {
  return nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function matchesCategory(r: Restaurant, catId: CategoryId): boolean {
  if (catId === 'todos') return true
  const cat = CATEGORIES.find(c => c.id === catId)
  if (!cat || !('keywords' in cat)) return true
  const text = [r.nombre, r.descripcion ?? '', ...r.featuredItems.map(i => i.nombre)]
    .join(' ').toLowerCase()
  return (cat.keywords as readonly string[]).some(kw => text.includes(kw))
}

const LS_ADDRESS  = 'waitless:address'
const LS_RECENTS  = 'waitless:addresses'
const MAX_RECENTS = 5

export function ConsumerExploreView() {
  const router = useRouter()
  const addressRef = useRef<HTMLDivElement>(null)
  const addrInputRef = useRef<HTMLInputElement>(null)

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filtered,    setFiltered]    = useState<Restaurant[]>([])
  const [search,      setSearch]      = useState('')
  const [category,    setCategory]    = useState<CategoryId>('todos')
  const [isLoading,   setIsLoading]   = useState(true)
  const [userName,    setUserName]    = useState<string | null>(null)

  const [address,         setAddress]         = useState('')
  const [recentAddresses, setRecentAddresses] = useState<string[]>([])
  const [showAddrMenu,    setShowAddrMenu]    = useState(false)
  const [addrInput,       setAddrInput]       = useState('')

  useEffect(() => {
    const saved   = localStorage.getItem(LS_ADDRESS)
    const recents = localStorage.getItem(LS_RECENTS)
    if (saved) setAddress(saved)
    if (recents) { try { setRecentAddresses(JSON.parse(recents)) } catch { /* ignore */ } }
  }, [])

  useEffect(() => {
    if (!showAddrMenu) return
    const handler = (e: MouseEvent) => {
      if (addressRef.current && !addressRef.current.contains(e.target as Node)) setShowAddrMenu(false)
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAddrMenu(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler) }
  }, [showAddrMenu])

  useEffect(() => {
    if (showAddrMenu) setTimeout(() => addrInputRef.current?.focus(), 50)
  }, [showAddrMenu])

  const saveAddress = (addr: string) => {
    const trimmed = addr.trim()
    if (!trimmed) return
    setAddress(trimmed)
    localStorage.setItem(LS_ADDRESS, trimmed)
    const newRecents = [trimmed, ...recentAddresses.filter(a => a !== trimmed)].slice(0, MAX_RECENTS)
    setRecentAddresses(newRecents)
    localStorage.setItem(LS_RECENTS, JSON.stringify(newRecents))
    setShowAddrMenu(false)
    setAddrInput('')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/consumidor/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json()).then(d => { if (d?.profile?.nombre) setUserName(d.profile.nombre) }).catch(() => null)
    })
    fetch('/api/public/explore')
      .then(r => r.json())
      .then((data: Restaurant[]) => { setRestaurants(data); setFiltered(data); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [])

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
      list = list.filter(r => matchesCategory(r, category))
    }
    setFiltered(list)
  }, [search, category, restaurants])

  const hero    = filtered[0] ?? null
  const theRest = filtered.slice(1)
  const now = new Date()
  const timeStr = `${now.getDate().toString().padStart(2,'0')}·${['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][now.getMonth()]}·${now.getFullYear()} · ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT, WebkitFontSmoothing: 'antialiased', paddingBottom: 80 }}>

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Logo */}
          <a href="/" style={{ width: 32, height: 32, background: '#000', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.04em', textDecoration: 'none', flexShrink: 0 }}>W</a>

          {/* Location */}
          <div ref={addressRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowAddrMenu(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: `1px solid ${LINE}`, borderRadius: 999, background: 'none', cursor: 'pointer', fontFamily: FONT }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = LINE)}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1c-2.2 0-4 1.8-4 4 0 2.7 4 8 4 8s4-5.3 4-8c0-2.2-1.8-4-4-4Z" stroke="currentColor" strokeWidth="1.4"/><circle cx="7" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(0,0,0,0.55)' }}>Entregar a</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{address || 'Tu ubicación'}</div>
              </div>
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg>
            </button>

            {showAddrMenu && (
              <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 8, width: 320, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: `1px solid ${LINE}`, zIndex: 60, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>¿A dónde entregamos?</span>
                  <button onClick={() => setShowAddrMenu(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.4)' }}>✕</button>
                </div>
                <form onSubmit={e => { e.preventDefault(); if (addrInput.trim()) saveAddress(addrInput) }} style={{ padding: '0 16px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, background: '#F7F7F5', borderRadius: 10, padding: '0 12px', border: `1px solid ${LINE}` }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1c-2.2 0-4 1.8-4 4 0 2.7 4 8 4 8s4-5.3 4-8c0-2.2-1.8-4-4-4Z" stroke="rgba(0,0,0,0.4)" strokeWidth="1.4"/></svg>
                    <input ref={addrInputRef} type="text" value={addrInput} onChange={e => setAddrInput(e.target.value)} placeholder="Ingresá tu dirección..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontFamily: FONT }} />
                  </div>
                  {addrInput.trim() && (
                    <button type="submit" style={{ width: '100%', marginTop: 8, height: 40, background: '#000', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
                      Confirmar dirección
                    </button>
                  )}
                </form>
                {recentAddresses.length > 0 && (
                  <div style={{ borderTop: `1px solid ${LINE}`, padding: '8px 0' }}>
                    <div style={{ padding: '0 16px 6px', fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(0,0,0,0.4)' }}>Recientes</div>
                    {recentAddresses.map((addr, i) => (
                      <button key={i} onClick={() => saveAddress(addr)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 13, textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2"/><path d="M6 3.5V6l1.5 1.5" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                        {addr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 560, display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px', border: `1px solid ${LINE}`, borderRadius: 999, background: '#FAFAFA', transition: 'border-color 0.15s' }}
            onFocus={() => {}}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="rgba(0,0,0,0.4)" strokeWidth="1.3"/><path d="M10 10l3 3" stroke="rgba(0,0,0,0.4)" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Restaurante, platillo o cocina"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, fontFamily: FONT, letterSpacing: '-0.01em' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.4)', fontSize: 12 }}>✕</button>}
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }} className="exp-nav-desktop">
            <a href="/consumidor/explorar" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 999, background: '#000', color: '#fff', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.01em' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5L6.5 1.5l5 5v5h-3v-3h-4v3h-3v-5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
              Inicio
            </a>
            <a href="/consumidor/perfil" style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 12px', fontSize: 13.5, color: 'rgba(0,0,0,0.6)', textDecoration: 'none', letterSpacing: '-0.01em', borderRadius: 999 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#000'; (e.currentTarget as HTMLElement).style.background = '#F7F7F5' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >Pedidos</a>
            <a href="/consumidor/perfil" style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 12px', fontSize: 13.5, color: 'rgba(0,0,0,0.6)', textDecoration: 'none', letterSpacing: '-0.01em', borderRadius: 999 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#000'; (e.currentTarget as HTMLElement).style.background = '#F7F7F5' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,0,0,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >Cuenta</a>
          </nav>

          {/* Profile icon — mobile */}
          <button onClick={() => router.push('/consumidor/perfil')} className="exp-nav-mobile" style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${LINE}`, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 13c0-3 2.5-4.5 5.5-4.5S13 10 13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Category strip */}
        <div style={{ borderTop: `1px solid ${LINE}` }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => {
              const active = category === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    height: 36, padding: '0 14px',
                    border: `1px solid ${active ? '#000' : LINE}`,
                    borderRadius: 999,
                    fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em',
                    background: active ? '#000' : '#fff',
                    color: active ? '#fff' : '#000',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    fontFamily: FONT, transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: active ? 'rgba(255,255,255,0.15)' : cat.bg, color: cat.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {cat.icon}
                  </span>
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── HERO GREETING ── */}
      <section style={{ borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '48px 24px 40px', display: 'grid', gridTemplateColumns: hero ? '1fr 1fr' : '1fr', gap: 32, alignItems: 'start' }} className="exp-hero-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.04em' }}>{timeStr}</span>
              <span style={{ height: 1, width: 32, background: 'rgba(0,0,0,0.2)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)' }}>
                {new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'}
              </span>
            </div>
            <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(40px,7vw,88px)', letterSpacing: '-0.045em', lineHeight: 0.92, marginBottom: 20 }}>
              {userName ? <>Hola, {userName}.<br/><span style={{ color: 'rgba(0,0,0,0.3)' }}>¿Qué se te antoja?</span></> : <>Explorar<br/><span style={{ color: 'rgba(0,0,0,0.3)' }}>restaurantes.</span></>}
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(0,0,0,0.55)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
              {filtered.length > 0
                ? <><span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{filtered.length} restaurante{filtered.length !== 1 ? 's' : ''}</span> · entrega entre <strong style={{ color: '#000' }}>15 y 40 min</strong></>
                : isLoading ? 'Cargando restaurantes...' : 'Sin resultados para tu búsqueda.'}
            </p>
          </div>

          {/* Featured hero card */}
          {hero && !isLoading && (
            <button
              onClick={() => router.push(`/menu/${hero.slug}`)}
              style={{ background: '#000', color: '#fff', borderRadius: 24, overflow: 'hidden', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            >
              <div style={{ position: 'relative', height: 200, background: getPalette(hero.slug) }}>
                {hero.coverUrl && <img src={hero.coverUrl} alt={hero.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px', borderRadius: 999, background: MINT, color: MINT_DEEP, fontSize: 11, fontWeight: 700 }}>★ Destacado</span>
                </div>
                <div style={{ position: 'absolute', bottom: 12, right: 12, width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 14, letterSpacing: '-0.04em', color: '#000' }}>
                  {getInitials(hero.nombre)}
                </div>
              </div>
              <div style={{ padding: '20px 24px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: '-0.04em' }}>{hero.nombre}</div>
                  {hero.totalRatings > 0 && (
                    <div style={{ fontFamily: MONO, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.8)' }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, background: MINT, clipPath: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' }} />
                      {hero.rating.toFixed(1)} · {hero.totalRatings}
                    </div>
                  )}
                </div>
                {hero.descripcion && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.01em', marginBottom: 16 }}>{hero.descripcion}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, fontFamily: MONO }}>
                  {[
                    { label: 'Tiempo', value: `${getDeliveryInfo(hero.slug).time} min` },
                    { label: 'Envío', value: getDeliveryInfo(hero.slug).fee },
                    { label: 'Mínimo', value: '$150' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {hero.featuredItems[0] && <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>Pruébalo: <strong style={{ color: '#fff' }}>{hero.featuredItems[0].nombre}</strong></span>}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 36, padding: '0 16px', borderRadius: 999, background: MINT, color: MINT_DEEP, fontSize: 13, fontWeight: 700 }}>Ver carta →</span>
                </div>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* ── RESTAURANT GRID ── */}
      {!isLoading && filtered.length > 0 && (
        <section style={{ borderBottom: `1px solid ${LINE}`, padding: '48px 0' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.04em' }}>§ 01</span>
                  <span style={{ height: 1, width: 32, background: 'rgba(0,0,0,0.2)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)' }}>Cerca de ti</span>
                </div>
                <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(32px,4vw,44px)', letterSpacing: '-0.045em', lineHeight: 0.95 }}>
                  {search ? `"${search}"` : 'Todos los restaurantes.'}
                </h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }} className="exp-card-grid">
              {(hero ? theRest : filtered).map(r => {
                const { time, fee } = getDeliveryInfo(r.slug)
                return (
                  <button
                    key={r.slug}
                    onClick={() => router.push(`/menu/${r.slug}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                  >
                    <div style={{ aspectRatio: '5/4', borderRadius: 16, background: getPalette(r.slug), position: 'relative', overflow: 'hidden', marginBottom: 14 }}>
                      {r.coverUrl && <img src={r.coverUrl} alt={r.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}
                      {r.totalRatings > 0 && (
                        <div style={{ position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', borderRadius: 999, background: MINT, color: MINT_DEEP, fontSize: 10, fontWeight: 700, fontFamily: MONO }}>
                          ★ Destacado
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 10, right: 10, width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 11, letterSpacing: '-0.05em', color: '#000' }}>
                        {getInitials(r.nombre)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, letterSpacing: '-0.035em' }}>{r.nombre}</div>
                      {r.totalRatings > 0 && (
                        <div style={{ fontFamily: MONO, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(0,0,0,0.7)' }}>
                          <span style={{ display: 'inline-block', width: 9, height: 9, background: '#000', clipPath: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' }} />
                          {r.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                    {r.descripcion && <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.55)', letterSpacing: '-0.01em', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: MONO, fontSize: 11.5, color: 'rgba(0,0,0,0.65)' }}>
                      <span>{time} min</span>
                      <span style={{ color: 'rgba(0,0,0,0.25)' }}>·</span>
                      <span>{fee} envío</span>
                      {r.featuredItems[0] && <>
                        <span style={{ color: 'rgba(0,0,0,0.25)' }}>·</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{r.featuredItems[0].nombre}</span>
                      </>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <div style={{ width: 32, height: 32, border: '2.5px solid rgba(0,0,0,0.1)', borderTopColor: '#000', borderRadius: '50%', animation: 'exp-spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', gap: 12 }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(32px,5vw,48px)', letterSpacing: '-0.045em', lineHeight: 0.95, color: 'rgba(0,0,0,0.08)' }}>SIN RESULTADOS</div>
          <p style={{ fontSize: 15, color: 'rgba(0,0,0,0.55)' }}>{search ? `No encontramos "${search}"` : 'No hay restaurantes disponibles.'}</p>
          <button onClick={() => { setSearch(''); setCategory('todos') }} style={{ marginTop: 8, height: 40, padding: '0 20px', background: '#000', color: '#fff', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
            Ver todos →
          </button>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="exp-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: '#fff', borderTop: `1px solid ${LINE}`, display: 'flex', height: 60 }}>
        {[
          { label: 'Inicio', href: '/consumidor/explorar', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2.5 9L10 2.5 17.5 9v8.5h-5v-5h-5v5h-5V9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>, active: true },
          { label: 'Buscar', href: '/consumidor/explorar', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>, active: false },
          { label: 'Pedidos', href: '/consumidor/perfil', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 5h12l-1.5 9H5.5L4 5Zm3 0V3.5A2.5 2.5 0 019.5 1h1A2.5 2.5 0 0113 3.5V5" stroke="currentColor" strokeWidth="1.4"/></svg>, active: false },
          { label: 'Cuenta', href: '/consumidor/perfil', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M3.5 17c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>, active: false },
        ].map(item => (
          <a key={item.label} href={item.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textDecoration: 'none', color: item.active ? '#000' : '#909090', position: 'relative' }}>
            {item.active && <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 32, height: 2.5, background: '#000', borderRadius: 999 }} />}
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT }}>{item.label}</span>
          </a>
        ))}
      </nav>

      <style>{`
        @keyframes exp-spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .exp-nav-desktop { display: none !important; }
          .exp-hero-grid { grid-template-columns: 1fr !important; }
          .exp-card-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
        }
        @media (min-width: 769px) {
          .exp-nav-mobile { display: none !important; }
          .exp-bottom-nav { display: none !important; }
        }
        @media (max-width: 480px) {
          .exp-card-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1100px) {
          .exp-card-grid { grid-template-columns: repeat(3,1fr) !important; }
        }
      `}</style>
    </div>
  )
}
