'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronRight, Star, ArrowRight, Zap, TrendingUp,
  Menu, X, Check, LayoutGrid, ChefHat, BarChart2,
  CreditCard, Bell, Building2, Minus, Clock, Shield,
} from 'lucide-react'

interface LandingPageProps {
  onLogin: () => void
}

// ── Data ──────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  { name: 'Carlos M.', role: 'Tacos El Rey', text: 'Los pedidos llegan directo a cocina sin errores. Bajamos los tiempos de servicio a la mitad.' },
  { name: 'Sofía R.', role: 'Bistró 33', text: 'El panel de analytics me da claridad que antes solo tenía en mi cabeza. Decisiones con datos reales.' },
  { name: 'Miguel A.', role: '4 locales', text: 'Manejar varias sucursales desde un solo panel es un cambio total. Antes necesitaba 3 sistemas.' },
  { name: 'Daniela P.', role: 'Café Lumbre', text: 'El menú digital QR fue la mejor decisión. Los clientes piden solos, nosotros nos enfocamos en el servicio.' },
  { name: 'Roberto C.', role: 'La Leña', text: 'La pantalla de cocina eliminó los papelitos y los gritos. El equipo está más tranquilo.' },
  { name: 'Valentina G.', role: 'El Patio', text: 'El cierre de caja ahora me toma 5 minutos. Antes perdía media hora cada noche.' },
  { name: 'Andrés T.', role: '6 sucursales', text: 'Waitless escala contigo. Empecé con un local y hoy manejo seis desde el mismo tablero.' },
  { name: 'Lorena B.', role: 'Fusión MX', text: 'El sistema de propinas y división de cuenta mejoró mucho la experiencia de mis clientes.' },
]

