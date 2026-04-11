'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ChevronRight, Star, ArrowRight, Zap, TrendingUp, Users,
  Menu, X, Check, LayoutGrid, ChefHat, BarChart2,
  CreditCard, Bell, Building2, Minus,
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
  { name: 'Roberto C.', role: 'La Leña', text: 'La pantalla de cocina eliminó los papelitos y los gritos. El equipo está más tranquilo y los pedidos salen más rápido.' },
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
  { step: '01', title: 'Configura tu restaurante', body: 'Agrega tus mesas, carga el menú y personaliza tu marca. Listo en menos de 30 minutos.' },
  { step: '02', title: 'Tus clientes escanean el QR', body: 'Cada mesa tiene su código único. El cliente ve el menú, hace su pedido y paga — sin app.' },
  { step: '03', title: 'Cocina recibe en pantalla', body: 'Los pedidos llegan instantáneamente a la pantalla de cocina. Sin gritos, sin papel, sin errores.' },
  { step: '04', title: 'Cierra el día con claridad', body: 'Dashboard con ventas, propinas, productos más pedidos y reporte listo para exportar.' },
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

  // Infinite carousel scroll
  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    let frame: number
    let pos = 0
    const tick = () => {
      pos += 0.6
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
    if (!showEmailFor) {
      setShowEmailFor(planId)
      return
    }
    if (showEmailFor !== planId) {
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
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Error al procesar el pago')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="bg-white text-black font-sans overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/96 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.06)]' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={onLogin}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
              <span className="font-black text-black text-sm leading-none">W</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight">WAITLESS</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[['#how', 'Cómo funciona'], ['#features', 'Funciones'], ['#pricing', 'Precios'], ['#testimonials', 'Clientes']].map(([href, label]) => (
              <a key={href} href={href} className="text-white/60 hover:text-white text-sm transition-colors duration-200 cursor-pointer">{label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={onLogin} className="text-white/70 hover:text-white text-sm transition-colors cursor-pointer">
              Iniciar sesión
            </button>
            <a href="#pricing" className="bg-white text-black text-sm font-bold px-5 py-2 rounded-full hover:bg-white/90 transition-colors cursor-pointer">
              Ver planes
            </a>
          </div>

          <button className="md:hidden text-white cursor-pointer" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-black border-t border-white/10 px-6 py-5 space-y-4">
            {[['#how', 'Cómo funciona'], ['#features', 'Funciones'], ['#pricing', 'Precios'], ['#testimonials', 'Clientes']].map(([href, label]) => (
              <a key={href} href={href} className="block text-white/70 text-sm py-1" onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="pt-2 space-y-2 border-t border-white/10">
              <button onClick={() => { setMenuOpen(false); onLogin() }} className="block w-full text-left text-white/70 text-sm py-1 cursor-pointer">
                Iniciar sesión
              </button>
              <a href="#pricing" onClick={() => setMenuOpen(false)} className="block w-full text-center bg-white text-black text-sm font-bold px-5 py-2.5 rounded-full cursor-pointer">
                Ver planes
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="bg-black min-h-screen flex items-center px-6 pt-16">
        <div className="max-w-6xl mx-auto w-full py-28 md:py-36">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-4 py-1.5 mb-10">
            <Zap className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-white/70 text-xs font-medium tracking-wide">Plataforma operativa para restaurantes</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.02] tracking-tight mb-7 max-w-4xl">
            Operación perfecta.<br />
            <span className="text-white/30">Sin fricciones.</span>
          </h1>

          <p className="text-white/50 text-lg md:text-xl leading-relaxed mb-12 max-w-lg">
            De la mesa al cobro en segundos. Gestiona pedidos, cocina y analítica desde un solo panel.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-20">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-full text-sm hover:bg-white/90 transition-all group cursor-pointer"
            >
              Comenzar gratis
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-medium px-8 py-4 rounded-full text-sm transition-all cursor-pointer"
            >
              Ver cómo funciona
            </a>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3 max-w-sm">
            {[
              { v: '2x', l: 'Pagos más rápidos' },
              { v: '+40%', l: 'Más ventas' },
              { v: '35%', l: 'Mejores decisiones' },
            ].map(k => (
              <div key={k.l} className="border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors">
                <p className="text-2xl font-black text-white">{k.v}</p>
                <p className="text-white/40 text-[11px] mt-1 leading-tight">{k.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="bg-[#F7F7F7] py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-black/30 mb-3">Cómo funciona</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-xl">
              Listo en 30 minutos. Operando para siempre.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-white rounded-2xl p-6 border border-black/5 hover:border-black/10 transition-colors">
                <span className="text-[11px] font-black text-black/20 tracking-widest">{s.step}</span>
                <h3 className="text-base font-bold mt-3 mb-2 leading-snug">{s.title}</h3>
                <p className="text-black/50 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-black/30 mb-3">Funciones</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Todo lo que necesita<br />tu restaurante
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {/* Feature grande */}
            <div className="md:col-span-2 bg-black rounded-3xl p-8 md:p-10 flex flex-col justify-between min-h-64">
              <div>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-5">
                  <LayoutGrid className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Gestión de mesas en tiempo real</h3>
                <p className="text-white/50 text-sm leading-relaxed max-w-sm">
                  Vista completa del salón. Libre, ocupada, en cocina, lista para cobrar. Todo en un vistazo.
                </p>
              </div>
              <div className="mt-8 flex gap-2">
                {['Libre', 'Ocupada', 'En cocina', 'Lista'].map((s, i) => (
                  <span key={s} className={`text-[10px] font-semibold px-3 py-1.5 rounded-full ${
                    i === 0 ? 'bg-white/10 text-white/50' :
                    i === 1 ? 'bg-white/20 text-white/80' :
                    i === 2 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>{s}</span>
                ))}
              </div>
            </div>

            <div className="bg-[#F3F3F3] rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-5">
                  <ChefHat className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-black mb-2">Pantalla de cocina digital</h3>
                <p className="text-black/50 text-sm leading-relaxed">Sin papel. Sin gritos. Los pedidos llegan solos.</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-[#F3F3F3] rounded-3xl p-8">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-5">
                <BarChart2 className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-black mb-2">Analítica en tiempo real</h3>
              <p className="text-black/50 text-sm leading-relaxed">Ventas, propinas, ticket promedio y ranking de productos.</p>
            </div>

            <div className="bg-[#F3F3F3] rounded-3xl p-8">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-5">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-black mb-2">Cobro en mesa</h3>
              <p className="text-black/50 text-sm leading-relaxed">Efectivo, tarjeta, transferencia o Apple Pay. División de cuenta incluida.</p>
            </div>

            <div className="bg-black rounded-3xl p-8">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-5">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Notificaciones al instante</h3>
              <p className="text-white/50 text-sm leading-relaxed">El mesero sabe cuando el pedido está listo. El cliente sabe cuando puede pagar.</p>
            </div>
          </div>

          {/* Pills */}
          <div className="mt-10 flex flex-wrap gap-2 justify-center">
            {['Menú QR', 'Lista de espera', 'Control de inventario', 'Multi-sucursal', 'Puntos de lealtad', 'Reembolsos', 'Exportar reportes', 'Historial de mesas'].map(p => (
              <span key={p} className="border border-black/10 rounded-full px-4 py-1.5 text-xs text-black/50 font-medium hover:border-black/20 hover:text-black/70 transition-colors cursor-default">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="bg-black py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3">Precios</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
              Sin sorpresas.<br />Sin letras chicas.
            </h2>
            <p className="text-white/40 text-base max-w-sm mx-auto">
              Todos los planes incluyen onboarding gratuito y soporte por chat.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-3xl p-8 flex flex-col relative overflow-hidden transition-all ${
                  plan.highlight
                    ? 'bg-white text-black'
                    : 'bg-white/6 border border-white/10 text-white hover:bg-white/8'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-5 right-5">
                    <span className="bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">MÁS POPULAR</span>
                  </div>
                )}

                <div className="mb-6">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${plan.highlight ? 'text-black/40' : 'text-white/30'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-3">
                    <span className="text-5xl font-black tracking-tight">{plan.price}</span>
                    <span className={`text-sm mb-2 ${plan.highlight ? 'text-black/40' : 'text-white/40'}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-black/60' : 'text-white/50'}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`flex items-center gap-3 text-sm ${
                      f.included
                        ? plan.highlight ? 'text-black' : 'text-white/80'
                        : plan.highlight ? 'text-black/25' : 'text-white/20'
                    }`}>
                      {f.included
                        ? <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        : <Minus className="h-4 w-4 shrink-0 opacity-40" />
                      }
                      {f.text}
                    </li>
                  ))}
                </ul>

                {/* Email input when selecting plan */}
                {showEmailFor === plan.id && (
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={planEmail}
                    onChange={e => setPlanEmail(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 text-sm mb-3 outline-none border transition-colors ${
                      plan.highlight
                        ? 'bg-black/5 border-black/10 text-black placeholder-black/30 focus:border-black/30'
                        : 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/20'
                    }`}
                    autoFocus
                  />
                )}

                <button
                  onClick={() => handlePlanClick(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    plan.highlight
                      ? 'bg-black text-white hover:bg-black/80'
                      : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
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

          <p className="text-center text-white/25 text-xs">
            Precios en MXN · IVA no incluido · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="bg-[#F7F7F7] py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-black/30 mb-3">Testimonios</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Lo que dicen<br />nuestros clientes
          </h2>
        </div>

        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-hidden select-none pl-6"
        >
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-72 bg-white border border-black/5 rounded-2xl p-6 hover:border-black/10 transition-colors"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-black/70 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div>
                <p className="font-bold text-sm text-black">{t.name}</p>
                <p className="text-black/40 text-xs mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MULTI-SUCURSAL BANNER ── */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-black rounded-3xl px-8 py-12 md:px-16 md:py-16 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
                ¿Tienes más de un local?
              </h3>
              <p className="text-white/50 text-base leading-relaxed max-w-md">
                El plan Business incluye gestión multi-sucursal. Un solo panel para todos tus restaurantes.
              </p>
            </div>
            <div className="flex-shrink-0">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-full text-sm hover:bg-white/90 transition-colors cursor-pointer group"
              >
                Ver plan Business
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-black py-32 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/25 mb-8">Empieza hoy</p>
          <h2 className="text-5xl md:text-6xl font-black text-white leading-[1.02] tracking-tight mb-6">
            Tu restaurante merece operar mejor.
          </h2>
          <p className="text-white/40 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            No creemos en tecnología para pocos. Creemos en herramientas que dignifican el trabajo de quienes mueven el mundo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 bg-white text-black font-bold px-10 py-4 rounded-full text-sm hover:bg-white/90 transition-all group cursor-pointer"
            >
              Ver planes y precios
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <button
              onClick={onLogin}
              className="inline-flex items-center justify-center gap-2 border border-white/15 text-white/60 hover:text-white hover:border-white/30 font-medium px-10 py-4 rounded-full text-sm transition-all cursor-pointer"
            >
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-black border-t border-white/8 px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={onLogin}>
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                  <span className="font-black text-black text-sm">W</span>
                </div>
                <span className="font-bold text-white tracking-tight">WAITLESS</span>
              </div>
              <p className="text-white/30 text-sm leading-relaxed max-w-xs">
                Plataforma operativa para restaurantes con servicio en mesa.
              </p>
            </div>

            {[
              { h: 'Producto', l: ['Menú Digital', 'Sistema POS', 'Pantalla Cocina', 'Analítica'] },
              { h: 'Planes', l: ['Básico', 'Pro', 'Business'] },
              { h: 'Legal', l: ['Términos', 'Privacidad'] },
            ].map(col => (
              <div key={col.h}>
                <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">{col.h}</p>
                <ul className="space-y-3">
                  {col.l.map(link => (
                    <li key={link}>
                      <a href="#" className="text-white/35 text-sm hover:text-white/70 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/20 text-xs">© 2026 WAITLESS · Plataforma Operativa para Restaurantes</p>
            <button
              onClick={onLogin}
              className="text-white/30 text-xs hover:text-white/60 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Iniciar sesión <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </footer>

    </div>
  )
}
