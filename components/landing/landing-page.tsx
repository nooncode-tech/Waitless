'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ChevronRight, Star, ArrowRight, Zap,
  Menu, X, Check, LayoutGrid, ChefHat, BarChart2,
  CreditCard, Bell, Building2, Minus, Shield,
  Clock, TrendingUp, Smartphone,
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
    id: 'basico', name: 'Básico', price: '$299', period: '/mes',
    description: 'Para restaurantes que empiezan a digitalizar su operación.',
    highlight: false, badge: null,
    features: [
      { text: 'Hasta 5 mesas', ok: true },
      { text: 'Menú digital QR', ok: true },
      { text: 'Pedidos en mesa', ok: true },
      { text: 'Pantalla de cocina', ok: true },
      { text: 'Reportes básicos', ok: true },
      { text: 'Analítica avanzada', ok: false },
      { text: 'Control de inventario', ok: false },
      { text: 'Multi-sucursal', ok: false },
      { text: 'Soporte prioritario', ok: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: '$599', period: '/mes',
    description: 'Para restaurantes con mayor volumen que necesitan control total.',
    highlight: true, badge: 'Más popular',
    features: [
      { text: 'Hasta 15 mesas', ok: true },
      { text: 'Menú digital QR', ok: true },
      { text: 'Pedidos en mesa', ok: true },
      { text: 'Pantalla de cocina', ok: true },
      { text: 'Reportes básicos', ok: true },
      { text: 'Analítica avanzada', ok: true },
      { text: 'Control de inventario', ok: true },
      { text: 'Multi-sucursal', ok: false },
      { text: 'Soporte prioritario', ok: true },
    ],
  },
  {
    id: 'business', name: 'Business', price: '$999', period: '/mes',
    description: 'Para cadenas y grupos con múltiples puntos de venta.',
    highlight: false, badge: null,
    features: [
      { text: 'Mesas ilimitadas', ok: true },
      { text: 'Menú digital QR', ok: true },
      { text: 'Pedidos en mesa', ok: true },
      { text: 'Pantalla de cocina', ok: true },
      { text: 'Reportes básicos', ok: true },
      { text: 'Analítica avanzada', ok: true },
      { text: 'Control de inventario', ok: true },
      { text: 'Multi-sucursal', ok: true },
      { text: 'Soporte prioritario', ok: true },
    ],
  },
]

const STEPS = [
  { n: '01', icon: <Shield className="h-6 w-6" />, title: 'Configura tu restaurante', body: 'Agrega tus mesas, carga el menú y personaliza tu marca. Listo en menos de 30 minutos.' },
  { n: '02', icon: <Smartphone className="h-6 w-6" />, title: 'Tus clientes escanean el QR', body: 'Cada mesa tiene su código único. El cliente ve el menú, hace su pedido y paga — sin app.' },
  { n: '03', icon: <ChefHat className="h-6 w-6" />, title: 'Cocina recibe en pantalla', body: 'Los pedidos llegan instantáneamente. Sin gritos, sin papel, sin errores de transcripción.' },
  { n: '04', icon: <BarChart2 className="h-6 w-6" />, title: 'Cierra el día con claridad', body: 'Dashboard con ventas, propinas, productos top y reporte listo para exportar.' },
]

