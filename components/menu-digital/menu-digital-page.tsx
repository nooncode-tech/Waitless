'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ShoppingCart, X, Plus, Minus, MessageCircle, Check, Phone, ChevronLeft, ArrowRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuExtra {
  id: string
  nombre: string
  precio: number
}

interface MenuItem {
  id: string
  nombre: string
  descripcion: string
  precio: number
  imagen: string | null
  imagenes: string[]
  colorFondo: string | null
  colorBorde: string | null
  categoriaId: string | null
  extras: MenuExtra[]
}

interface Category {
  id: string
  nombre: string
  orden: number
}

interface MenuData {
  restaurantName: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  whatsappNumero: string | null
  poweredByWaitless: boolean
  coverUrl: string | null
  descripcion: string | null
  metodosPago: { efectivo: boolean; tarjeta: boolean; transferencia: boolean }
  categories: Category[]
  items: MenuItem[]
  tenantId: string | null
  tiendaAbierta?: boolean
}

interface CartEntry {
  item: MenuItem
  cantidad: number
  selectedExtras: MenuExtra[]
}

type Screen = 'menu' | 'cart' | 'checkout' | 'success' | 'mensaje'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return '$' + n.toFixed(2)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MenuDigitalPage({ slug }: { slug: string }) {
  const [data, setData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('menu')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartEntry[]>([])
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [orderNum, setOrderNum] = useState<number | null>(null)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const tabsRef = useRef<HTMLDivElement>(null)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [metodoPago, setMetodoPago] = useState<string>('')
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [msgNombre, setMsgNombre] = useState('')
  const [msgTelefono, setMsgTelefono] = useState('')
  const [msgTexto, setMsgTexto] = useState('')
  const [msgSent, setMsgSent] = useState(false)
  const [msgSubmitting, setMsgSubmitting] = useState(false)

  useEffect(() => {
    const fetchMenu = (isInitial = false) => {
      fetch(`/api/public/${slug}/menu`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          if (d.error) { if (isInitial) setError(d.error); return }
          setData(d)
          if (isInitial && d.categories.length > 0) setActiveCategory(d.categories[0].id)
          if (isInitial) {
            const m = d.metodosPago
            if (m.efectivo) setMetodoPago('efectivo')
            else if (m.tarjeta) setMetodoPago('tarjeta')
            else if (m.transferencia) setMetodoPago('transferencia')
          }
        })
        .catch(() => { if (isInitial) setError('No se pudo cargar el menú') })
        .finally(() => { if (isInitial) setLoading(false) })
    }
    fetchMenu(true)
    const interval = setInterval(() => fetchMenu(false), 30_000)
    return () => clearInterval(interval)
  }, [slug])

  const cartTotal = cart.reduce((sum, e) => {
    return sum + (e.item.precio + e.selectedExtras.reduce((s, ex) => s + ex.precio, 0)) * e.cantidad
  }, 0)
  const cartCount = cart.reduce((sum, e) => sum + e.cantidad, 0)

  const addToCart = useCallback((item: MenuItem, extras: MenuExtra[] = []) => {
    setCart(prev => {
      const key = extras.map(e => e.id).sort().join(',')
      const existing = prev.find(e => e.item.id === item.id && e.selectedExtras.map(x => x.id).sort().join(',') === key)
      if (existing) return prev.map(e => e === existing ? { ...e, cantidad: e.cantidad + 1 } : e)
      return [...prev, { item, cantidad: 1, selectedExtras: extras }]
    })
    setExpandedItem(null)
  }, [])

  const changeQty = (index: number, delta: number) => {
    setCart(prev => prev.map((e, i) => i === index ? { ...e, cantidad: e.cantidad + delta } : e).filter(e => e.cantidad > 0))
  }

  const handleOrder = async () => {
    if (!metodoPago) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/${slug}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(e => ({ itemId: e.item.id, cantidad: e.cantidad, extras: e.selectedExtras })),
          nombreCliente: nombre.trim() || undefined,
          telefono: telefono.trim() || undefined,
          metodoPago,
          notas: notas.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.error) { alert(json.error); return }
      setOrderNum(json.numero)
      setCart([])
      setScreen('success')
    } catch {
      alert('Error al enviar el pedido. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMensaje = async () => {
    if (!msgTexto.trim()) return
    setMsgSubmitting(true)
    try {
      const res = await fetch(`/api/public/${slug}/mensaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: msgTexto, nombre: msgNombre, telefono: msgTelefono }),
      })
      const json = await res.json()
      if (json.error) { alert(json.error); return }
      setMsgSent(true)
    } catch {
      alert('Error al enviar. Intentá de nuevo.')
    } finally {
      setMsgSubmitting(false)
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
        <p className="text-xs text-black/30 tracking-widest uppercase">Cargando menú</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mb-6">
          <span className="text-white text-2xl font-black" style={{ letterSpacing: '-0.04em' }}>W</span>
        </div>
        <p className="font-bold text-black text-lg" style={{ letterSpacing: '-0.02em' }}>Menú no disponible</p>
        <p className="text-sm text-black/40 mt-2">{error ?? 'No se encontró este restaurante.'}</p>
      </div>
    )
  }

  const primary = data.primaryColor || '#000000'
  const itemsByCategory = (catId: string) => data.items.filter(i => i.categoriaId === catId)
  const uncategorized = data.items.filter(i => !data.categories.some(c => c.id === i.categoriaId))

  // ─── SUCCESS ─────────────────────────────────────────────────────────────────

  if (screen === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center mb-6">
          <Check className="h-7 w-7 text-white" strokeWidth={2.5} />
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase text-black/30 mb-2">Pedido recibido</p>
        <p
          className="font-black text-6xl mb-1"
          style={{ letterSpacing: '-0.04em', color: primary }}
        >
          #{orderNum}
        </p>
        <p className="text-sm text-black/50 mb-8">Estamos preparando tu pedido.</p>

        <div className="w-full max-w-xs space-y-3">
          {data.whatsappNumero && (
            <a
              href={`https://wa.me/${data.whatsappNumero.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#25D366' }}
            >
              <Phone className="h-4 w-4" />
              Contactar por WhatsApp
            </a>
          )}
          <button
            onClick={() => { setScreen('menu'); setNombre(''); setTelefono(''); setNotas('') }}
            className="w-full h-12 rounded-xl border border-black/10 text-sm font-semibold text-black hover:bg-black/5 transition-colors"
          >
            Volver al menú
          </button>
        </div>

        {data.poweredByWaitless && (
          <p className="absolute bottom-6 text-[10px] text-black/20 tracking-widest uppercase">
            Powered by WAITLESS
          </p>
        )}
      </div>
    )
  }

  // ─── MENSAJE ─────────────────────────────────────────────────────────────────

  if (screen === 'mensaje') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-black/5 px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => setScreen('menu')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-black" />
          </button>
          <h1 className="font-bold text-black text-base" style={{ letterSpacing: '-0.02em' }}>
            Enviar mensaje
          </h1>
        </header>

        <div className="flex-1 p-5 max-w-lg mx-auto w-full">
          {msgSent ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center">
                <Check className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-bold text-black text-lg" style={{ letterSpacing: '-0.02em' }}>Mensaje enviado</p>
                <p className="text-sm text-black/40 mt-1">El restaurante lo recibirá pronto.</p>
              </div>
              <button
                onClick={() => setScreen('menu')}
                className="mt-2 h-11 px-6 rounded-xl border border-black/10 text-sm font-semibold text-black"
              >
                Volver al menú
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-black/[0.06] bg-white shadow-sm">
                <div>
                  <label className="block text-[11px] font-semibold text-black/40 uppercase tracking-wider mb-1.5">Nombre</label>
                  <input
                    value={msgNombre}
                    onChange={e => setMsgNombre(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm text-black placeholder:text-black/25 focus:outline-none focus:border-black/30 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black/40 uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input
                    value={msgTelefono}
                    onChange={e => setMsgTelefono(e.target.value)}
                    placeholder="+52 55..."
                    className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm text-black placeholder:text-black/25 focus:outline-none focus:border-black/30 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-black/40 uppercase tracking-wider mb-1.5">Mensaje *</label>
                <textarea
                  value={msgTexto}
                  onChange={e => setMsgTexto(e.target.value)}
                  placeholder="Escribe tu mensaje al restaurante..."
                  rows={5}
                  maxLength={1000}
                  className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm text-black placeholder:text-black/25 focus:outline-none focus:border-black/30 bg-white resize-none"
                />
                <p className="text-[10px] text-black/25 text-right mt-0.5">{msgTexto.length}/1000</p>
              </div>
              <button
                className="w-full h-12 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: primary }}
                disabled={!msgTexto.trim() || msgSubmitting}
                onClick={handleMensaje}
              >
                {msgSubmitting ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── CHECKOUT ────────────────────────────────────────────────────────────────

  if (screen === 'checkout') {
    const metodos = Object.entries(data.metodosPago).filter(([, v]) => v).map(([k]) => k)
    const metodoLabels: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-black/5 px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => setScreen('cart')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-black" />
          </button>
          <h1 className="font-bold text-black text-base" style={{ letterSpacing: '-0.02em' }}>
            Confirmar pedido
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full">
          {/* Resumen */}
          <div className="px-5 pt-5">
            <p className="text-[11px] font-semibold text-black/30 uppercase tracking-wider mb-3">Tu pedido</p>
            <div className="rounded-2xl border border-black/8 overflow-hidden">
              {cart.map((entry, i) => {
                const ext = entry.selectedExtras.reduce((s, e) => s + e.precio, 0)
                return (
                  <div key={i} className="flex justify-between items-center px-4 py-3 border-b border-black/5 last:border-0">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-semibold text-black">{entry.cantidad}× {entry.item.nombre}</p>
                      {entry.selectedExtras.length > 0 && (
                        <p className="text-[11px] text-black/35 mt-0.5">{entry.selectedExtras.map(e => e.nombre).join(' · ')}</p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-black shrink-0">{formatPrice((entry.item.precio + ext) * entry.cantidad)}</p>
                  </div>
                )
              })}
              <div className="flex justify-between items-center px-4 py-3 bg-black/3">
                <p className="text-sm font-bold text-black">Total</p>
                <p className="text-base font-black text-black" style={{ letterSpacing: '-0.02em' }}>{formatPrice(cartTotal)}</p>
              </div>
            </div>
          </div>

          {/* Datos */}
          <div className="px-5 mt-6">
            <p className="text-[11px] font-semibold text-black/30 uppercase tracking-wider mb-3">Tus datos <span className="normal-case font-normal">(opcional)</span></p>
            <div className="space-y-3">
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Nombre"
                className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm text-black placeholder:text-black/25 focus:outline-none focus:border-black/30 bg-white"
              />
              <input
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="Teléfono"
                className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm text-black placeholder:text-black/25 focus:outline-none focus:border-black/30 bg-white"
              />
            </div>
          </div>

          {/* Pago */}
          <div className="px-5 mt-6">
            <p className="text-[11px] font-semibold text-black/30 uppercase tracking-wider mb-3">Método de pago</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${metodos.length}, 1fr)` }}>
              {metodos.map(m => (
                <button
                  key={m}
                  onClick={() => setMetodoPago(m)}
                  className="h-12 rounded-xl border-2 text-sm font-semibold transition-all"
                  style={
                    metodoPago === m
                      ? { borderColor: primary, backgroundColor: primary, color: '#fff' }
                      : { borderColor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.6)', backgroundColor: '#fff' }
                  }
                >
                  {metodoLabels[m] ?? m}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="px-5 mt-6">
            <p className="text-[11px] font-semibold text-black/30 uppercase tracking-wider mb-3">Notas <span className="normal-case font-normal">(opcional)</span></p>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Alergias, instrucciones especiales..."
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm text-black placeholder:text-black/25 focus:outline-none focus:border-black/30 bg-white resize-none"
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 p-4 max-w-lg mx-auto">
          <button
            className="w-full h-13 rounded-xl text-sm font-bold text-white flex items-center justify-between px-5 disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary, height: '52px' }}
            disabled={!metodoPago || submitting}
            onClick={handleOrder}
          >
            <span>{submitting ? 'Enviando...' : 'Hacer pedido'}</span>
            <span className="font-black text-base" style={{ letterSpacing: '-0.02em' }}>{formatPrice(cartTotal)}</span>
          </button>
        </div>
      </div>
    )
  }

  // ─── CART ────────────────────────────────────────────────────────────────────

  if (screen === 'cart') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-black/5 px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => setScreen('menu')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-black" />
          </button>
          <h1 className="font-bold text-black text-base" style={{ letterSpacing: '-0.02em' }}>
            Tu carrito
          </h1>
          {cartCount > 0 && (
            <span className="ml-auto text-xs font-semibold text-black/30">{cartCount} {cartCount === 1 ? 'ítem' : 'ítems'}</span>
          )}
        </header>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingCart className="h-10 w-10 text-black/10" />
            <p className="text-sm font-semibold text-black/30">Tu carrito está vacío</p>
            <button
              onClick={() => setScreen('menu')}
              className="mt-2 h-10 px-5 rounded-xl border border-black/10 text-sm font-semibold text-black"
            >
              Ver menú
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto pb-32 max-w-lg mx-auto w-full">
              {cart.map((entry, i) => {
                const ext = entry.selectedExtras.reduce((s, e) => s + e.precio, 0)
                const foto = entry.item.imagenes[0] ?? entry.item.imagen
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-black/5 last:border-0">
                    {foto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={foto}
                        alt={entry.item.nombre}
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                        style={{ backgroundColor: entry.item.colorFondo ?? '#f5f5f5' }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black truncate">{entry.item.nombre}</p>
                      {entry.selectedExtras.length > 0 && (
                        <p className="text-[11px] text-black/35 mt-0.5">{entry.selectedExtras.map(e => e.nombre).join(' · ')}</p>
                      )}
                      <p className="text-sm font-black text-black mt-0.5" style={{ letterSpacing: '-0.02em' }}>
                        {formatPrice((entry.item.precio + ext) * entry.cantidad)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => changeQty(i, -1)}
                        className="w-8 h-8 rounded-lg border border-black/10 flex items-center justify-center hover:bg-black/5 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5 text-black" />
                      </button>
                      <span className="text-sm font-bold text-black w-4 text-center">{entry.cantidad}</span>
                      <button
                        onClick={() => changeQty(i, 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: primary }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 p-4">
              <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-black/40">Total</p>
                  <p className="text-xl font-black text-black" style={{ letterSpacing: '-0.03em' }}>{formatPrice(cartTotal)}</p>
                </div>
                <button
                  className="w-full rounded-xl font-bold text-white flex items-center justify-between px-5 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primary, height: '52px' }}
                  onClick={() => setScreen('checkout')}
                >
                  <span className="text-sm">Continuar</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ─── ITEM CARD (grid) ────────────────────────────────────────────────────────

  const ItemCard = ({ item }: { item: MenuItem }) => {
    const isExpanded = expandedItem === item.id
    const [selectedExtras, setSelectedExtras] = useState<MenuExtra[]>([])
    const foto = item.imagenes[0] ?? item.imagen

    const toggleExtra = (extra: MenuExtra) => {
      setSelectedExtras(prev =>
        prev.some(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]
      )
    }

    const extrasPrice = selectedExtras.reduce((s, e) => s + e.precio, 0)

    return (
      <div className="bg-white border-b border-black/5 last:border-0">
        {/* Fila principal */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Imagen */}
          <div
            className="shrink-0 rounded-xl overflow-hidden relative"
            style={{ width: 72, height: 72, backgroundColor: item.colorFondo ?? '#f0f0f0' }}
          >
            {foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt={item.nombre} className="w-full h-full object-cover" />
            )}
            {item.colorBorde && (
              <div className="absolute inset-0 rounded-xl" style={{ boxShadow: `inset 0 0 0 2px ${item.colorBorde}` }} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-black text-sm leading-tight" style={{ letterSpacing: '-0.01em' }}>
              {item.nombre}
            </p>
            {item.descripcion && (
              <p className="text-[11px] text-black/40 mt-0.5 line-clamp-2 leading-relaxed">
                {item.descripcion}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <p className="font-black text-sm" style={{ letterSpacing: '-0.02em', color: primary }}>
                {formatPrice(item.precio + extrasPrice)}
              </p>
              {item.extras.length > 0 && (
                <button
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  className="text-[10px] text-black/35 underline underline-offset-2"
                >
                  {isExpanded ? 'Cerrar' : '+ opciones'}
                </button>
              )}
            </div>
          </div>

          {/* Botón agregar */}
          <button
            onClick={() => addToCart(item, selectedExtras)}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-80 active:scale-95"
            style={{ backgroundColor: primary }}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Extras expandibles */}
        {isExpanded && item.extras.length > 0 && (
          <div className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-1.5">
              {item.extras.map(extra => {
                const checked = selectedExtras.some(e => e.id === extra.id)
                return (
                  <button
                    key={extra.id}
                    onClick={() => toggleExtra(extra)}
                    className="flex justify-between items-center px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition-all"
                    style={
                      checked
                        ? { borderColor: primary, backgroundColor: primary, color: '#fff' }
                        : { borderColor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.65)', backgroundColor: 'transparent' }
                    }
                  >
                    <span className="truncate mr-1">{extra.nombre}</span>
                    <span className="shrink-0">+{formatPrice(extra.precio)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── MAIN MENU ───────────────────────────────────────────────────────────────

  const allCategories = data.categories

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">

      {/* ── Sticky category tabs ────────────────────────────────────────────── */}
      {allCategories.length > 0 && (
        <header className="sticky top-0 z-20 bg-white border-b border-black/5">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <div
              ref={tabsRef}
              className="flex gap-1.5 overflow-x-auto flex-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {allCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id)
                    categoryRefs.current[cat.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={
                    activeCategory === cat.id
                      ? { backgroundColor: '#000', color: '#fff' }
                      : { backgroundColor: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.45)' }
                  }
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
            <button
              onClick={() => setScreen('mensaje')}
              className="shrink-0 w-8 h-8 rounded-xl border border-black/10 flex items-center justify-center hover:bg-black/5 transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-black" />
            </button>
          </div>
        </header>
      )}

      {/* ── Items grid ─────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full pb-28">

        {/* ── Tienda cerrada banner ─────────────────────────────────────────── */}
        {data.tiendaAbierta === false && (
          <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-center gap-2.5">
            <span className="text-base">🔴</span>
            <div>
              <p className="text-xs font-bold text-red-700">Tienda cerrada</p>
              <p className="text-[10px] text-red-500">Por el momento no aceptamos pedidos. Volvé más tarde.</p>
            </div>
          </div>
        )}

        {/* ── Profile hero ──────────────────────────────────────────────────── */}
        <div className="bg-white mb-4">
          {/* Cover image */}
          {data.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.coverUrl}
              alt="Portada"
              className="w-full object-cover"
              style={{ height: 180 }}
            />
          ) : (
            <div className="w-full bg-black/5" style={{ height: 100 }} />
          )}

          {/* Profile block */}
          <div className="px-5 pb-5 pt-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.logoUrl}
                  alt={data.restaurantName}
                  className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-black/8"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-xl" style={{ letterSpacing: '-0.03em' }}>
                    {data.restaurantName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-black text-black text-lg leading-tight" style={{ letterSpacing: '-0.03em' }}>
                  {data.restaurantName}
                </h1>
                {data.descripcion && (
                  <p className="text-xs text-black/45 mt-0.5 leading-relaxed line-clamp-2">
                    {data.descripcion}
                  </p>
                )}
              </div>
            </div>

            {data.whatsappNumero && (
              <a
                href={`https://wa.me/${data.whatsappNumero.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#25D366' }}
              >
                <Phone className="h-4 w-4" />
                Contactar por WhatsApp
                <span className="text-white/70 text-xs font-normal ml-1">{data.whatsappNumero}</span>
              </a>
            )}
          </div>
        </div>

        <div className="px-4">
        {allCategories.map(cat => {
          const catItems = itemsByCategory(cat.id)
          if (catItems.length === 0) return null
          return (
            <section
              key={cat.id}
              ref={el => { categoryRefs.current[cat.id] = el as HTMLDivElement | null }}
              className="pt-6"
            >
              <h2 className="font-black text-black text-base mb-3" style={{ letterSpacing: '-0.025em' }}>
                {cat.nombre}
              </h2>
              <div className="rounded-2xl overflow-hidden border border-black/[0.06] bg-white shadow-sm">
                {catItems.map(item => <ItemCard key={item.id} item={item} />)}
              </div>
            </section>
          )
        })}

        {uncategorized.length > 0 && (
          <section className="pt-6">
            <h2 className="font-black text-black text-base mb-3" style={{ letterSpacing: '-0.025em' }}>Otros</h2>
            <div className="rounded-2xl overflow-hidden border border-black/[0.06] bg-white shadow-sm">
              {uncategorized.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        {data.poweredByWaitless && (
          <p className="text-center text-[10px] text-black/20 tracking-widest uppercase mt-10 pb-2">
            Powered by WAITLESS
          </p>
        )}
        </div>{/* /px-4 */}
      </main>

      {/* ── Floating cart ──────────────────────────────────────────────────── */}
      {cartCount > 0 && data.tiendaAbierta !== false && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4">
          <button
            onClick={() => setScreen('cart')}
            className="w-full flex items-center justify-between px-5 rounded-2xl shadow-2xl shadow-black/20 text-white transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: '#000', height: '56px' }}
          >
            <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-xs font-black">
              {cartCount}
            </span>
            <span className="text-sm font-bold">Ver carrito</span>
            <span className="font-black text-sm" style={{ letterSpacing: '-0.02em' }}>{formatPrice(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
