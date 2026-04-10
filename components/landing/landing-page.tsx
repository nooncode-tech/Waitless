'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronRight, Star, ArrowRight, Zap, TrendingUp, Users, Menu, X } from 'lucide-react'

interface LandingPageProps {
  onLogin: () => void
}

const TESTIMONIALS = [
  { name: 'Carlos M.', role: 'Dueño, Tacos El Rey', text: 'Desde que usamos Waitless los pedidos llegan directo a cocina sin errores. Bajamos los tiempos de servicio a la mitad.' },
  { name: 'Sofía R.', role: 'Gerente, Bistró 33', text: 'El panel de analytics me da claridad que antes solo tenía en mi cabeza. Ahora tomo decisiones con datos reales.' },
  { name: 'Miguel A.', role: 'Operador, Cadena de 4 locales', text: 'Manejar varias sucursales desde un solo panel es un cambio total. Waitless hizo posible algo que antes necesitaba 3 sistemas.' },
  { name: 'Daniela P.', role: 'Dueña, Café Lumbre', text: 'El menú digital con QR fue la mejor decisión. Los clientes piden solos y nosotros nos enfocamos en el servicio.' },
  { name: 'Roberto C.', role: 'Chef-Dueño, La Leña', text: 'La pantalla de cocina eliminó los papelitos y los gritos. El equipo está más tranquilo y los pedidos salen más rápido.' },
  { name: 'Valentina G.', role: 'Administradora, El Patio', text: 'El cierre de caja ahora me toma 5 minutos. Antes perdía media hora cada noche reconciliando todo a mano.' },
  { name: 'Andrés T.', role: 'Franquiciado, 6 locales', text: 'Waitless escala contigo. Empecé con un local y hoy manejo seis desde el mismo tablero sin complicaciones.' },
  { name: 'Lorena B.', role: 'Socia, Fusión MX', text: 'El sistema de propinas y división de cuenta mejoró mucho la experiencia de mis clientes en la noche.' },
]

const FEATURES = [
  {
    tag: 'Operación',
    title: 'Mesa → Pedido → Cocina en segundos',
    body: 'Los meseros toman pedidos desde su dispositivo. Llegan directo a la pantalla de cocina sin intermediarios, sin papel, sin errores de comunicación.',
    stat: '2x más rápido',
    statLabel: 'tiempo de despacho',
  },
  {
    tag: 'Analítica',
    title: 'Cierra el día sabiendo exactamente qué pasó',
    body: 'Dashboard en tiempo real con ventas por mesa, por mesero, por producto. Reportes de cierre, historial de sesiones y exportación en un clic.',
    stat: '35%',
    statLabel: 'mejores decisiones',
  },
  {
    tag: 'Experiencia cliente',
    title: 'Menú digital con QR. Sin app, sin fricción',
    body: 'Tus clientes escanean el QR, ven el menú, hacen su pedido y pagan desde la mesa. Tú recibes todo en tiempo real.',
    stat: '40%',
    statLabel: 'más ventas promedio',
  },
]