const FEATURES = [
  { icon: <LayoutGrid className="h-6 w-6" />, title: 'Mesas en tiempo real', body: 'Vista completa del salón. Libre, ocupada, en cocina, lista para cobrar. Todo en un vistazo.' },
  { icon: <ChefHat className="h-6 w-6" />, title: 'Pantalla de cocina', body: 'Sin papel, sin gritos. Los pedidos llegan en tiempo real directo al equipo de cocina.' },
  { icon: <BarChart2 className="h-6 w-6" />, title: 'Analítica en tiempo real', body: 'Ventas, propinas, ticket promedio y ranking de productos. Todo al instante.' },
  { icon: <CreditCard className="h-6 w-6" />, title: 'Cobro en mesa', body: 'Efectivo, tarjeta, transferencia o Apple Pay. División de cuenta incluida sin fricción.' },
  { icon: <Bell className="h-6 w-6" />, title: 'Notificaciones al instante', body: 'El mesero sabe exactamente cuándo el pedido está listo. Sin llamadas, sin confusión.' },
  { icon: <Building2 className="h-6 w-6" />, title: 'Multi-sucursal', body: 'Un solo panel para todos tus restaurantes. Compara rendimiento entre locales en tiempo real.' },
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
    let t0: number
    const step = (ts: number) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return val
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LandingPage({ onLogin }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [planEmail, setPlanEmail] = useState('')
  const [showEmailFor, setShowEmailFor] = useState<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const heroReveal = useReveal(0.05)
  const stepsReveal = useReveal(0.1)
  const featReveal = useReveal(0.1)
  const pricingReveal = useReveal(0.1)
  const testReveal = useReveal(0.1)
  const ctaReveal = useReveal(0.1)

  const c1 = useCounter(2, 900, heroReveal.visible)
  const c2 = useCounter(40, 1100, heroReveal.visible)
  const c3 = useCounter(30, 1000, heroReveal.visible)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    let raf: number, pos = 0
    const tick = () => { pos += 0.4; if (pos >= el.scrollWidth / 2) pos = 0; el.scrollLeft = pos; raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    const pause = () => cancelAnimationFrame(raf)
    const resume = () => { raf = requestAnimationFrame(tick) }
    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', resume)
    return () => { cancelAnimationFrame(raf); el.removeEventListener('mouseenter', pause); el.removeEventListener('mouseleave', resume) }
  }, [])

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  const handlePlanClick = async (planId: string) => {
    if (!showEmailFor || showEmailFor !== planId) { setShowEmailFor(planId); setPlanEmail(''); return }
    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, email: planEmail.trim() || undefined }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error ?? 'Error al procesar el pago')
    } catch { alert('Error de conexión') }
    finally { setLoadingPlan(null) }
  }

  return (
    <div className="text-[#111] overflow-x-hidden" style={{ fontFamily: "'Inter', 'Poppins', system-ui, sans-serif" }}>

      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleUp  { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
        .rv { opacity:0 }
        .show .rv  { animation: fadeUp  0.6s cubic-bezier(0.22,1,0.36,1) forwards }
        .show .rvi { animation: fadeIn  0.55s ease forwards }
        .show .rvs { animation: scaleUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards }
        .d1 { animation-delay:.08s!important } .d2 { animation-delay:.16s!important }
        .d3 { animation-delay:.24s!important } .d4 { animation-delay:.32s!important }
        .d5 { animation-delay:.40s!important } .d6 { animation-delay:.48s!important }
        @media (prefers-reduced-motion:reduce){ .rv,.rvi,.rvs{opacity:1!important;animation:none!important} }
      `}</style>

      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-400 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-lg shadow-[0_1px_0_0_#e5e7eb]'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={onLogin} className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#18181b,#3f3f46)' }}>
              <span className="font-black text-white text-sm leading-none">W</span>
            </div>
            <span className="font-bold text-[#111] text-base tracking-tight group-hover:text-zinc-500 transition-colors">WAITLESS</span>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {[['how','Cómo funciona'],['features','Funciones'],['pricing','Precios'],['testimonials','Clientes']].map(([id,l]) => (
              <button key={id} onClick={() => goTo(id)} className="text-zinc-500 hover:text-[#111] text-sm font-medium transition-colors cursor-pointer">{l}</button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={onLogin} className="text-zinc-500 hover:text-[#111] text-sm font-medium transition-colors px-3 py-2 cursor-pointer">
              Iniciar sesión
            </button>
            <button onClick={() => goTo('pricing')}
              className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#18181b,#3f3f46)' }}>
              Ver planes
            </button>
          </div>

          <button className="md:hidden text-zinc-600 hover:text-[#111] p-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-zinc-100 px-6 py-5 space-y-1 shadow-lg">
            {[['how','Cómo funciona'],['features','Funciones'],['pricing','Precios'],['testimonials','Clientes']].map(([id,l]) => (
              <button key={id} onClick={() => goTo(id)} className="block w-full text-left text-zinc-600 text-sm py-2.5 font-medium hover:text-[#111] transition-colors cursor-pointer">{l}</button>
            ))}
            <div className="pt-3 space-y-2 border-t border-zinc-100 mt-2">
              <button onClick={() => { setMenuOpen(false); onLogin() }} className="block w-full text-left text-zinc-500 text-sm py-2 cursor-pointer">Iniciar sesión</button>
              <button onClick={() => goTo('pricing')}
                className="block w-full text-center text-sm font-semibold px-5 py-3 rounded-full text-white cursor-pointer"
                style={{ background: 'linear-gradient(135deg,#18181b,#3f3f46)' }}>
                Ver planes
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── dark ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 pt-16 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f0f0f 0%, #18181b 100%)' }}>

        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ opacity:.03, backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize:'72px 72px' }} />
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none rounded-full"
          style={{ background:'radial-gradient(ellipse,rgba(255,255,255,0.06) 0%,transparent 70%)', filter:'blur(40px)' }} />

        <div ref={heroReveal.ref} className={`relative max-w-6xl mx-auto w-full py-20 md:py-24 flex flex-col lg:flex-row items-center gap-16 ${heroReveal.visible ? 'show' : ''}`}>

          {/* Copy */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <div className="rv inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border border-white/10 bg-white/5">
              <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-white/60 text-xs font-semibold tracking-wide">Plataforma operativa para restaurantes</span>
            </div>

            <h1 className="rv d1 text-5xl md:text-6xl lg:text-[3.8rem] xl:text-[4.5rem] font-black leading-[1.04] tracking-[-0.03em] mb-6 text-white">
              Operación perfecta.{' '}
              <span className="text-white/25">Sin fricciones.</span>
            </h1>

            <p className="rv d2 text-white/50 text-lg leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
              De la mesa al cobro en segundos. Gestiona pedidos, cocina y analítica — todo desde un solo panel.
            </p>

            <div className="rv d3 flex flex-col sm:flex-row gap-3 mb-14 justify-center lg:justify-start">
              <button onClick={() => goTo('pricing')}
                className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-full text-sm text-[#111] bg-white hover:bg-zinc-100 transition-all group active:scale-[0.98] cursor-pointer">
                Comenzar gratis
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button onClick={() => goTo('how')}
                className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-full text-sm text-white/60 hover:text-white border border-white/15 hover:border-white/30 transition-all cursor-pointer">
                Ver cómo funciona
              </button>
            </div>

            {/* KPI row */}
            <div className="rv d4 flex gap-8 justify-center lg:justify-start">
              {[
                { v: `${c1}x`,   sub: 'pagos más rápidos' },
                { v: `+${c2}%`,  sub: 'más ventas' },
                { v: `${c3}%`,   sub: 'menos errores' },
              ].map(k => (
                <div key={k.sub} className="text-center lg:text-left">
                  <p className="text-3xl font-black text-white tabular-nums leading-none">{k.v}</p>
                  <p className="text-white/38 text-xs mt-1.5 leading-tight">{k.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* App mock */}
          <div className="rvs d2 flex-shrink-0 w-full lg:w-[440px] hidden lg:block relative">
            <div className="absolute -inset-6 rounded-3xl pointer-events-none"
              style={{ background:'radial-gradient(ellipse,rgba(255,255,255,0.05) 0%,transparent 70%)' }} />

            <div className="relative rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] border border-white/[0.08]"
              style={{ background:'#161618' }}>
              {/* Chrome bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06]" style={{ background:'#111113' }}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                <div className="flex-1 mx-3 rounded-md py-1 text-center text-[10px] text-white/20 bg-white/[0.04]">
                  waitless.app/admin
                </div>
              </div>
              {/* Content */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-white font-bold text-sm">Panel de mesas</p>
                    <p className="text-white/30 text-[10px] mt-0.5">Lunes 14 de abr · 13:42</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[['Libre','rgba(255,255,255,0.05)','rgba(255,255,255,0.35)'],
                      ['Ocupada','rgba(255,255,255,0.09)','rgba(255,255,255,0.65)'],
                      ['Lista','rgba(16,185,129,0.13)','#34d399']].map(([s,bg,col]) => (
                      <span key={s} className="text-[9px] px-2 py-1 rounded-full font-semibold" style={{ background:bg, color:col }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[{n:1,s:'libre'},{n:2,s:'ocupada'},{n:3,s:'cocina'},{n:4,s:'lista'},
                    {n:5,s:'ocupada'},{n:6,s:'libre'},{n:7,s:'lista'},{n:8,s:'ocupada'}].map(t => (
                    <div key={t.n} className="rounded-xl p-3 border flex flex-col items-center gap-1.5"
                      style={{
                        background: t.s==='lista' ? 'rgba(16,185,129,0.08)' : t.s==='cocina' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.025)',
                        borderColor: t.s==='lista' ? 'rgba(16,185,129,0.2)' : t.s==='cocina' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)',
                      }}>
                      <p className="text-white font-black text-sm leading-none">{t.n}</p>
                      <div className="w-1.5 h-1.5 rounded-full" style={{
                        background: t.s==='libre' ? 'rgba(255,255,255,0.2)' : t.s==='ocupada' ? 'rgba(255,255,255,0.55)' : t.s==='cocina' ? '#fbbf24' : '#34d399'
                      }} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Libres','4','rgba(255,255,255,0.38)'],['En servicio','6','rgba(255,255,255,0.65)'],['Listas','2','#34d399']].map(([l,v,c]) => (
                    <div key={l} className="rounded-xl p-3 text-center border border-white/[0.06] bg-white/[0.025]">
                      <p className="text-base font-black tabular-nums" style={{ color:c }}>{v}</p>
                      <p className="text-[9px] text-white/28 mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -bottom-5 -left-8 rounded-2xl p-3.5 border border-white/[0.1] shadow-2xl flex items-center gap-3"
              style={{ background:'#1e1e20', minWidth:'180px' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15">
                <Bell className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white text-[11px] font-semibold">Mesa 3 lista</p>
                <p className="text-white/32 text-[10px]">Pedido #47 completado</p>
              </div>
            </div>

            <div className="absolute -top-4 -right-6 rounded-2xl px-4 py-3 border border-white/[0.1] shadow-2xl"
              style={{ background:'#1e1e20' }}>
              <p className="text-white/35 text-[10px] mb-0.5">Ticket promedio</p>
              <p className="text-white font-black text-lg leading-none">$487</p>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14" preserveAspectRatio="none">
            <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="#f9fafb" />
          </svg>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── light ───────────────────────────── */}
      <div className="bg-[#f9fafb] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-3">
          <span className="text-zinc-400 text-[11px] font-semibold uppercase tracking-[0.18em]">Confían en Waitless</span>
          {['Tacos El Rey','Bistró 33','Café Lumbre','La Leña','El Patio','Fusión MX'].map(n => (
            <span key={n} className="text-zinc-400 text-sm font-medium">{n}</span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── light ────────────────────────────── */}
      <section id="how" className="bg-white py-28 px-6">
        <div ref={stepsReveal.ref} className={`max-w-6xl mx-auto ${stepsReveal.visible ? 'show' : ''}`}>
          {/* Header */}
          <div className="text-center mb-16">
            <span className="rv inline-block text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400 mb-4">Cómo funciona</span>
            <h2 className="rv d1 text-4xl md:text-5xl font-black tracking-tight leading-[1.06] text-[#111]">
              Listo en 30 minutos.
            </h2>
            <p className="rv d2 text-zinc-500 text-lg mt-3 max-w-md mx-auto leading-relaxed">
              Sin técnicos, sin contratos largos, sin complicaciones.
            </p>
          </div>

          {/* Steps grid */}
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n}
                className={`rv d${i + 1} group text-center flex flex-col items-center`}>
                {/* Number + icon */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#f4f4f5] group-hover:bg-[#18181b] transition-colors duration-300">
                    <div className="text-zinc-500 group-hover:text-white transition-colors duration-300">{s.icon}</div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#18181b] flex items-center justify-center">
                    <span className="text-white text-[9px] font-black">{s.n}</span>
                  </div>
                </div>
                <h3 className="font-bold text-[#111] text-base mb-2 leading-snug">{s.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── dark ─────────────────────────────────── */}
      <section id="features" className="py-28 px-6 relative overflow-hidden"
        style={{ background:'linear-gradient(160deg,#0f0f0f,#1a1a1e)' }}>

        <div className="absolute top-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14 rotate-180" preserveAspectRatio="none">
            <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="white" />
          </svg>
        </div>

        <div ref={featReveal.ref} className={`max-w-6xl mx-auto ${featReveal.visible ? 'show' : ''}`}>
          <div className="text-center mb-16 pt-6">
            <span className="rv inline-block text-[11px] font-bold uppercase tracking-[0.22em] text-white/35 mb-4">Funciones</span>
            <h2 className="rv d1 text-4xl md:text-5xl font-black tracking-tight leading-[1.06] text-white">
              Todo lo que necesitas.
            </h2>
            <p className="rv d2 text-white/45 text-lg mt-3 max-w-md mx-auto leading-relaxed">
              Una sola plataforma reemplaza tres sistemas distintos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className={`rv d${i + 1} group rounded-3xl p-8 border border-white/[0.07] hover:border-white/[0.12] transition-all duration-300 cursor-default`}
                style={{ background:'rgba(255,255,255,0.03)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-white/[0.06] border border-white/[0.08] group-hover:bg-white/[0.09] transition-colors">
                  <div className="text-white/60 group-hover:text-white/85 transition-colors">{f.icon}</div>
                </div>
                <h3 className="font-bold text-white text-lg mb-2.5 leading-snug">{f.title}</h3>
                <p className="text-white/42 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>

          {/* Extra pills */}
          <div className="rv d4 mt-10 flex flex-wrap gap-2 justify-center">
            {['Menú QR','Lista de espera','Inventario','Lealtad','Reembolsos','Exportar reportes','Historial de mesas'].map(p => (
              <span key={p} className="rounded-full px-4 py-2 text-xs font-medium text-white/32 border border-white/[0.07] hover:border-white/[0.12] hover:text-white/55 transition-all cursor-default">
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14" preserveAspectRatio="none">
            <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="#f9fafb" />
          </svg>
        </div>
      </section>

      {/* ── PRICING ── light ─────────────────────────────────── */}
      <section id="pricing" className="bg-[#f9fafb] py-28 px-6">
        <div ref={pricingReveal.ref} className={`max-w-6xl mx-auto ${pricingReveal.visible ? 'show' : ''}`}>
          <div className="text-center mb-16">
            <span className="rv inline-block text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400 mb-4">Precios</span>
            <h2 className="rv d1 text-4xl md:text-5xl font-black tracking-tight leading-[1.06] text-[#111]">
              Sin sorpresas.
            </h2>
            <p className="rv d2 text-zinc-500 text-lg mt-3 max-w-sm mx-auto">
              Onboarding gratuito y soporte por chat en todos los planes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => (
              <div key={plan.id}
                className={`rv d${i + 1} relative rounded-3xl flex flex-col overflow-hidden transition-all duration-300`}
                style={plan.highlight ? {
                  background:'#18181b',
                  boxShadow:'0 24px 60px rgba(0,0,0,0.18), 0 0 0 2px #18181b',
                } : {
                  background:'#fff',
                  border:'1px solid #e4e4e7',
                  boxShadow:'0 2px 12px rgba(0,0,0,0.04)',
                }}>

                {plan.badge && (
                  <div className="text-center py-2.5 text-xs font-bold text-white tracking-wide bg-emerald-500">
                    {plan.badge}
                  </div>
                )}

                <div className="p-7 flex flex-col flex-1">
                  <div className="mb-7">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-4 ${plan.highlight ? 'text-white/40' : 'text-zinc-400'}`}>
                      {plan.name}
                    </p>
                    <div className="flex items-end gap-1.5 mb-3">
                      <span className={`text-5xl font-black tracking-tight tabular-nums ${plan.highlight ? 'text-white' : 'text-[#111]'}`}>
                        {plan.price}
                      </span>
                      <span className={`text-sm mb-2 ${plan.highlight ? 'text-white/35' : 'text-zinc-400'}`}>{plan.period}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-white/50' : 'text-zinc-500'}`}>
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f.text} className={`flex items-center gap-3 text-sm ${
                        f.ok
                          ? plan.highlight ? 'text-white/80' : 'text-zinc-700'
                          : plan.highlight ? 'text-white/20' : 'text-zinc-300'
                      }`}>
                        {f.ok
                          ? <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          : <div className="w-4 h-4 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                              <Minus className="h-2.5 w-2.5 text-zinc-400" />
                            </div>
                        }
                        {f.text}
                      </li>
                    ))}
                  </ul>

                  {showEmailFor === plan.id && (
                    <input
                      type="email" placeholder="tu@email.com" value={planEmail}
                      onChange={e => setPlanEmail(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm mb-3 outline-none border transition-colors"
                      style={plan.highlight
                        ? { background:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.15)', color:'#fff' }
                        : { background:'#f4f4f5', borderColor:'#e4e4e7', color:'#111' }}
                      autoFocus />
                  )}

                  <button
                    onClick={() => handlePlanClick(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] hover:opacity-90"
                    style={plan.highlight
                      ? { background:'#fff', color:'#18181b' }
                      : { background:'#18181b', color:'#fff' }}>
                    {loadingPlan === plan.id
                      ? <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      : showEmailFor === plan.id
                        ? <>Continuar al pago <ChevronRight className="h-4 w-4" /></>
                        : <>Elegir {plan.name} <ChevronRight className="h-4 w-4" /></>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="rv d4 text-center text-zinc-400 text-xs mt-6">
            Precios en MXN · IVA no incluido · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── white ────────────────────────────── */}
      <section id="testimonials" className="bg-white py-28 overflow-hidden">
        <div ref={testReveal.ref} className={`max-w-6xl mx-auto px-6 mb-14 ${testReveal.visible ? 'show' : ''}`}>
          <div className="text-center">
            <span className="rv inline-block text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400 mb-4">Testimonios</span>
            <h2 className="rv d1 text-4xl md:text-5xl font-black tracking-tight leading-[1.06] text-[#111]">
              Lo que dicen nuestros clientes
            </h2>
          </div>
        </div>

        <div ref={carouselRef} className="flex gap-4 overflow-x-hidden select-none pl-6">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div key={i} className="flex-shrink-0 w-72 rounded-2xl p-6 border border-zinc-100 bg-[#f9fafb] hover:border-zinc-200 transition-colors">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div>
                <p className="font-bold text-sm text-[#111]">{t.name}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── dark ──────────────────────────────────────── */}
      <section className="relative py-36 px-6 text-center overflow-hidden"
        style={{ background:'linear-gradient(160deg,#0f0f0f,#1a1a1e)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background:'radial-gradient(ellipse 70% 55% at 50% 100%,rgba(255,255,255,0.05) 0%,transparent 65%)' }} />

        <div ref={ctaReveal.ref} className={`relative max-w-2xl mx-auto ${ctaReveal.visible ? 'show' : ''}`}>
          <span className="rv inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-white/25 mb-8">Empieza hoy</span>
          <h2 className="rv d1 text-5xl md:text-6xl font-black leading-[1.02] tracking-[-0.03em] mb-6 text-white">
            Tu restaurante merece<br />operar mejor.
          </h2>
          <p className="rv d2 text-white/40 text-lg mb-12 max-w-sm mx-auto leading-relaxed">
            Herramientas que dignifican el trabajo de quienes mueven el mundo.
          </p>
          <div className="rv d3 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => goTo('pricing')}
              className="inline-flex items-center justify-center gap-2 font-bold px-10 py-4 rounded-full text-sm text-[#111] bg-white hover:bg-zinc-100 transition-all group active:scale-[0.98] cursor-pointer">
              Ver planes y precios
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={onLogin}
              className="inline-flex items-center justify-center gap-2 font-medium px-10 py-4 rounded-full text-sm text-white/45 hover:text-white border border-white/[0.12] hover:border-white/25 transition-all cursor-pointer">
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── ───────────────────────────────────────── */}
      <footer className="bg-[#0f0f0f] border-t border-white/[0.06] px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            <div className="col-span-2">
              <button onClick={onLogin} className="flex items-center gap-2.5 mb-5 cursor-pointer group">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background:'linear-gradient(135deg,#fff,#d4d4d8)' }}>
                  <span className="font-black text-[#111] text-sm">W</span>
                </div>
                <span className="font-bold text-white/70 group-hover:text-white transition-colors tracking-tight">WAITLESS</span>
              </button>
              <p className="text-white/25 text-sm leading-relaxed max-w-xs">
                Plataforma operativa para restaurantes con servicio en mesa.
              </p>
            </div>
            {([
              { h:'Producto', l:[
                { label:'Menú Digital',    id:'features' },
                { label:'Sistema POS',     id:'features' },
                { label:'Pantalla Cocina', id:'features' },
                { label:'Analítica',       id:'features' },
              ]},
              { h:'Planes', l:[
                { label:'Básico',   id:'pricing' },
                { label:'Pro',      id:'pricing' },
                { label:'Business', id:'pricing' },
              ]},
              { h:'Navegar', l:[
                { label:'Cómo funciona', id:'how' },
                { label:'Funciones',     id:'features' },
                { label:'Clientes',      id:'testimonials' },
              ]},
            ] as { h: string; l: { label: string; id: string }[] }[]).map(col => (
              <div key={col.h}>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-5">{col.h}</p>
                <ul className="space-y-3">
                  {col.l.map(link => (
                    <li key={link.label}>
                      <button
                        onClick={() => goTo(link.id)}
                        className="text-white/25 text-sm hover:text-white/55 transition-colors cursor-pointer text-left">
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
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