const PLANS = [
  {
    id: 'basico',
    name: 'Básico',
    price: '$299',
    period: '/mes',
    description: 'Para restaurantes que empiezan a digitalizar su operación.',
    highlight: false,
    features: [
      { text: 'Hasta 5 mesas', included: true },
      { text: 'Menú digital QR', included: true },
      { text: 'Pedidos en mesa', included: true },
      { text: 'Pantalla de cocina', included: true },
      { text: 'Reportes básicos', included: true },
      { text: 'Analítica avanzada', included: false },
      { text: 'Control de inventario', included: false },
      { text: 'Lista de espera', included: false },
      { text: 'Multi-sucursal', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$599',
    period: '/mes',
    description: 'Para restaurantes con mayor volumen que necesitan control total.',
    highlight: true,
    features: [
      { text: 'Hasta 15 mesas', included: true },
      { text: 'Menú digital QR', included: true },
      { text: 'Pedidos en mesa', included: true },
      { text: 'Pantalla de cocina', included: true },
      { text: 'Reportes básicos', included: true },
      { text: 'Analítica avanzada', included: true },
      { text: 'Control de inventario', included: true },
      { text: 'Lista de espera', included: true },
      { text: 'Multi-sucursal', included: false },
      { text: 'Soporte prioritario', included: true },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '$999',
    period: '/mes',
    description: 'Para cadenas y grupos con múltiples puntos de venta.',
    highlight: false,
    features: [
      { text: 'Mesas ilimitadas', included: true },
      { text: 'Menú digital QR', included: true },
      { text: 'Pedidos en mesa', included: true },
      { text: 'Pantalla de cocina', included: true },
      { text: 'Reportes básicos', included: true },
      { text: 'Analítica avanzada', included: true },
      { text: 'Control de inventario', included: true },
      { text: 'Lista de espera', included: true },
      { text: 'Multi-sucursal', included: true },
      { text: 'Soporte prioritario', included: true },
    ],
  },
]

const HOW_IT_WORKS = [
  { step: '01', icon: <Shield className="h-5 w-5" />, title: 'Configura tu restaurante', body: 'Agrega tus mesas, carga el menú y personaliza tu marca. Listo en menos de 30 minutos.' },
  { step: '02', icon: <Zap className="h-5 w-5" />, title: 'Tus clientes escanean el QR', body: 'Cada mesa tiene su código único. El cliente ve el menú, hace su pedido y paga — sin app.' },
  { step: '03', icon: <ChefHat className="h-5 w-5" />, title: 'Cocina recibe en pantalla', body: 'Los pedidos llegan instantáneamente. Sin gritos, sin papel, sin errores.' },
  { step: '04', icon: <BarChart2 className="h-5 w-5" />, title: 'Cierra el día con claridad', body: 'Dashboard con ventas, propinas, productos top y reporte listo para exportar.' },
]

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}

function useCounter(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return value
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LandingPage({ onLogin }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [planEmail, setPlanEmail] = useState('')
  const [showEmailFor, setShowEmailFor] = useState<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Scroll spy
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Infinite carousel
  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    let frame: number
    let pos = 0
    const tick = () => {
      pos += 0.4
      if (pos >= el.scrollWidth / 2) pos = 0
      el.scrollLeft = pos
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const pause = () => cancelAnimationFrame(frame)
    const resume = () => { frame = requestAnimationFrame(tick) }
    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', resume)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', resume)
    }
  }, [])

  const handlePlanClick = async (planId: string) => {
    if (!showEmailFor || showEmailFor !== planId) {
      setShowEmailFor(planId)
      setPlanEmail('')
      return
    }
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

  // Reveal hooks per section
  const heroReveal = useReveal(0.05)
  const howReveal = useReveal(0.1)
  const featReveal = useReveal(0.1)
  const pricingReveal = useReveal(0.1)
  const testimonialsReveal = useReveal(0.1)
  const bannerReveal = useReveal(0.1)
  const ctaReveal = useReveal(0.1)

  // KPI counter — starts when hero visible
  const kpi1 = useCounter(2, 800, heroReveal.visible)
  const kpi2 = useCounter(40, 1000, heroReveal.visible)
  const kpi3 = useCounter(35, 900, heroReveal.visible)

  // Shared gradient text style
  const gradText: React.CSSProperties = {
    background: 'linear-gradient(180deg, #ffffff 35%, rgba(255,255,255,0.42) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }

  return (
    <div className="bg-[#080808] text-white font-sans overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .reveal-fadeup  { opacity: 0; }
        .reveal-fadein  { opacity: 0; }
        .reveal-scale   { opacity: 0; }
        .is-visible .reveal-fadeup  { animation: fadeUp  0.65s cubic-bezier(0.22,1,0.36,1) forwards; }
        .is-visible .reveal-fadein  { animation: fadeIn  0.6s  ease forwards; }
        .is-visible .reveal-scale   { animation: scaleIn 0.6s  cubic-bezier(0.22,1,0.36,1) forwards; }
        .delay-100 { animation-delay: 0.1s !important; }
        .delay-200 { animation-delay: 0.2s !important; }
        .delay-300 { animation-delay: 0.3s !important; }
        .delay-400 { animation-delay: 0.4s !important; }
        .delay-500 { animation-delay: 0.5s !important; }
        .delay-600 { animation-delay: 0.6s !important; }
        .delay-700 { animation-delay: 0.7s !important; }
        @media (prefers-reduced-motion: reduce) {
          .reveal-fadeup, .reveal-fadein, .reveal-scale { opacity: 1 !important; animation: none !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[#080808]/90 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onLogin} className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.12)]"
              style={{ background: 'linear-gradient(135deg, #fff 0%, #d4d4d4 100%)' }}>
              <span className="font-black text-black text-sm leading-none">W</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight group-hover:text-white/70 transition-colors">WAITLESS</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {[['#how', 'Cómo funciona'], ['#features', 'Funciones'], ['#pricing', 'Precios'], ['#testimonials', 'Clientes']].map(([href, label]) => (
              <a key={href} href={href} className="text-white/45 hover:text-white text-sm transition-colors duration-200">{label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={onLogin} className="text-white/45 hover:text-white text-sm transition-colors px-3 py-2">
              Iniciar sesión
            </button>
            <a href="#pricing" className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #fff 0%, #e5e5e5 100%)', color: '#000' }}>
              Ver planes
            </a>
          </div>

          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#0a0a0a] border-t border-white/[0.06] px-6 py-5 space-y-1">
            {[['#how', 'Cómo funciona'], ['#features', 'Funciones'], ['#pricing', 'Precios'], ['#testimonials', 'Clientes']].map(([href, label]) => (
              <a key={href} href={href} className="block text-white/55 text-sm py-2.5 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="pt-3 space-y-2 border-t border-white/[0.06] mt-2">
              <button onClick={() => { setMenuOpen(false); onLogin() }} className="block w-full text-left text-white/55 text-sm py-2">Iniciar sesión</button>
              <a href="#pricing" onClick={() => setMenuOpen(false)}
                className="block w-full text-center text-sm font-semibold px-5 py-3 rounded-full"
                style={{ background: 'linear-gradient(135deg, #fff 0%, #e5e5e5 100%)', color: '#000' }}>
                Ver planes
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col px-6 pt-16 overflow-hidden" style={{ background: '#080808' }}>
        {/* Radial glow top */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(255,255,255,0.07) 0%, transparent 65%)' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #080808)' }} />

        <div ref={heroReveal.ref} className={`relative max-w-6xl mx-auto w-full flex-1 flex flex-col lg:flex-row items-center gap-16 py-20 md:py-24 ${heroReveal.visible ? 'is-visible' : ''}`}>

          {/* Left: copy */}
          <div className="flex-1 min-w-0">
            {/* Badge */}
            <div className="reveal-fadeup inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.09)' }}>
              <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-white/55 text-xs font-medium tracking-wide">Plataforma operativa para restaurantes</span>
            </div>

            {/* Headline */}
            <h1 className="reveal-fadeup delay-100 text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-[1.0] tracking-[-0.03em] mb-6">
              <span style={gradText}>Operación perfecta.</span>
              <br />
              <span style={{ color: 'rgba(255,255,255,0.18)' }}>Sin fricciones.</span>
            </h1>

            <p className="reveal-fadeup delay-200 text-white/40 text-lg leading-relaxed mb-10 max-w-md">
              De la mesa al cobro en segundos. Gestiona pedidos, cocina y analítica desde un solo panel.
            </p>

            <div className="reveal-fadeup delay-300 flex flex-col sm:flex-row gap-3 mb-14">
              <a href="#pricing"
                className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-full text-sm transition-all group hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #ffffff 0%, #d4d4d4 100%)', color: '#000' }}>
                Comenzar gratis
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href="#how"
                className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-full text-sm text-white/55 hover:text-white transition-all border border-white/10 hover:border-white/20">
                Ver cómo funciona
              </a>
            </div>

            {/* KPI cards — animated counters */}
            <div className="reveal-fadeup delay-400 grid grid-cols-3 gap-3 max-w-xs">
              {[
                { v: `${kpi1}x`,    l: 'Pagos más rápidos' },
                { v: `+${kpi2}%`,   l: 'Más ventas' },
                { v: `${kpi3}%`,    l: 'Mejores decisiones' },
              ].map(k => (
                <div key={k.l} className="rounded-2xl p-4 border hover:border-white/12 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <p className="text-xl font-black text-white tabular-nums">{k.v}</p>
                  <p className="text-white/32 text-[10px] mt-1 leading-tight">{k.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: App mock */}
          <div className="reveal-scale delay-300 flex-shrink-0 w-full lg:w-[460px] relative hidden lg:block">
            {/* Glow behind card */}
            <div className="absolute -inset-8 rounded-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />

            <div className="relative rounded-2xl border overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
              style={{ background: '#111', borderColor: 'rgba(255,255,255,0.07)' }}>
              {/* Window bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0d0d0d' }}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                <div className="flex-1 mx-3 rounded px-3 py-1 text-center text-[10px] text-white/18" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  waitless.app/mesas
                </div>
              </div>
              {/* App content */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-white font-bold text-sm">Mesas</p>
                    <p className="text-white/28 text-[10px] mt-0.5">12 mesas activas</p>
                  </div>
                  <div className="flex gap-1.5">
                    {['Libre', 'Ocupada', 'Lista'].map((s, i) => (
                      <span key={s} className="text-[9px] px-2 py-1 rounded-full font-semibold"
                        style={{
                          background: i === 0 ? 'rgba(255,255,255,0.05)' : i === 1 ? 'rgba(255,255,255,0.09)' : 'rgba(16,185,129,0.14)',
                          color: i === 0 ? 'rgba(255,255,255,0.38)' : i === 1 ? 'rgba(255,255,255,0.65)' : '#34d399',
                        }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { n: 1, s: 'libre' }, { n: 2, s: 'ocupada' }, { n: 3, s: 'cocina' }, { n: 4, s: 'lista' },
                    { n: 5, s: 'ocupada' }, { n: 6, s: 'libre' }, { n: 7, s: 'lista' }, { n: 8, s: 'ocupada' },
                  ].map(t => (
                    <div key={t.n} className="rounded-xl p-3 border flex flex-col items-center gap-1.5"
                      style={{
                        background: t.s === 'lista' ? 'rgba(16,185,129,0.07)' : t.s === 'cocina' ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.025)',
                        borderColor: t.s === 'lista' ? 'rgba(16,185,129,0.18)' : t.s === 'cocina' ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.055)',
                      }}>
                      <p className="text-white font-black text-sm leading-none">{t.n}</p>
                      <div className="w-1.5 h-1.5 rounded-full"
                        style={{ background: t.s === 'libre' ? 'rgba(255,255,255,0.18)' : t.s === 'ocupada' ? 'rgba(255,255,255,0.55)' : t.s === 'cocina' ? '#fbbf24' : '#34d399' }} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: 'Libres', v: '4', c: 'rgba(255,255,255,0.38)' },
                    { l: 'En servicio', v: '6', c: 'rgba(255,255,255,0.65)' },
                    { l: 'Listas', v: '2', c: '#34d399' },
                  ].map(s => (
                    <div key={s.l} className="rounded-xl p-3 text-center border" style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.055)' }}>
                      <p className="text-base font-black tabular-nums" style={{ color: s.c }}>{s.v}</p>
                      <p className="text-[9px] text-white/28 mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating notification */}
            <div className="absolute -bottom-5 -left-8 rounded-2xl p-3 border shadow-2xl flex items-center gap-3"
              style={{ background: '#1c1c1c', borderColor: 'rgba(255,255,255,0.09)', minWidth: '185px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.14)' }}>
                <Bell className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white text-[11px] font-semibold leading-tight">Mesa 3 lista</p>
                <p className="text-white/30 text-[10px]">Pedido #47 completado</p>
              </div>
            </div>

            {/* Floating order badge */}
            <div className="absolute -top-5 -right-6 rounded-2xl px-4 py-2.5 border shadow-2xl"
              style={{ background: '#1c1c1c', borderColor: 'rgba(255,255,255,0.09)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <p className="text-[10px] text-white/35 mb-0.5">Ticket promedio</p>
              <p className="text-white font-black text-base leading-none">$487</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <div className="border-y border-white/[0.05] py-5 px-6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-2">
          <span className="text-white/18 text-[10px] font-semibold uppercase tracking-[0.2em] mr-2">Operando en</span>
          {['Tacos El Rey', 'Bistró 33', 'Café Lumbre', 'La Leña', 'El Patio', 'Fusión MX'].map(name => (
            <span key={name} className="text-white/22 text-xs font-medium tracking-wide">{name}</span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-32 px-6" style={{ background: '#0d0d0d' }}>
        <div ref={howReveal.ref} className={`max-w-6xl mx-auto ${howReveal.visible ? 'is-visible' : ''}`}>
          <div className="mb-18 reveal-fadeup">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/22 mb-5">Cómo funciona</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.06] max-w-lg" style={gradText}>
              Listo en 30 minutos.<br />Operando para siempre.
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step}
                className={`reveal-fadeup delay-${(i + 1) * 100} relative rounded-2xl p-6 border transition-all hover:border-white/10 group cursor-default`}
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.055)' }}>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-10 -right-2 w-4 h-px bg-white/[0.08] z-10" />
                )}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-6 border border-white/[0.09]"
                  style={{ background: 'rgba(255,255,255,0.055)' }}>
                  <div className="text-white/55 group-hover:text-white/85 transition-colors">{s.icon}</div>
                </div>
                <p className="text-[10px] font-black text-white/18 tracking-[0.25em] mb-2">{s.step}</p>
                <h3 className="text-sm font-bold text-white/90 mb-2 leading-snug">{s.title}</h3>
                <p className="text-white/38 text-xs leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-32 px-6" style={{ background: '#080808' }}>
        <div ref={featReveal.ref} className={`max-w-6xl mx-auto ${featReveal.visible ? 'is-visible' : ''}`}>
          <div className="text-center mb-18 reveal-fadeup">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/22 mb-5">Funciones</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.06] inline-block" style={gradText}>
              Todo en un solo panel
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid md:grid-cols-3 gap-3">
            {/* Large */}
            <div className="reveal-fadeup md:col-span-2 rounded-3xl p-9 md:p-11 flex flex-col justify-between min-h-72 border border-white/[0.07] relative overflow-hidden group cursor-default"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.015) 100%)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 25% 50%, rgba(255,255,255,0.035) 0%, transparent 65%)' }} />
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-7 border border-white/[0.09]"
                  style={{ background: 'rgba(255,255,255,0.065)' }}>
                  <LayoutGrid className="h-5 w-5 text-white/65" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2.5">Gestión de mesas en tiempo real</h3>
                <p className="text-white/42 text-sm leading-relaxed max-w-sm">
                  Vista completa del salón. Libre, ocupada, en cocina, lista para cobrar. Todo en un vistazo.
                </p>
              </div>
              <div className="mt-9 flex flex-wrap gap-2">
                {[
                  { l: 'Libre', c: 'rgba(255,255,255,0.07)', t: 'rgba(255,255,255,0.38)' },
                  { l: 'Ocupada', c: 'rgba(255,255,255,0.11)', t: 'rgba(255,255,255,0.7)' },
                  { l: 'En cocina', c: 'rgba(245,158,11,0.14)', t: '#fbbf24' },
                  { l: 'Lista', c: 'rgba(16,185,129,0.14)', t: '#34d399' },
                ].map(s => (
                  <span key={s.l} className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: s.c, color: s.t }}>{s.l}</span>
                ))}
              </div>
            </div>

            <div className="reveal-fadeup delay-100 rounded-3xl p-8 flex flex-col border border-white/[0.055] group hover:border-white/[0.09] transition-colors cursor-default"
              style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-7 border border-white/[0.09]"
                style={{ background: 'rgba(255,255,255,0.065)' }}>
                <ChefHat className="h-5 w-5 text-white/65 group-hover:text-white/85 transition-colors" />
              </div>
              <h3 className="text-xl font-black text-white mb-2.5">Pantalla de cocina digital</h3>
              <p className="text-white/42 text-sm leading-relaxed">Sin papel. Sin gritos. Los pedidos llegan solos en tiempo real.</p>
            </div>

            <div className="reveal-fadeup delay-200 rounded-3xl p-8 border border-white/[0.055] group hover:border-white/[0.09] transition-colors cursor-default"
              style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-7 border border-white/[0.09]"
                style={{ background: 'rgba(255,255,255,0.065)' }}>
                <BarChart2 className="h-5 w-5 text-white/65 group-hover:text-white/85 transition-colors" />
              </div>
              <h3 className="text-xl font-black text-white mb-2.5">Analítica en tiempo real</h3>
              <p className="text-white/42 text-sm leading-relaxed">Ventas, propinas, ticket promedio y ranking de productos al instante.</p>
            </div>

            <div className="reveal-fadeup delay-300 rounded-3xl p-8 border border-white/[0.055] group hover:border-white/[0.09] transition-colors cursor-default"
              style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-7 border border-white/[0.09]"
                style={{ background: 'rgba(255,255,255,0.065)' }}>
                <CreditCard className="h-5 w-5 text-white/65 group-hover:text-white/85 transition-colors" />
              </div>
              <h3 className="text-xl font-black text-white mb-2.5">Cobro en mesa</h3>
              <p className="text-white/42 text-sm leading-relaxed">Efectivo, tarjeta, transferencia o Apple Pay. División de cuenta incluida.</p>
            </div>

            <div className="reveal-fadeup delay-400 rounded-3xl p-8 border border-white/[0.07] group relative overflow-hidden cursor-default"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.02) 100%)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-7 border border-white/[0.09]"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <Bell className="h-5 w-5 text-white/65" />
              </div>
              <h3 className="text-xl font-black text-white mb-2.5">Notificaciones al instante</h3>
              <p className="text-white/42 text-sm leading-relaxed">El mesero sabe cuando el pedido está listo. Sin llamadas, sin confusión.</p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="reveal-fadeup delay-500 mt-10 flex flex-wrap gap-2 justify-center">
            {['Menú QR', 'Lista de espera', 'Inventario', 'Multi-sucursal', 'Lealtad', 'Reembolsos', 'Exportar reportes', 'Historial de mesas'].map(p => (
              <span key={p} className="rounded-full px-4 py-1.5 text-xs text-white/30 font-medium border border-white/[0.065] hover:border-white/12 hover:text-white/55 transition-all cursor-default">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-32 px-6 relative overflow-hidden" style={{ background: '#0d0d0d' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 40% at 50% 0%, rgba(255,255,255,0.035) 0%, transparent 70%)' }} />
        <div ref={pricingReveal.ref} className={`relative max-w-6xl mx-auto ${pricingReveal.visible ? 'is-visible' : ''}`}>
          <div className="text-center mb-16 reveal-fadeup">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/22 mb-5">Precios</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.06] mb-4 inline-block" style={gradText}>
              Sin sorpresas.<br />Sin letras chicas.
            </h2>
            <p className="text-white/30 text-sm max-w-xs mx-auto mt-4">
              Onboarding gratuito y soporte por chat en todos los planes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan, i) => (
              <div key={plan.id}
                className={`reveal-fadeup delay-${(i + 1) * 100} rounded-3xl p-7 flex flex-col relative overflow-hidden transition-all duration-300`}
                style={plan.highlight ? {
                  background: '#ffffff',
                  color: '#000',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 24px 60px rgba(0,0,0,0.45)',
                } : {
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.065)',
                }}>
                {plan.highlight && (
                  <div className="absolute top-5 right-5">
                    <span className="text-[9px] font-black tracking-[0.12em] px-3 py-1 rounded-full"
                      style={{ background: '#000', color: '#fff' }}>MÁS POPULAR</span>
                  </div>
                )}

                <div className="mb-7">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.22em] mb-4 ${plan.highlight ? 'text-black/38' : 'text-white/28'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1.5 mb-3">
                    <span className={`text-5xl font-black tracking-tight tabular-nums ${plan.highlight ? 'text-black' : 'text-white'}`}>{plan.price}</span>
                    <span className={`text-sm mb-2 ${plan.highlight ? 'text-black/32' : 'text-white/32'}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-black/52' : 'text-white/38'}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`flex items-center gap-3 text-[13px] ${
                      f.included
                        ? plan.highlight ? 'text-black/78' : 'text-white/68'
                        : plan.highlight ? 'text-black/18' : 'text-white/16'
                    }`}>
                      {f.included
                        ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        : <Minus className="h-3.5 w-3.5 shrink-0 opacity-22" />
                      }
                      {f.text}
                    </li>
                  ))}
                </ul>

                {showEmailFor === plan.id && (
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={planEmail}
                    onChange={e => setPlanEmail(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm mb-3 outline-none border transition-colors"
                    style={plan.highlight
                      ? { background: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.11)', color: '#000' }
                      : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', color: '#fff' }}
                    autoFocus
                  />
                )}

                <button
                  onClick={() => handlePlanClick(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
                  style={plan.highlight
                    ? { background: '#000', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.09)' }}>
                  {loadingPlan === plan.id ? (
                    <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : showEmailFor === plan.id ? (
                    <>Continuar al pago <ChevronRight className="h-4 w-4" /></>
                  ) : (
                    <>Elegir {plan.name} <ChevronRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            ))}
          </div>

          <p className="reveal-fadeup delay-400 text-center text-white/18 text-xs">
            Precios en MXN · IVA no incluido · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-32 overflow-hidden" style={{ background: '#080808' }}>
        <div ref={testimonialsReveal.ref} className={`max-w-6xl mx-auto px-6 mb-16 ${testimonialsReveal.visible ? 'is-visible' : ''}`}>
          <p className="reveal-fadeup text-[10px] font-bold uppercase tracking-[0.22em] text-white/22 mb-5">Testimonios</p>
          <h2 className="reveal-fadeup delay-100 text-4xl md:text-5xl font-black tracking-tight leading-[1.06] inline-block" style={gradText}>
            Lo que dicen<br />nuestros clientes
          </h2>
        </div>

        <div ref={carouselRef} className="flex gap-3 overflow-x-hidden select-none pl-6">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div key={i} className="flex-shrink-0 w-72 rounded-2xl p-6 border transition-colors hover:border-white/10"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.055)' }}>
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-white/50 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div>
                <p className="font-bold text-sm text-white/85">{t.name}</p>
                <p className="text-white/28 text-xs mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BUSINESS BANNER ── */}
      <section className="py-16 px-6" style={{ background: '#0d0d0d' }}>
        <div ref={bannerReveal.ref} className={`max-w-6xl mx-auto ${bannerReveal.visible ? 'is-visible' : ''}`}>
          <div className="reveal-scale rounded-3xl px-9 py-14 md:px-14 flex flex-col md:flex-row items-center gap-10 border relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 75% 50%, rgba(255,255,255,0.025) 0%, transparent 60%)' }} />
            <div className="relative flex-1">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-7 border border-white/[0.09]"
                style={{ background: 'rgba(255,255,255,0.055)' }}>
                <Building2 className="h-5 w-5 text-white/55" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
                ¿Tienes más de un local?
              </h3>
              <p className="text-white/38 text-sm leading-relaxed max-w-md">
                El plan Business incluye gestión multi-sucursal. Un solo panel para todos tus restaurantes.
              </p>
            </div>
            <div className="flex-shrink-0">
              <a href="#pricing"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm transition-all group hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #fff 0%, #d4d4d4 100%)', color: '#000' }}>
                Ver plan Business
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-40 px-6 text-center relative overflow-hidden" style={{ background: '#080808' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 100%, rgba(255,255,255,0.045) 0%, transparent 65%)' }} />
        <div ref={ctaReveal.ref} className={`relative max-w-2xl mx-auto ${ctaReveal.visible ? 'is-visible' : ''}`}>
          <p className="reveal-fadeup text-[10px] font-bold uppercase tracking-[0.25em] text-white/18 mb-10">Empieza hoy</p>
          <h2 className="reveal-fadeup delay-100 text-5xl md:text-6xl font-black leading-[1.02] tracking-[-0.03em] mb-6 inline-block" style={gradText}>
            Tu restaurante merece<br />operar mejor.
          </h2>
          <p className="reveal-fadeup delay-200 text-white/32 text-base mb-14 max-w-sm mx-auto leading-relaxed">
            Herramientas que dignifican el trabajo de quienes mueven el mundo.
          </p>
          <div className="reveal-fadeup delay-300 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#pricing"
              className="inline-flex items-center justify-center gap-2 font-bold px-10 py-4 rounded-full text-sm transition-all group hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #fff 0%, #d4d4d4 100%)', color: '#000' }}>
              Ver planes y precios
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <button onClick={onLogin}
              className="inline-flex items-center justify-center gap-2 font-medium px-10 py-4 rounded-full text-sm text-white/45 hover:text-white border border-white/[0.09] hover:border-white/18 transition-all">
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t px-6 py-16" style={{ background: '#080808', borderColor: 'rgba(255,255,255,0.055)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            <div className="col-span-2">
              <button onClick={onLogin} className="flex items-center gap-2 mb-5 cursor-pointer group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #fff 0%, #d4d4d4 100%)' }}>
                  <span className="font-black text-black text-sm">W</span>
                </div>
                <span className="font-bold text-white/75 group-hover:text-white transition-colors tracking-tight">WAITLESS</span>
              </button>
              <p className="text-white/22 text-sm leading-relaxed max-w-xs">
                Plataforma operativa para restaurantes con servicio en mesa.
              </p>
            </div>

            {[
              { h: 'Producto', l: ['Menú Digital', 'Sistema POS', 'Pantalla Cocina', 'Analítica'] },
              { h: 'Planes', l: ['Básico', 'Pro', 'Business'] },
              { h: 'Legal', l: ['Términos', 'Privacidad'] },
            ].map(col => (
              <div key={col.h}>
                <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.15em] mb-5">{col.h}</p>
                <ul className="space-y-3">
                  {col.l.map(link => (
                    <li key={link}>
                      <a href="#" className="text-white/22 text-sm hover:text-white/55 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderColor: 'rgba(255,255,255,0.045)' }}>
            <p className="text-white/16 text-xs">© 2026 WAITLESS · Plataforma Operativa para Restaurantes</p>
            <button onClick={onLogin} className="text-white/22 text-xs hover:text-white/45 transition-colors flex items-center gap-1 cursor-pointer">
              Iniciar sesión <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </footer>

    </div>
  )
}