export function LandingPage({ onLogin }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-scroll testimonials
  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    let frame: number
    let pos = 0
    const speed = 0.5
    const scroll = () => {
      pos += speed
      if (pos >= el.scrollWidth / 2) pos = 0
      el.scrollLeft = pos
      frame = requestAnimationFrame(scroll)
    }
    frame = requestAnimationFrame(scroll)
    const pause = () => cancelAnimationFrame(frame)
    const resume = () => { frame = requestAnimationFrame(scroll) }
    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', resume)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', resume)
    }
  }, [])

  return (
    <div className="bg-white text-black font-sans overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/95 backdrop-blur-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="font-black text-black text-sm">W</span>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">WAITLESS</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-white/70 hover:text-white text-sm transition-colors">Funciones</a>
            <a href="#testimonials" className="text-white/70 hover:text-white text-sm transition-colors">Clientes</a>
            <a href="#products" className="text-white/70 hover:text-white text-sm transition-colors">Productos</a>
            <button
              onClick={onLogin}
              className="bg-white text-black text-sm font-semibold px-5 py-2 rounded-full hover:bg-white/90 transition-colors"
            >
              Iniciar sesión
            </button>
          </div>

          <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-black border-t border-white/10 px-6 py-4 space-y-4">
            <a href="#features" className="block text-white/70 text-sm" onClick={() => setMenuOpen(false)}>Funciones</a>
            <a href="#testimonials" className="block text-white/70 text-sm" onClick={() => setMenuOpen(false)}>Clientes</a>
            <a href="#products" className="block text-white/70 text-sm" onClick={() => setMenuOpen(false)}>Productos</a>
            <button onClick={onLogin} className="w-full bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-full">
              Iniciar sesión
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="bg-black min-h-screen flex items-center px-6 pt-16">
        <div className="max-w-6xl mx-auto w-full py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-white/80 text-xs font-medium">Plataforma operativa para restaurantes</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
              El sistema que tu restaurante necesitaba.
            </h1>

            <p className="text-white/60 text-lg md:text-xl leading-relaxed mb-10 max-w-xl">
              Gestiona mesas, pedidos, cocina y cobros desde un solo lugar. Sin papel, sin gritos, sin errores.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onLogin}
                className="inline-flex items-center justify-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-full text-base hover:bg-white/90 transition-all hover:gap-3"
              >
                Comenzar ahora
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-medium px-8 py-4 rounded-full text-base hover:bg-white/5 transition-colors"
              >
                Ver funciones
              </a>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-20 max-w-xl">
            {[
              { value: '2x', label: 'Pagos más rápidos' },
              { value: '+40%', label: 'Más ventas' },
              { value: '35%', label: 'Mejores decisiones' },
            ].map(s => (
              <div key={s.label} className="border border-white/10 rounded-2xl p-4 md:p-5">
                <p className="text-2xl md:text-3xl font-black text-white">{s.value}</p>
                <p className="text-white/50 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-black/40 mb-3">Funciones</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Para cualquier tipo<br />de restaurante
            </h2>
            <p className="text-black/50 mt-4 text-lg max-w-xl mx-auto">
              Una plataforma que aumenta tus ventas y eleva el servicio al cliente.
            </p>
          </div>

          <div className="space-y-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.tag}
                className={`rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center ${i % 2 === 0 ? 'bg-[#F3F3F3]' : 'bg-black text-white'}`}
              >
                <div className="flex-1">
                  <span className={`text-xs font-bold uppercase tracking-widest ${i % 2 === 0 ? 'text-black/40' : 'text-white/40'}`}>{f.tag}</span>
                  <h3 className="text-2xl md:text-3xl font-black mt-2 mb-4 leading-tight">{f.title}</h3>
                  <p className={`text-base leading-relaxed ${i % 2 === 0 ? 'text-black/60' : 'text-white/60'}`}>{f.body}</p>
                </div>
                <div className={`flex-shrink-0 w-full md:w-48 h-40 rounded-2xl flex flex-col items-center justify-center ${i % 2 === 0 ? 'bg-black' : 'bg-white/10'}`}>
                  <p className="text-4xl font-black text-white">{f.stat}</p>
                  <p className="text-white/50 text-xs mt-1 text-center px-4">{f.statLabel}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="mt-12 flex flex-wrap gap-3 justify-center">
            {['Menú digital QR', 'Pantalla de cocina', 'Cobro en mesa', 'Reportes en tiempo real', 'Control de inventario', 'Lista de espera', 'Puntos de lealtad', 'Multi-sucursal'].map(pill => (
              <span key={pill} className="border border-black/10 rounded-full px-5 py-2 text-sm text-black/60 font-medium">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="bg-black py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Testimonios</p>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Lo que dicen<br />nuestros clientes</h2>
        </div>

        {/* Infinite carousel */}
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-hidden select-none"
          style={{ cursor: 'grab' }}
        >
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-72 md:w-80 bg-white/[0.06] border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-white/80 text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div>
                <p className="text-white font-semibold text-sm">{t.name}</p>
                <p className="text-white/40 text-xs mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section id="products" className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-black/40 mb-3">Productos</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Nuestros productos</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Users className="h-6 w-6" />,
                title: 'Menú Digital',
                desc: 'QR en mesa. Tus clientes ven el menú, hacen su pedido y pagan sin necesitar app ni cuenta.',
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: 'Sistema POS',
                desc: 'Punto de venta completo. Mesas, pedidos, cocina, cobro, propinas y cierre de caja en un solo panel.',
              },
              {
                icon: <TrendingUp className="h-6 w-6" />,
                title: 'Analítica',
                desc: 'Dashboard en tiempo real. Ventas por mesa, por mesero, por producto. Exporta reportes en un clic.',
              },
            ].map(p => (
              <div key={p.title} className="bg-[#F3F3F3] rounded-3xl p-8 hover:bg-[#EBEBEB] transition-colors">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white mb-6">
                  {p.icon}
                </div>
                <h3 className="text-xl font-black mb-3">{p.title}</h3>
                <p className="text-black/60 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-black py-32 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-6">Empieza hoy</p>
          <h2 className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight mb-6">
            Tu restaurante merece operar mejor.
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
            No creemos en tecnología para pocos. Creemos en herramientas que dignifican el trabajo de quienes mueven el mundo.
          </p>
          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 bg-white text-black font-bold px-10 py-4 rounded-full text-base hover:bg-white/90 transition-all hover:gap-3"
          >
            Comenzar ahora
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-black border-t border-white/10 px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="font-black text-black text-sm">W</span>
                </div>
                <span className="font-bold text-white">WAITLESS</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                Plataforma operativa para restaurantes con servicio en mesa.
              </p>
            </div>

            {[
              { heading: 'Producto', links: ['Menú Digital', 'Sistema POS', 'Analítica', 'Cocina Digital'] },
              { heading: 'Empresa', links: ['Acerca de', 'Contacto', 'Carreras'] },
              { heading: 'Legal', links: ['Términos', 'Privacidad'] },
            ].map(col => (
              <div key={col.heading}>
                <p className="text-white text-sm font-semibold mb-4">{col.heading}</p>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-white/40 text-sm hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs">© 2026 WAITLESS · Plataforma Operativa para Restaurantes</p>
            <button
              onClick={onLogin}
              className="text-white/40 text-xs hover:text-white transition-colors flex items-center gap-1"
            >
              Iniciar sesión <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </footer>

    </div>
  )
}
