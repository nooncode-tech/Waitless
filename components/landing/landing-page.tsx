'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ChevronRight, Star, ArrowRight,
  Menu, X, Check, LayoutGrid, ChefHat, BarChart2,
  CreditCard, Bell, Building2, Minus, Shield, Smartphone, Utensils,
} from 'lucide-react'

interface ExploreRestaurant {
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

interface LandingPageProps {
  onLogin: () => void
}

// ── Data ──────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  { name: 'Carlos M.',    role: 'Tacos El Rey',   text: 'Los pedidos llegan directo a cocina sin errores. Bajamos los tiempos de servicio a la mitad.' },
  { name: 'Sofía R.',     role: 'Bistró 33',       text: 'El panel de analytics me da claridad que antes solo tenía en mi cabeza. Decisiones con datos reales.' },
  { name: 'Miguel A.',    role: '4 locales',       text: 'Manejar varias sucursales desde un solo panel es un cambio total. Antes necesitaba 3 sistemas.' },
  { name: 'Daniela P.',   role: 'Café Lumbre',     text: 'El menú digital QR fue la mejor decisión. Los clientes piden solos, nosotros nos enfocamos en el servicio.' },
  { name: 'Roberto C.',   role: 'La Leña',         text: 'La pantalla de cocina eliminó los papelitos y los gritos. El equipo está más tranquilo.' },
  { name: 'Valentina G.', role: 'El Patio',        text: 'El cierre de caja ahora me toma 5 minutos. Antes perdía media hora cada noche.' },
  { name: 'Andrés T.',    role: '6 sucursales',    text: 'Waitless escala contigo. Empecé con un local y hoy manejo seis desde el mismo tablero.' },
  { name: 'Lorena B.',    role: 'Fusión MX',       text: 'El sistema de propinas y división de cuenta mejoró mucho la experiencia de mis clientes.' },
]

