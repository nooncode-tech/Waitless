'use client'

import { useState, useEffect, useRef } from 'react'
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

// ── Component ─────────────────────────────────────────────────────────────────

export function LandingPage({ onLogin }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [planEmail, setPlanEmail] = useState('')
  const [showEmailFor, setShowEmailFor] = useState<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    let frame: number
    let pos = 0
    const tick = () => {
      pos += 0.5
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

  return (
    <div className="bg-[#080808] text-white font-sans overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#080808]/90 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onLogin} className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.15)]"
              style={{ background: 'linear-gradient(135deg, #fff 0%, #d4d4d4 100%)' }}>
              <span className="font-black text-black text-sm leading-none">W</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight group-hover:text-white/80 transition-colors">WAITLESS</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {[['#how', 'Cómo funciona'], ['#features', 'Funciones'], ['#pricing', 'Precios'], ['#testimonials', 'Clientes']].map(([href, label]) => (
              <a key={href} href={href} className="text-white/50 hover:text-white text-sm transition-colors duration-200">{label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={onLogin} className="text-white/50 hover:text-white text-sm transition-colors px-3 py-2">
              Iniciar sesión
            </button>
            <a href="#pricing" className="text-sm font-semibold px-5 py-2 rounded-full transition-all"
              style={{ background: 'linear-gradient(135deg, #fff 0%, #e5e5e5 100%)', color: '#000' }}>
              Ver planes
            </a>
          </div>

          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#0d0d0d] border-t border-white/[0.06] px-6 py-5 space-y-1">
            {[['#how', 'Cómo funciona'], ['#features', 'Funciones'], ['#pricing', 'Precios'], ['#testimonials', 'Clientes']].map(([href, label]) => (
              <a key={href} href={href} className="block text-white/60 text-sm py-2.5 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="pt-3 space-y-2 border-t border-white/[0.06] mt-2">
              <button onClick={() => { setMenuOpen(false); onLogin() }} className="block w-full text-left text-white/60 text-sm py-2">Iniciar sesión</button>
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
      <section className="relative min-h-screen flex flex-col px-6 pt-16 overflow-hidden"
        style={{ background: '#080808' }}>
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-6xl mx-auto w-full flex-1 flex flex-col lg:flex-row items-center gap-12 py-16 md:py-20">
          {/* Left: copy */}
          <div className="flex-1 min-w-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-white/60 text-xs font-medium tracking-wide">Plataforma operativa para restaurantes</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.0] tracking-[-0.03em] mb-6">
              <span style={{
                background: 'linear-gradient(180deg, #ffffff 30%, rgba(255,255,255,0.4) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Operación perfecta.{' '}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>Sin fricciones.</span>
            </h1>

            <p className="text-white/45 text-lg leading-relaxed mb-10 max-w-md">
              De la mesa al cobro en segundos. Gestiona pedidos, cocina y analítica desde un solo panel.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <a href="#pricing"
                className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-full text-sm transition-all group"
                style={{ background: 'linear-gradient(135deg, #ffffff 0%, #d4d4d4 100%)', color: '#000' }}>
                Comenzar gratis
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href="#how"
                className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-full text-sm text-white/60 hover:text-white transition-all border border-white/10 hover:border-white/20">
                Ver cómo funciona
              </a>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3 max-w-xs">
              {[
                { v: '2x', l: 'Pagos más rápidos' },
                { v: '+40%', l: 'Más ventas' },
                { v: '35%', l: 'Mejores decisiones' },
              ].map(k => (
                <div key={k.l} className="rounded-2xl p-4 border hover:border-white/15 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <p className="text-xl font-black text-white">{k.v}</p>
                  <p className="text-white/35 text-[10px] mt-1 leading-tight">{k.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: App mock */}
          <div className="flex-shrink-0 w-full lg:w-[480px] relative hidden lg:block">
            <div className="rounded-2xl border overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              style={{ background: '#111', borderColor: 'rgba(255,255,255,0.08)' }}>
              {/* Window bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0d0d0d' }}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <div className="flex-1 mx-3 rounded px-3 py-1 text-center text-[10px] text-white/20" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  waitless.app/mesas
                </div>
              </div>
              {/* App content */}
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-bold text-sm">Mesas</p>
                    <p className="text-white/30 text-[10px]">12 mesas activas</p>
                  </div>
                  <div className="flex gap-2">
                    {['Libre', 'Ocupada', 'Lista'].map((s, i) => (
                      <span key={s} className="text-[9px] px-2 py-1 rounded-full font-medium"
                        style={{
                          background: i === 0 ? 'rgba(255,255,255,0.06)' : i === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(16,185,129,0.15)',
                          color: i === 0 ? 'rgba(255,255,255,0.4)' : i === 1 ? 'rgba(255,255,255,0.7)' : '#34d399',
                        }}>{s}</span>
                    ))}
                  </div>
                </div>
                {/* Table grid */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { n: 1, s: 'libre' },
                    { n: 2, s: 'ocupada' },
                    { n: 3, s: 'cocina' },
                    { n: 4, s: 'lista' },
                    { n: 5, s: 'ocupada' },
                    { n: 6, s: 'libre' },
                    { n: 7, s: 'lista' },
                    { n: 8, s: 'ocupada' },
                  ].map(t => (
                    <div key={t.n} className="rounded-xl p-3 border flex flex-col items-center gap-1.5"
                      style={{
                        background: t.s === 'lista' ? 'rgba(16,185,129,0.08)' : t.s === 'cocina' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                        borderColor: t.s === 'lista' ? 'rgba(16,185,129,0.2)' : t.s === 'cocina' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)',
                      }}>
                      <p className="text-white font-black text-base leading-none">{t.n}</p>
                      <div className="w-1.5 h-1.5 rounded-full"
                        style={{ background: t.s === 'libre' ? 'rgba(255,255,255,0.2)' : t.s === 'ocupada' ? 'rgba(255,255,255,0.6)' : t.s === 'cocina' ? '#fbbf24' : '#34d399' }} />
                    </div>
                  ))}
                </div>
                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: 'Libres', v: '4', c: 'rgba(255,255,255,0.4)' },
                    { l: 'En servicio', v: '6', c: 'rgba(255,255,255,0.7)' },
                    { l: 'Listas', v: '2', c: '#34d399' },
                  ].map(s => (
                    <div key={s.l} className="rounded-xl p-3 text-center border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <p className="text-base font-black" style={{ color: s.c }}>{s.v}</p>
                      <p className="text-[9px] text-white/30 mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Floating notification */}
            <div className="absolute -bottom-4 -left-6 rounded-2xl p-3 border shadow-xl flex items-center gap-3"
              style={{ background: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)', minWidth: '180px' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Bell className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white text-[11px] font-semibold leading-tight">Mesa 3 lista</p>
                <p className="text-white/35 text-[10px]">Pedido #47 completado</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <div className="border-y border-white/[0.06] py-5 px-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-2">
          {['Tacos El Rey', 'Bistró 33', 'Café Lumbre', 'La Leña', 'El Patio', 'Fusión MX'].map(name => (
            <span key={name} className="text-white/25 text-xs font-medium tracking-wide">{name}</span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-28 px-6" style={{ background: '#0d0d0d' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-4">Cómo funciona</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.08] max-w-lg"
              style={{ background: 'linear-gradient(180deg,#fff 40%,rgba(255,255,255,0.45) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Listo en 30 minutos.<br />Operando para siempre.
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="relative rounded-2xl p-6 border transition-all hover:border-white/10 group"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                {/* Connector line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-10 -right-2 w-4 h-px bg-white/10 z-10" />
                )}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-5 border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-white/60 group-hover:text-white/90 transition-colors">{s.icon}</div>
                </div>
                <p className="text-[10px] font-black text-white/20 tracking-[0.2em] mb-2">{s.step}</p>
                <h3 className="text-sm font-bold text-white mb-2 leading-snug">{s.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 px-6" style={{ background: '#080808' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-4">Funciones</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.08] inline-block"
              style={{ background: 'linear-gradient(180deg,#fff 40%,rgba(255,255,255,0.4) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Todo en un solo panel
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid md:grid-cols-3 gap-3">
            {/* Large feature */}
            <div className="md:col-span-2 rounded-3xl p-8 md:p-10 flex flex-col justify-between min-h-72 border border-white/[0.08] relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <LayoutGrid className="h-5 w-5 text-white/70" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Gestión de mesas en tiempo real</h3>
                <p className="text-white/45 text-sm leading-relaxed max-w-sm">
                  Vista completa del salón. Libre, ocupada, en cocina, lista para cobrar. Todo en un vistazo.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  { l: 'Libre', c: 'rgba(255,255,255,0.08)', t: 'rgba(255,255,255,0.4)' },
                  { l: 'Ocupada', c: 'rgba(255,255,255,0.12)', t: 'rgba(255,255,255,0.75)' },
                  { l: 'En cocina', c: 'rgba(245,158,11,0.15)', t: '#fbbf24' },
                  { l: 'Lista', c: 'rgba(16,185,129,0.15)', t: '#34d399' },
                ].map(s => (
                  <span key={s.l} className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: s.c, color: s.t }}>{s.l}</span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl p-8 flex flex-col border border-white/[0.06] group hover:border-white/10 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <ChefHat className="h-5 w-5 text-white/70 group-hover:text-white/90 transition-colors" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Pantalla de cocina digital</h3>
              <p className="text-white/45 text-sm leading-relaxed">Sin papel. Sin gritos. Los pedidos llegan solos en tiempo real.</p>
            </div>

            <div className="rounded-3xl p-8 border border-white/[0.06] group hover:border-white/10 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <BarChart2 className="h-5 w-5 text-white/70 group-hover:text-white/90 transition-colors" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Analítica en tiempo real</h3>
              <p className="text-white/45 text-sm leading-relaxed">Ventas, propinas, ticket promedio y ranking de productos al instante.</p>
            </div>

            <div className="rounded-3xl p-8 border border-white/[0.06] group hover:border-white/10 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                <CreditCard className="h-5 w-5 text-white/70 group-hover:text-white/90 transition-colors" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Cobro en mesa</h3>
              <p className="text-white/45 text-sm leading-relaxed">Efectivo, tarjeta, transferencia o Apple Pay. División de cuenta incluida.</p>
            </div>

            <div className="rounded-3xl p-8 border border-white/[0.08] group relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <Bell className="h-5 w-5 text-white/70" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Notificaciones al instante</h3>
              <p className="text-white/45 text-sm leading-relaxed">El mesero sabe cuando el pedido está listo. Sin llamadas, sin confusión.</p>
            </div>
          </div>

          {/* Pills */}
          <div className="mt-10 flex flex-wrap gap-2 justify-center">
            {['Menú QR', 'Lista de espera', 'Inventario', 'Multi-sucursal', 'Lealtad', 'Reembolsos', 'Exportar reportes', 'Historial de mesas'].map(p => (
              <span key={p} className="rounded-full px-4 py-1.5 text-xs text-white/35 font-medium border border-white/[0.07] hover:border-white/15 hover:text-white/60 transition-all cursor-default">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-28 px-6 relative overflow-hidden" style={{ background: '#0d0d0d' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-4">Precios</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.08] mb-4 inline-block"
              style={{ background: 'linear-gradient(180deg,#fff 40%,rgba(255,255,255,0.4) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Sin sorpresas.<br />Sin letras chicas.
            </h2>
            <p className="text-white/35 text-sm max-w-xs mx-auto mt-3">
              Onboarding gratuito y soporte por chat en todos los planes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-5">
            {PLANS.map((plan) => (
              <div key={plan.id} className="rounded-3xl p-7 flex flex-col relative overflow-hidden transition-all duration-300"
                style={plan.highlight ? {
                  background: '#ffffff',
                  color: '#000',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.15), 0 20px 60px rgba(0,0,0,0.5)',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                {plan.highlight && (
                  <div className="absolute top-5 right-5">
                    <span className="text-[9px] font-black tracking-[0.15em] px-3 py-1 rounded-full"
                      style={{ background: '#000', color: '#fff', letterSpacing: '0.1em' }}>MÁS POPULAR</span>
                  </div>
                )}

                <div className="mb-7">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${plan.highlight ? 'text-black/40' : 'text-white/30'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-3">
                    <span className={`text-5xl font-black tracking-tight ${plan.highlight ? 'text-black' : 'text-white'}`}>{plan.price}</span>
                    <span className={`text-sm mb-2 ${plan.highlight ? 'text-black/35' : 'text-white/35'}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-black/55' : 'text-white/40'}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`flex items-center gap-3 text-[13px] ${
                      f.included
                        ? plan.highlight ? 'text-black/80' : 'text-white/70'
                        : plan.highlight ? 'text-black/20' : 'text-white/18'
                    }`}>
                      {f.included
                        ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        : <Minus className="h-3.5 w-3.5 shrink-0 opacity-25" />
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
                      ? { background: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.12)', color: '#000' }
                      : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    autoFocus
                  />
                )}

                <button
                  onClick={() => handlePlanClick(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  style={plan.highlight
                    ? { background: '#000', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
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

          <p className="text-center text-white/20 text-xs">
            Precios en MXN · IVA no incluido · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-28 overflow-hidden" style={{ background: '#080808' }}>
        <div className="max-w-6xl mx-auto px-6 mb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-4">Testimonios</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.08] inline-block"
            style={{ background: 'linear-gradient(180deg,#fff 40%,rgba(255,255,255,0.4) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            Lo que dicen<br />nuestros clientes
          </h2>
        </div>

        <div ref={carouselRef} className="flex gap-3 overflow-x-hidden select-none pl-6">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div key={i} className="flex-shrink-0 w-72 rounded-2xl p-6 border transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-white/55 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div>
                <p className="font-bold text-sm text-white/90">{t.name}</p>
                <p className="text-white/30 text-xs mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BUSINESS BANNER ── */}
      <section className="py-16 px-6" style={{ background: '#0d0d0d' }}>
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl px-8 py-12 md:px-14 md:py-14 flex flex-col md:flex-row items-center gap-10 border relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.03) 0%, transparent 60%)' }} />
            <div className="relative flex-1">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-6 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <Building2 className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
                ¿Tienes más de un local?
              </h3>
              <p className="text-white/40 text-sm leading-relaxed max-w-md">
                El plan Business incluye gestión multi-sucursal. Un solo panel para todos tus restaurantes.
              </p>
            </div>
            <div className="flex-shrink-0 relative">
              <a href="#pricing"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm transition-all group"
                style={{ background: 'linear-gradient(135deg,#fff 0%,#d4d4d4 100%)', color: '#000' }}>
                Ver plan Business
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-36 px-6 text-center relative overflow-hidden" style={{ background: '#080808' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,255,255,0.05) 0%, transparent 70%)' }} />
        <div className="relative max-w-2xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-8">Empieza hoy</p>
          <h2 className="text-5xl md:text-6xl font-black leading-[1.02] tracking-[-0.03em] mb-6 inline-block"
            style={{ background: 'linear-gradient(180deg,#fff 30%,rgba(255,255,255,0.35) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            Tu restaurante merece operar mejor.
          </h2>
          <p className="text-white/35 text-base mb-12 max-w-sm mx-auto leading-relaxed">
            Herramientas que dignifican el trabajo de quienes mueven el mundo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#pricing"
              className="inline-flex items-center justify-center gap-2 font-bold px-10 py-4 rounded-full text-sm transition-all group"
              style={{ background: 'linear-gradient(135deg,#fff 0%,#d4d4d4 100%)', color: '#000' }}>
              Ver planes y precios
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <button onClick={onLogin}
              className="inline-flex items-center justify-center gap-2 font-medium px-10 py-4 rounded-full text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all">
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t px-6 py-16" style={{ background: '#080808', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            <div className="col-span-2">
              <button onClick={onLogin} className="flex items-center gap-2 mb-5 cursor-pointer group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#fff 0%,#d4d4d4 100%)' }}>
                  <span className="font-black text-black text-sm">W</span>
                </div>
                <span className="font-bold text-white/80 group-hover:text-white transition-colors tracking-tight">WAITLESS</span>
              </button>
              <p className="text-white/25 text-sm leading-relaxed max-w-xs">
                Plataforma operativa para restaurantes con servicio en mesa.
              </p>
            </div>

            {[
              { h: 'Producto', l: ['Menú Digital', 'Sistema POS', 'Pantalla Cocina', 'Analítica'] },
              { h: 'Planes', l: ['Básico', 'Pro', 'Business'] },
              { h: 'Legal', l: ['Términos', 'Privacidad'] },
            ].map(col => (
              <div key={col.h}>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-5">{col.h}</p>
                <ul className="space-y-3">
                  {col.l.map(link => (
                    <li key={link}>
                      <a href="#" className="text-white/25 text-sm hover:text-white/60 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <p className="text-white/18 text-xs">© 2026 WAITLESS · Plataforma Operativa para Restaurantes</p>
            <button onClick={onLogin} className="text-white/25 text-xs hover:text-white/50 transition-colors flex items-center gap-1 cursor-pointer">
              Iniciar sesión <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </footer>

    </div>
  )
}