const PLANS = [
  {
    id: 'basico', name: 'Básico', price: '$299', period: '/mes',
    description: 'Para restaurantes que empiezan a digitalizar su operación.',
    highlight: false, badge: null,
    features: [
      { text: 'Hasta 5 mesas',         ok: true  },
      { text: 'Menú digital QR',        ok: true  },
      { text: 'Pedidos en mesa',        ok: true  },
      { text: 'Pantalla de cocina',     ok: true  },
      { text: 'Reportes básicos',       ok: true  },
      { text: 'Analítica avanzada',     ok: false },
      { text: 'Control de inventario',  ok: false },
      { text: 'Multi-sucursal',         ok: false },
      { text: 'Soporte prioritario',    ok: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: '$599', period: '/mes',
    description: 'Para restaurantes con mayor volumen que necesitan control total.',
    highlight: true, badge: 'Más popular',
    features: [
      { text: 'Hasta 15 mesas',         ok: true  },
      { text: 'Menú digital QR',        ok: true  },
      { text: 'Pedidos en mesa',        ok: true  },
      { text: 'Pantalla de cocina',     ok: true  },
      { text: 'Reportes básicos',       ok: true  },
      { text: 'Analítica avanzada',     ok: true  },
      { text: 'Control de inventario',  ok: true  },
      { text: 'Multi-sucursal',         ok: false },
      { text: 'Soporte prioritario',    ok: true  },
    ],
  },
  {
    id: 'business', name: 'Business', price: '$999', period: '/mes',
    description: 'Para cadenas y grupos con múltiples puntos de venta.',
    highlight: false, badge: null,
    features: [
      { text: 'Mesas ilimitadas',       ok: true },
      { text: 'Menú digital QR',        ok: true },
      { text: 'Pedidos en mesa',        ok: true },
      { text: 'Pantalla de cocina',     ok: true },
      { text: 'Reportes básicos',       ok: true },
      { text: 'Analítica avanzada',     ok: true },
      { text: 'Control de inventario',  ok: true },
      { text: 'Multi-sucursal',         ok: true },
      { text: 'Soporte prioritario',    ok: true },
    ],
  },
]

const STEPS = [
  { n: '01', icon: <Shield className="h-5 w-5" />,     title: 'Configura tu restaurante',     body: 'Agrega tus mesas, carga el menú y personaliza tu marca. Listo en menos de 30 minutos.' },
  { n: '02', icon: <Smartphone className="h-5 w-5" />, title: 'Tus clientes escanean el QR',  body: 'Cada mesa tiene su código único. El cliente ve el menú, hace su pedido y paga — sin app.' },
  { n: '03', icon: <ChefHat className="h-5 w-5" />,    title: 'Cocina recibe en pantalla',     body: 'Los pedidos llegan instantáneamente. Sin gritos, sin papel, sin errores de transcripción.' },
  { n: '04', icon: <BarChart2 className="h-5 w-5" />,  title: 'Cierra el día con claridad',    body: 'Dashboard con ventas, propinas, productos top y reporte listo para exportar.' },
]

const FEATURES = [
  { icon: <LayoutGrid className="h-5 w-5" />, title: 'Mesas en tiempo real',        body: 'Vista completa del salón. Libre, ocupada, en cocina, lista para cobrar. Todo en un vistazo.' },
  { icon: <ChefHat className="h-5 w-5" />,    title: 'Pantalla de cocina',           body: 'Sin papel, sin gritos. Los pedidos llegan en tiempo real directo al equipo de cocina.' },
  { icon: <BarChart2 className="h-5 w-5" />,  title: 'Analítica en tiempo real',     body: 'Ventas, propinas, ticket promedio y ranking de productos. Todo al instante.' },
  { icon: <CreditCard className="h-5 w-5" />, title: 'Cobro en mesa',                body: 'Efectivo, tarjeta, transferencia o Apple Pay. División de cuenta incluida.' },
  { icon: <Bell className="h-5 w-5" />,       title: 'Notificaciones al instante',   body: 'El mesero sabe exactamente cuándo el pedido está listo. Sin llamadas, sin confusión.' },
  { icon: <Building2 className="h-5 w-5" />,  title: 'Multi-sucursal',               body: 'Un solo panel para todos tus restaurantes. Compara rendimiento entre locales.' },
]

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function useCounter(target: number, duration = 1100, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let t0 = -1
    let raf: number
    const step = (ts: number) => {
      if (t0 < 0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, start])
  return val
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LandingPage({ onLogin }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loginDropdown, setLoginDropdown] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const loginRef = useRef<HTMLDivElement>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [planEmail, setPlanEmail] = useState('')
  const [showEmailFor, setShowEmailFor] = useState<string | null>(null)
  const [restaurants, setRestaurants] = useState<ExploreRestaurant[]>([])
  const carouselRef = useRef<HTMLDivElement>(null)

  const heroReveal    = useReveal(0.05)
  const stepsReveal   = useReveal(0.1)
  const featReveal    = useReveal(0.1)
  const pricingReveal = useReveal(0.1)
  const testReveal    = useReveal(0.1)
  const restoReveal   = useReveal(0.1)
  const ctaReveal     = useReveal(0.1)

  const c1 = useCounter(2,   900,  heroReveal.visible)
  const c2 = useCounter(40,  1100, heroReveal.visible)
  const c3 = useCounter(30,  1000, heroReveal.visible)

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 30)
      if (window.scrollY > 80) setMenuOpen(false)
    }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setLoginDropdown(false)
      }
    }
    if (loginDropdown) document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [loginDropdown])

  useEffect(() => {
    fetch('/api/public/explore')
      .then(r => r.ok ? r.json() : [])
      .then(data => setRestaurants(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    let raf: number, pos = 0
    const tick = () => {
      pos += 0.4
      if (pos >= el.scrollWidth / 2) pos = 0
      el.scrollLeft = pos
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const pause  = () => cancelAnimationFrame(raf)
    const resume = () => { raf = requestAnimationFrame(tick) }
    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', resume)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', resume)
    }
  }, [])

  const NAV_H = 64

  const goTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - NAV_H
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setMenuOpen(false)
  }

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMenuOpen(false)
  }

  const handlePlanClick = async (planId: string) => {
    if (!showEmailFor || showEmailFor !== planId) {
      setShowEmailFor(planId)
      setPlanEmail('')
      return
    }
    const email = planEmail.trim()
    if (email && !email.includes('@')) return
    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, email: planEmail.trim() || undefined }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error ?? 'Error al procesar el pago')
    } catch {
      alert('Error de conexión')
    } finally {
      setLoadingPlan(null)
    }
  }

  // Nav text adapts: white over dark hero, dark after scroll
  const navText    = scrolled ? 'text-foreground'              : 'text-white'
  const navMuted   = scrolled ? 'text-zinc-500 hover:text-foreground' : 'text-white/50 hover:text-white'
  const navBtnBg   = scrolled ? 'bg-zinc-900 text-white'  : 'bg-white text-foreground'

  return (
    <div className="text-foreground overflow-x-hidden" style={{ fontFamily: "'Sora', 'Inter', system-ui, sans-serif" }}>

      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes scaleUp { from { opacity:0; transform:scale(0.97) }     to { opacity:1; transform:scale(1) } }
        .rv  { opacity:0 }
        .rvs { opacity:0 }
        .show .rv  { animation: fadeUp  0.6s cubic-bezier(0.22,1,0.36,1) forwards }
        .show .rvs { animation: scaleUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards }
        .d1 { animation-delay:.08s!important } .d2 { animation-delay:.16s!important }
        .d3 { animation-delay:.24s!important } .d4 { animation-delay:.32s!important }
        .d5 { animation-delay:.40s!important } .d6 { animation-delay:.48s!important }
        @media (prefers-reduced-motion:reduce) { .rv,.rvs { opacity:1!important; animation:none!important } }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ease-in-out ${
        scrolled ? 'bg-white/95 backdrop-blur-lg border-b border-zinc-200/60' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo — goes to top, not login */}
          <button onClick={goTop} className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: scrolled ? '#18181b' : '#fff' }}>
              <span className="font-semibold text-sm leading-none" style={{ color: scrolled ? '#fff' : '#111' }}>W</span>
            </div>
            <span className={`font-medium text-sm tracking-tight transition-colors ${navText}`}>WAITLESS</span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {[['how','Cómo funciona'],['features','Funciones'],['pricing','Precios'],['testimonials','Clientes']].map(([id,l]) => (
              <button key={id} onClick={() => goTo(id)}
                className={`text-sm font-medium transition-colors cursor-pointer ${navMuted}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <a href="/explore"
              className={`text-sm font-medium transition-colors px-3 py-2 cursor-pointer ${navMuted}`}>
              Explorar restaurantes
            </a>

            {/* Login dropdown */}
            <div ref={loginRef} className="relative">
              <button
                onClick={() => setLoginDropdown(v => !v)}
                className={`text-sm font-medium transition-colors px-3 py-2 cursor-pointer flex items-center gap-1 ${navMuted}`}
              >
                Iniciar sesión
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className={`transition-transform duration-200 ${loginDropdown ? 'rotate-180' : ''}`}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {loginDropdown && (
                <div className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-2xl shadow-2xl border border-zinc-100 p-3 z-50 flex gap-2">
                  {/* Consumidor */}
                  <a
                    href="/consumidor"
                    onClick={() => setLoginDropdown(false)}
                    className="flex-1 flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 transition-colors group text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                      <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                        <circle cx="17" cy="12" r="6" stroke="#18181b" strokeWidth="2" fill="none"/>
                        <path d="M5 28c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#18181b" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        <circle cx="25" cy="20" r="5" fill="#18181b"/>
                        <path d="M22.5 20h5M25 17.5v5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">Soy consumidor</p>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Pedí en tus restaurantes favoritos</p>
                    </div>
                  </a>

                  <div className="w-px bg-zinc-100 my-2" />

                  {/* Restaurante */}
                  <button
                    onClick={() => { setLoginDropdown(false); onLogin() }}
                    className="flex-1 flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-zinc-50 transition-colors group text-center cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                      <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                        <rect x="6" y="18" width="22" height="12" rx="2" stroke="#18181b" strokeWidth="2" fill="none"/>
                        <path d="M10 18v-4a7 7 0 0114 0v4" stroke="#18181b" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        <path d="M14 25h6" stroke="#18181b" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="17" cy="14" r="2.5" fill="#18181b"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">Soy restaurante</p>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Gestioná tu operación completa</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => goTo('pricing')}
              className={`text-sm font-medium px-5 py-2 rounded-full transition-all hover:opacity-85 active:scale-[0.98] cursor-pointer ${navBtnBg}`}>
              Ver planes
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className={`md:hidden p-1 transition-colors ${navMuted}`}
            onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-zinc-100 px-6 py-4 shadow-lg">
            {[['how','Cómo funciona'],['features','Funciones'],['pricing','Precios'],['testimonials','Clientes']].map(([id,l]) => (
              <button key={id} onClick={() => goTo(id)}
                className="block w-full text-left text-zinc-600 text-sm py-2.5 font-medium hover:text-foreground transition-colors cursor-pointer">
                {l}
              </button>
            ))}
            <div className="pt-3 border-t border-zinc-100 mt-1 space-y-2">
              <a href="/explore"
                className="flex items-center gap-1.5 w-full text-zinc-600 text-sm py-2 font-medium cursor-pointer">
                Explorar restaurantes
                <ChevronRight className="h-3.5 w-3.5" />
              </a>

              {/* Mobile login options */}
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider pt-1">Iniciar sesión como</p>
              <div className="flex gap-2">
                <a
                  href="/consumidor"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <svg width="22" height="22" viewBox="0 0 34 34" fill="none">
                      <circle cx="17" cy="12" r="6" stroke="#18181b" strokeWidth="2" fill="none"/>
                      <path d="M5 28c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#18181b" strokeWidth="2" fill="none" strokeLinecap="round"/>
                      <circle cx="25" cy="20" r="5" fill="#18181b"/>
                      <path d="M22.5 20h5M25 17.5v5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-zinc-800">Consumidor</span>
                </a>
                <button
                  onClick={() => { setMenuOpen(false); onLogin() }}
                  className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors text-center cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <svg width="22" height="22" viewBox="0 0 34 34" fill="none">
                      <rect x="6" y="18" width="22" height="12" rx="2" stroke="#18181b" strokeWidth="2" fill="none"/>
                      <path d="M10 18v-4a7 7 0 0114 0v4" stroke="#18181b" strokeWidth="2" fill="none" strokeLinecap="round"/>
                      <path d="M14 25h6" stroke="#18181b" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="17" cy="14" r="2.5" fill="#18181b"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-zinc-800">Restaurante</span>
                </button>
              </div>

              <button onClick={() => goTo('pricing')}
                className="block w-full text-center text-sm font-medium px-5 py-3 rounded-full text-white bg-zinc-900 cursor-pointer hover:opacity-90">
                Ver planes
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── #000 ─────────────────────────────────────── */}
      <section id="hero" className="min-h-screen flex flex-col justify-center px-6 pt-16" style={{ background: '#000' }}>
        <div ref={heroReveal.ref}
          className={`max-w-6xl mx-auto w-full py-20 md:py-24 flex flex-col lg:flex-row items-center gap-16 ${heroReveal.visible ? 'show' : ''}`}>

          {/* Copy */}
          <div className="flex-1 min-w-0 text-center lg:text-left">

            <div className="rv inline-flex items-center gap-2 rounded-full px-3.5 py-1 mb-8 border border-white/10">
              <span className="text-white/40 text-[11px] font-medium tracking-wide">Plataforma operativa para restaurantes</span>
            </div>

            <h1 className="rv d1 text-4xl md:text-5xl font-semibold leading-[1.1] tracking-[-0.02em] mb-5 text-white">
              Operación perfecta.{' '}
              <span className="text-white/25 font-light">Sin fricciones.</span>
            </h1>

            <p className="rv d2 text-white/40 text-base leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
              De la mesa al cobro en segundos. Gestiona pedidos, cocina y analítica desde un solo panel.
            </p>

            <div className="rv d3 flex flex-col sm:flex-row gap-3 mb-14 justify-center lg:justify-start">
              <button onClick={() => goTo('pricing')}
                className="inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-full text-sm text-foreground bg-white hover:bg-zinc-100 transition-all group active:scale-[0.98] cursor-pointer">
                Comenzar gratis
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button onClick={() => goTo('how')}
                className="inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-full text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                Ver cómo funciona
              </button>
            </div>

            {/* KPIs */}
            <div className="rv d4 flex gap-10 justify-center lg:justify-start">
              {[
                { v: `${c1}x`,   sub: 'pagos más rápidos' },
                { v: `+${c2}%`,  sub: 'más ventas' },
                { v: `${c3}%`,   sub: 'menos errores' },
              ].map(k => (
                <div key={k.sub} className="text-center lg:text-left">
                  <p className="text-2xl font-semibold text-white tabular-nums leading-none">{k.v}</p>
                  <p className="text-white/30 text-[11px] mt-1.5 font-light">{k.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* App mock */}
          <div className="rvs d3 flex-shrink-0 w-full lg:w-[420px] hidden lg:block relative">
            <div className="rounded-2xl overflow-hidden border border-white/[0.08]" style={{ background: '#141414' }}>
              {/* Chrome bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06]" style={{ background: '#0d0d0d' }}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                <div className="flex-1 mx-3 rounded py-1 text-center text-[10px] text-white/20" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  waitless.app/admin
                </div>
              </div>
              {/* Content */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-medium text-sm">Panel de mesas</p>
                    <p className="text-white/30 text-[10px] mt-0.5">Hoy · 13:42</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[['Libre','rgba(255,255,255,0.05)','rgba(255,255,255,0.35)'],
                      ['Ocupada','rgba(255,255,255,0.09)','rgba(255,255,255,0.65)'],
                      ['Lista','rgba(16,185,129,0.12)','#34d399']].map(([s,bg,c]) => (
                      <span key={s} className="text-[9px] px-2 py-1 rounded-full font-medium"
                        style={{ background: bg, color: c }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[{n:1,s:'libre'},{n:2,s:'ocupada'},{n:3,s:'cocina'},{n:4,s:'lista'},
                    {n:5,s:'ocupada'},{n:6,s:'libre'},{n:7,s:'lista'},{n:8,s:'ocupada'}].map(t => (
                    <div key={t.n} className="rounded-xl p-3 border flex flex-col items-center gap-1.5"
                      style={{
                        background:   t.s==='lista' ? 'rgba(16,185,129,0.07)' : t.s==='cocina' ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.025)',
                        borderColor:  t.s==='lista' ? 'rgba(16,185,129,0.18)' : t.s==='cocina' ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.06)',
                      }}>
                      <p className="text-white font-medium text-xs leading-none">{t.n}</p>
                      <div className="w-1.5 h-1.5 rounded-full" style={{
                        background: t.s==='libre' ? 'rgba(255,255,255,0.2)' : t.s==='ocupada' ? 'rgba(255,255,255,0.5)' : t.s==='cocina' ? '#fbbf24' : '#34d399'
                      }} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Libres','4','rgba(255,255,255,0.35)'],['En servicio','6','rgba(255,255,255,0.60)'],['Listas','2','#34d399']].map(([l,v,c]) => (
                    <div key={l} className="rounded-xl p-3 text-center border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.025)' }}>
                      <p className="text-sm font-semibold tabular-nums" style={{ color: c }}>{v}</p>
                      <p className="text-[9px] text-white/25 mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating notification */}
            <div className="absolute -bottom-4 -left-6 rounded-xl p-3 border border-white/[0.09] flex items-center gap-2.5"
              style={{ background: '#1c1c1e', minWidth: '172px' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.12)' }}>
                <Bell className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-white text-[11px] font-medium leading-tight">Mesa 3 lista</p>
                <p className="text-white/30 text-[10px]">Pedido #47 completado</p>
              </div>
            </div>

            {/* Floating stat */}
            <div className="absolute -top-3 -right-5 rounded-xl px-3.5 py-2.5 border border-white/[0.09]"
              style={{ background: '#1c1c1e' }}>
              <p className="text-white/30 text-[10px] mb-0.5">Ticket promedio</p>
              <p className="text-white font-semibold text-base leading-none">$487</p>
            </div>
          </div>
        </div>

        {/* Social proof — inside hero, same dark background */}
        <div className="border-t border-white/[0.06] py-6 px-0">
          <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-2">
            <span className="text-white/20 text-[10px] font-medium uppercase tracking-[0.2em]">Confían en Waitless</span>
            {['Tacos El Rey','Bistró 33','Café Lumbre','La Leña','El Patio','Fusión MX'].map(n => (
              <span key={n} className="text-white/20 text-xs font-light">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── white ────────────────────────────── */}
      <section id="how" className="bg-white py-28 px-6">
        <div ref={stepsReveal.ref} className={`max-w-6xl mx-auto ${stepsReveal.visible ? 'show' : ''}`}>
          <div className="text-center mb-16">
            <span className="rv inline-block text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 mb-4">Cómo funciona</span>
            <h2 className="rv d1 text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
              Listo en 30 minutos.
            </h2>
            <p className="rv d2 text-zinc-400 text-base mt-3 max-w-sm mx-auto leading-relaxed">
              Sin técnicos, sin contratos largos, sin complicaciones.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className={`rv d${i + 1} group text-center flex flex-col items-center`}>
                <div className="relative mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-zinc-100 group-hover:bg-zinc-900 transition-colors duration-300">
                    <div className="text-zinc-400 group-hover:text-white transition-colors duration-300">{s.icon}</div>
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center">
                    <span className="text-white text-[8px] font-semibold">{s.n}</span>
                  </div>
                </div>
                <h3 className="font-medium text-foreground text-sm mb-1.5 leading-snug">{s.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── #111 ─────────────────────────────────── */}
      <section id="features" className="py-28 px-6" style={{ background: '#111' }}>
        <div ref={featReveal.ref} className={`max-w-6xl mx-auto ${featReveal.visible ? 'show' : ''}`}>
          <div className="text-center mb-16">
            <span className="rv inline-block text-[10px] font-medium uppercase tracking-[0.22em] text-white/30 mb-4">Funciones</span>
            <h2 className="rv d1 text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-white">
              Todo lo que necesitas.
            </h2>
            <p className="rv d2 text-white/40 text-base mt-3 max-w-sm mx-auto leading-relaxed">
              Una sola plataforma reemplaza tres sistemas distintos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className={`rv d${i + 1} group rounded-2xl p-7 border border-white/[0.06] hover:border-white/[0.10] transition-colors duration-300 cursor-default`}
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 border border-white/[0.07] group-hover:border-white/[0.12] transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="text-white/50 group-hover:text-white/75 transition-colors">{f.icon}</div>
                </div>
                <h3 className="font-medium text-white text-sm mb-2 leading-snug">{f.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>

          <div className="rv d5 mt-8 flex flex-wrap gap-2 justify-center">
            {['Menú QR','Lista de espera','Inventario','Lealtad','Reembolsos','Exportar reportes','Historial de mesas'].map(p => (
              <span key={p}
                className="rounded-full px-3.5 py-1.5 text-xs font-light text-white/25 border border-white/[0.06] hover:text-white/45 hover:border-white/[0.10] transition-all cursor-default">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── light ─────────────────────────────────── */}
      <section id="pricing" className="bg-[#f9fafb] py-28 px-6">
        <div ref={pricingReveal.ref} className={`max-w-6xl mx-auto ${pricingReveal.visible ? 'show' : ''}`}>
          <div className="text-center mb-16">
            <span className="rv inline-block text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 mb-4">Precios</span>
            <h2 className="rv d1 text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
              Sin sorpresas.
            </h2>
            <p className="rv d2 text-zinc-400 text-base mt-3 max-w-sm mx-auto leading-relaxed">
              Onboarding gratuito y soporte por chat en todos los planes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => (
              <div key={plan.id}
                className={`rv d${i + 1} relative rounded-2xl flex flex-col overflow-hidden transition-all duration-300`}
                style={plan.highlight ? {
                  background: '#18181b',
                  boxShadow: '0 20px 48px rgba(0,0,0,0.16)',
                } : {
                  background: '#fff',
                  border: '1px solid #e4e4e7',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>

                {plan.badge && (
                  <div className="text-center py-2 text-[11px] font-medium text-white tracking-wide bg-emerald-500">
                    {plan.badge}
                  </div>
                )}

                <div className="p-7 flex flex-col flex-1">
                  <div className="mb-6">
                    <p className={`text-[10px] font-medium uppercase tracking-[0.2em] mb-4 ${plan.highlight ? 'text-white/35' : 'text-zinc-400'}`}>
                      {plan.name}
                    </p>
                    <div className="flex items-end gap-1 mb-3">
                      <span className={`text-4xl font-semibold tracking-tight tabular-nums ${plan.highlight ? 'text-white' : 'text-foreground'}`}>
                        {plan.price}
                      </span>
                      <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-white/30' : 'text-zinc-400'}`}>{plan.period}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-white/45' : 'text-zinc-500'}`}>
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map(f => (
                      <li key={f.text} className={`flex items-center gap-3 text-sm ${
                        f.ok
                          ? plan.highlight ? 'text-white/75' : 'text-zinc-700'
                          : plan.highlight ? 'text-white/18' : 'text-zinc-300'
                      }`}>
                        {f.ok
                          ? <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          : <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: plan.highlight ? 'rgba(255,255,255,0.07)' : '#f4f4f5' }}>
                              <Minus className="h-2.5 w-2.5" style={{ color: plan.highlight ? 'rgba(255,255,255,0.2)' : '#d4d4d8' }} />
                            </div>
                        }
                        {f.text}
                      </li>
                    ))}
                  </ul>

                  {showEmailFor === plan.id && (
                    <div className="mb-3 space-y-2">
                      <input
                        type="email" placeholder="tu@email.com" value={planEmail}
                        onChange={e => setPlanEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePlanClick(plan.id)}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
                        style={plan.highlight
                          ? { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)', color: '#fff' }
                          : { background: '#f9fafb', borderColor: '#e4e4e7', color: '#111' }}
                        autoFocus />
                      <button
                        onClick={() => setShowEmailFor(null)}
                        className={`w-full text-xs py-1 cursor-pointer transition-colors ${plan.highlight ? 'text-white/25 hover:text-white/50' : 'text-zinc-400 hover:text-zinc-600'}`}>
                        Cancelar
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handlePlanClick(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className="w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] hover:opacity-90"
                    style={plan.highlight
                      ? { background: '#fff', color: '#18181b' }
                      : { background: '#18181b', color: '#fff' }}>
                    {loadingPlan === plan.id
                      ? <span className="h-4 w-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: plan.highlight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)', borderTopColor: 'currentColor' }} />
                      : showEmailFor === plan.id
                        ? <>Continuar al pago <ChevronRight className="h-4 w-4" /></>
                        : <>Elegir {plan.name} <ChevronRight className="h-4 w-4" /></>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="rv d4 text-center text-zinc-400 text-xs mt-5">
            Precios en MXN · IVA no incluido · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── white ────────────────────────────── */}
      <section id="testimonials" className="bg-white py-28 overflow-hidden">
        <div ref={testReveal.ref} className={`max-w-6xl mx-auto px-6 mb-12 ${testReveal.visible ? 'show' : ''}`}>
          <div className="text-center">
            <span className="rv inline-block text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 mb-4">Testimonios</span>
            <h2 className="rv d1 text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
              Lo que dicen nuestros clientes
            </h2>
          </div>
        </div>

        <div ref={carouselRef} className="flex gap-4 overflow-x-hidden select-none pl-6">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div key={i} className="flex-shrink-0 rounded-2xl p-5 border border-zinc-100 bg-[#fafafa] hover:border-zinc-200 transition-colors"
              style={{ width: '272px' }}>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div>
                <p className="font-medium text-sm text-foreground">{t.name}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── RESTAURANTS ── white ─────────────────────────────── */}
      {restaurants.length > 0 && (
        <section id="restaurants" className="bg-white py-28 px-6">
          <div ref={restoReveal.ref} className={`max-w-6xl mx-auto ${restoReveal.visible ? 'show' : ''}`}>
            <div className="text-center mb-16">
              <span className="rv inline-block text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 mb-4">En Waitless</span>
              <h2 className="rv d1 text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
                Restaurantes que ya usan Waitless
              </h2>
              <p className="rv d2 text-zinc-400 text-base mt-3 max-w-sm mx-auto leading-relaxed">
                Descubre sus menús, ordena y vive la experiencia.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {restaurants.map((r, i) => (
                <a
                  key={r.slug}
                  href={`/menu/${r.slug}`}
                  className={`rv d${Math.min(i + 1, 6)} group rounded-2xl overflow-hidden border border-zinc-100 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
                >
                  {/* Cover */}
                  <div className="relative h-44 overflow-hidden" style={{ background: r.primaryColor }}>
                    {r.coverUrl
                      ? <img src={r.coverUrl} alt={r.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center opacity-20">
                          <Utensils className="w-12 h-12 text-white" />
                        </div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Logo */}
                    {r.logoUrl && (
                      <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-white shadow-md overflow-hidden border-2 border-white">
                        <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Rating */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-black">{r.rating > 0 ? r.rating.toFixed(1) : 'Nuevo'}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-[15px] text-foreground tracking-tight leading-tight">{r.nombre}</h3>
                    {r.descripcion
                      ? <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{r.descripcion}</p>
                      : r.featuredItems.length > 0
                      ? <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{r.featuredItems.map(it => it.nombre).join(' · ')}</p>
                      : null
                    }
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">
                        {r.totalRatings > 0 ? `${r.totalRatings} reseña${r.totalRatings !== 1 ? 's' : ''}` : 'Sin reseñas aún'}
                      </span>
                      <span className="text-[11px] font-semibold text-foreground flex items-center gap-1 group-hover:gap-2 transition-all">
                        Ver menú <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="rv d5 text-center">
              <a
                href="/explore"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground border border-zinc-200 rounded-full px-6 py-3 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all duration-200"
              >
                Ver todos los restaurantes
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── #111 ──────────────────────────────────────── */}
      <section className="py-28 px-6 text-center" style={{ background: '#111' }}>
        <div ref={ctaReveal.ref} className={`max-w-xl mx-auto ${ctaReveal.visible ? 'show' : ''}`}>
          <span className="rv inline-block text-[10px] font-medium uppercase tracking-[0.25em] text-white/25 mb-6">Empieza hoy</span>
          <h2 className="rv d1 text-3xl md:text-4xl font-semibold leading-[1.1] tracking-[-0.02em] mb-5 text-white">
            Tu restaurante merece<br />operar mejor.
          </h2>
          <p className="rv d2 text-white/35 text-base mb-10 max-w-xs mx-auto leading-relaxed">
            Herramientas que dignifican el trabajo de quienes mueven el mundo.
          </p>
          <div className="rv d3 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => goTo('pricing')}
              className="inline-flex items-center justify-center gap-2 font-medium px-8 py-3 rounded-full text-sm text-foreground bg-white hover:bg-zinc-100 transition-all group active:scale-[0.98] cursor-pointer">
              Ver planes y precios
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={onLogin}
              className="inline-flex items-center justify-center gap-2 font-medium px-8 py-3 rounded-full text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer">
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── #111 ───────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-14" style={{ background: '#111' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            <div className="col-span-2">
              <button onClick={goTop} className="flex items-center gap-2 mb-4 cursor-pointer group">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e4e4e7' }}>
                  <span className="font-semibold text-foreground text-sm">W</span>
                </div>
                <span className="font-medium text-white/60 group-hover:text-white/90 transition-colors text-sm">WAITLESS</span>
              </button>
              <p className="text-white/20 text-sm leading-relaxed max-w-xs font-light">
                Plataforma operativa para restaurantes con servicio en mesa.
              </p>
            </div>

            {([
              { h: 'Producto', l: [
                { label: 'Menú Digital',    id: 'features' },
                { label: 'Sistema POS',     id: 'features' },
                { label: 'Pantalla Cocina', id: 'features' },
                { label: 'Analítica',       id: 'features' },
              ]},
              { h: 'Planes', l: [
                { label: 'Básico',   id: 'pricing' },
                { label: 'Pro',      id: 'pricing' },
                { label: 'Business', id: 'pricing' },
              ]},
              { h: 'Navegar', l: [
                { label: 'Cómo funciona', id: 'how' },
                { label: 'Funciones',     id: 'features' },
                { label: 'Clientes',      id: 'testimonials' },
              ]},
            ] as { h: string; l: { label: string; id: string }[] }[]).map(col => (
              <div key={col.h}>
                <p className="text-white/30 text-[10px] font-medium uppercase tracking-[0.15em] mb-4">{col.h}</p>
                <ul className="space-y-2.5">
                  {col.l.map(link => (
                    <li key={link.label}>
                      <button onClick={() => goTo(link.id)}
                        className="text-white/20 text-sm font-light hover:text-white/50 transition-colors cursor-pointer text-left">
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.05] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/15 text-xs font-light">© 2026 WAITLESS · Plataforma Operativa para Restaurantes</p>
            <div className="flex items-center gap-3">
              <a href="/consumidor"
                className="text-white/20 text-xs hover:text-white/45 transition-colors flex items-center gap-1 cursor-pointer font-light">
                Consumidores <ChevronRight className="h-3 w-3" />
              </a>
              <button onClick={onLogin}
                className="text-white/20 text-xs hover:text-white/45 transition-colors flex items-center gap-1 cursor-pointer font-light">
                Restaurantes <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
