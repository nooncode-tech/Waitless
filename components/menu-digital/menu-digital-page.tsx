'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingCart, X, Plus, Minus, MessageCircle, ChevronRight, Check, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

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
  metodosPago: { efectivo: boolean; tarjeta: boolean; transferencia: boolean }
  categories: Category[]
  items: MenuItem[]
  tenantId: string | null
}

interface CartEntry {
  item: MenuItem
  cantidad: number
  selectedExtras: MenuExtra[]
}

type Screen = 'menu' | 'cart' | 'checkout' | 'success' | 'mensaje'

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

  // Checkout form
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [metodoPago, setMetodoPago] = useState<string>('')
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Mensaje form
  const [msgNombre, setMsgNombre] = useState('')
  const [msgTelefono, setMsgTelefono] = useState('')
  const [msgTexto, setMsgTexto] = useState('')
  const [msgSent, setMsgSent] = useState(false)
  const [msgSubmitting, setMsgSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/public/${slug}/menu`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
        if (d.categories.length > 0) setActiveCategory(d.categories[0].id)
        const metodos = d.metodosPago
        if (metodos.efectivo) setMetodoPago('efectivo')
        else if (metodos.tarjeta) setMetodoPago('tarjeta')
        else if (metodos.transferencia) setMetodoPago('transferencia')
      })
      .catch(() => setError('No se pudo cargar el menú'))
      .finally(() => setLoading(false))
  }, [slug])

  // ─── Cart helpers ───────────────────────────────────────────────────────────

  const cartTotal = cart.reduce((sum, e) => {
    const extrasTotal = e.selectedExtras.reduce((s, ex) => s + ex.precio, 0)
    return sum + (e.item.precio + extrasTotal) * e.cantidad
  }, 0)

  const cartCount = cart.reduce((sum, e) => sum + e.cantidad, 0)

  const addToCart = (item: MenuItem, extras: MenuExtra[] = []) => {
    setCart(prev => {
      const key = item.id + extras.map(e => e.id).sort().join(',')
      const existing = prev.find(e => e.item.id === item.id && e.selectedExtras.map(x => x.id).sort().join(',') === extras.map(e => e.id).sort().join(','))
      if (existing) {
        return prev.map(e => e === existing ? { ...e, cantidad: e.cantidad + 1 } : e)
      }
      return [...prev, { item, cantidad: 1, selectedExtras: extras }]
    })
    setExpandedItem(null)
  }

  const changeQty = (index: number, delta: number) => {
    setCart(prev => {
      const next = [...prev]
      next[index] = { ...next[index], cantidad: next[index].cantidad + delta }
      return next.filter(e => e.cantidad > 0)
    })
  }

  // ─── Submit order ───────────────────────────────────────────────────────────

  const handleOrder = async () => {
    if (!metodoPago) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/${slug}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(e => ({
            itemId: e.item.id,
            cantidad: e.cantidad,
            extras: e.selectedExtras,
            notas: undefined,
          })),
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
      alert('Error al enviar el pedido. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Submit mensaje ─────────────────────────────────────────────────────────

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
      alert('Error al enviar. Intenta de nuevo.')
    } finally {
      setMsgSubmitting(false)
    }
  }

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6 text-center">
        <div>
          <p className="text-2xl mb-2">🍽️</p>
          <p className="font-semibold text-gray-800">Menú no disponible</p>
          <p className="text-sm text-gray-500 mt-1">{error ?? 'No se encontró este restaurante.'}</p>
        </div>
      </div>
    )
  }

  const primary = data.primaryColor
  const itemsByCategory = (catId: string | null) =>
    data.items.filter(i => i.categoriaId === catId)
  const uncategorized = data.items.filter(i => !i.categoriaId)

  // ─── SUCCESS SCREEN ─────────────────────────────────────────────────────────

  if (screen === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: primary }}>
          <Check className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">¡Pedido recibido!</h1>
        <p className="text-4xl font-bold mb-2" style={{ color: primary }}>#{orderNum}</p>
        <p className="text-sm text-gray-500 mb-6">Tu pedido está siendo preparado.</p>
        {data.whatsappNumero && (
          <a
            href={`https://wa.me/${data.whatsappNumero.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-white px-4 py-2 rounded-lg mb-4"
            style={{ backgroundColor: '#25D366' }}
          >
            <Phone className="h-4 w-4" />
            Contactar por WhatsApp
          </a>
        )}
        <Button
          variant="outline"
          onClick={() => { setScreen('menu'); setNombre(''); setTelefono(''); setNotas('') }}
          className="text-sm"
        >
          Volver al menú
        </Button>
      </div>
    )
  }

  // ─── MENSAJE SCREEN ─────────────────────────────────────────────────────────

  if (screen === 'mensaje') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button onClick={() => setScreen('menu')} className="p-1">
            <X className="h-5 w-5 text-gray-500" />
          </button>
          <h2 className="font-semibold text-gray-900">Enviar mensaje</h2>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {msgSent ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
              <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: primary }}>
                <Check className="h-7 w-7 text-white" />
              </div>
              <p className="font-semibold text-gray-900">Mensaje enviado</p>
              <p className="text-sm text-gray-500">El restaurante lo recibirá pronto.</p>
              <Button variant="outline" onClick={() => setScreen('menu')} className="mt-2 text-sm">
                Volver al menú
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs text-gray-600">Tu nombre (opcional)</Label>
                <Input value={msgNombre} onChange={e => setMsgNombre(e.target.value)} placeholder="Ej: Carlos" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Teléfono (opcional)</Label>
                <Input value={msgTelefono} onChange={e => setMsgTelefono(e.target.value)} placeholder="+52 55 0000 0000" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Mensaje *</Label>
                <Textarea
                  value={msgTexto}
                  onChange={e => setMsgTexto(e.target.value)}
                  placeholder="Escribe tu mensaje al restaurante..."
                  rows={5}
                  className="mt-1 text-sm"
                  maxLength={1000}
                />
                <p className="text-[10px] text-gray-400 mt-0.5 text-right">{msgTexto.length}/1000</p>
              </div>
              <Button
                className="w-full text-white"
                style={{ backgroundColor: primary }}
                disabled={!msgTexto.trim() || msgSubmitting}
                onClick={handleMensaje}
              >
                {msgSubmitting ? 'Enviando...' : 'Enviar mensaje'}
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── CHECKOUT SCREEN ────────────────────────────────────────────────────────

  if (screen === 'checkout') {
    const metodos = Object.entries(data.metodosPago)
      .filter(([, v]) => v)
      .map(([k]) => k)

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <button onClick={() => setScreen('cart')} className="p-1">
            <X className="h-5 w-5 text-gray-500" />
          </button>
          <h2 className="font-semibold text-gray-900">Confirmar pedido</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {/* Resumen */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tu pedido</p>
            {cart.map((entry, i) => {
              const extrasTotal = entry.selectedExtras.reduce((s, e) => s + e.precio, 0)
              return (
                <div key={i} className="flex justify-between text-sm text-gray-700">
                  <span>{entry.cantidad}× {entry.item.nombre}{entry.selectedExtras.length > 0 && ` + ${entry.selectedExtras.map(e => e.nombre).join(', ')}`}</span>
                  <span>${((entry.item.precio + extrasTotal) * entry.cantidad).toFixed(2)}</span>
                </div>
              )
            })}
            <div className="border-t border-gray-200 pt-1.5 mt-1.5 flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Datos cliente */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tus datos (opcional)</p>
            <div>
              <Label className="text-xs text-gray-600">Nombre</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María García" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Teléfono</Label>
              <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+52 55 0000 0000" className="mt-1 h-9 text-sm" />
            </div>
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {metodos.map(m => (
                <button
                  key={m}
                  onClick={() => setMetodoPago(m)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${metodoPago === m ? 'border-current text-white' : 'border-gray-200 text-gray-600 bg-white'}`}
                  style={metodoPago === m ? { borderColor: primary, backgroundColor: primary } : {}}
                >
                  {m === 'efectivo' ? '💵 Efectivo' : m === 'tarjeta' ? '💳 Tarjeta' : '🔁 Transfer.'}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-xs text-gray-600">Notas del pedido (opcional)</Label>
            <Textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Alergias, instrucciones especiales..."
              rows={3}
              className="mt-1 text-sm"
              maxLength={500}
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <Button
            className="w-full h-12 text-base font-semibold text-white rounded-xl"
            style={{ backgroundColor: primary }}
            disabled={!metodoPago || submitting}
            onClick={handleOrder}
          >
            {submitting ? 'Enviando...' : `Hacer pedido · $${cartTotal.toFixed(2)}`}
          </Button>
        </div>
      </div>
    )
  }

  // ─── CART SCREEN ────────────────────────────────────────────────────────────

  if (screen === 'cart') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <button onClick={() => setScreen('menu')} className="p-1">
            <X className="h-5 w-5 text-gray-500" />
          </button>
          <h2 className="font-semibold text-gray-900">Tu carrito</h2>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
            <ShoppingCart className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500 text-sm">Tu carrito está vacío</p>
            <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="mt-2">
              Ver menú
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pb-36">
              {cart.map((entry, i) => {
                const extrasTotal = entry.selectedExtras.reduce((s, e) => s + e.precio, 0)
                const lineTotal = (entry.item.precio + extrasTotal) * entry.cantidad
                return (
                  <div key={i} className="px-4 py-3 flex gap-3">
                    {(entry.item.imagenes[0] ?? entry.item.imagen) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.item.imagenes[0] ?? entry.item.imagen!}
                        alt={entry.item.nombre}
                        className="w-16 h-16 object-cover rounded-lg shrink-0"
                        style={{ backgroundColor: entry.item.colorFondo ?? undefined }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{entry.item.nombre}</p>
                      {entry.selectedExtras.length > 0 && (
                        <p className="text-[11px] text-gray-400">{entry.selectedExtras.map(e => e.nombre).join(', ')}</p>
                      )}
                      <p className="text-sm font-semibold text-gray-700 mt-0.5">${lineTotal.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(i, -1)} className="h-7 w-7 rounded-full border border-gray-200 flex items-center justify-center">
                        <Minus className="h-3 w-3 text-gray-600" />
                      </button>
                      <span className="text-sm font-semibold w-4 text-center">{entry.cantidad}</span>
                      <button onClick={() => changeQty(i, 1)} className="h-7 w-7 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primary }}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm font-semibold text-gray-800 mb-1">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full h-12 text-base font-semibold text-white rounded-xl flex items-center justify-center gap-2"
                style={{ backgroundColor: primary }}
                onClick={() => setScreen('checkout')}
              >
                Continuar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ─── MAIN MENU SCREEN ────────────────────────────────────────────────────────

  const allCategories = data.categories
  const ItemCard = ({ item }: { item: MenuItem }) => {
    const isExpanded = expandedItem === item.id
    const [selectedExtras, setSelectedExtras] = useState<MenuExtra[]>([])
    const foto = item.imagenes[0] ?? item.imagen

    const toggleExtra = (extra: MenuExtra) => {
      setSelectedExtras(prev =>
        prev.some(e => e.id === extra.id)
          ? prev.filter(e => e.id !== extra.id)
          : [...prev, extra]
      )
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {foto && (
          <div
            className="w-full h-44 overflow-hidden"
            style={{
              backgroundColor: item.colorFondo ?? '#f9fafb',
              borderBottom: item.colorBorde ? `2px solid ${item.colorBorde}` : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt={item.nombre} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{item.nombre}</p>
              {item.descripcion && (
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{item.descripcion}</p>
              )}
            </div>
            <p className="font-bold text-sm shrink-0" style={{ color: primary }}>
              ${item.precio.toFixed(2)}
            </p>
          </div>

          {isExpanded && item.extras.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1.5">Extras</p>
              <div className="space-y-1">
                {item.extras.map(extra => {
                  const checked = selectedExtras.some(e => e.id === extra.id)
                  return (
                    <button
                      key={extra.id}
                      onClick={() => toggleExtra(extra)}
                      className={`w-full flex justify-between items-center px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${checked ? 'border-current text-white' : 'border-gray-200 text-gray-700 bg-white'}`}
                      style={checked ? { borderColor: primary, backgroundColor: primary } : {}}
                    >
                      <span>{extra.nombre}</span>
                      <span>+${extra.precio.toFixed(2)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-2.5 flex gap-2">
            {item.extras.length > 0 && (
              <button
                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {isExpanded ? 'Cerrar' : 'Personalizar'}
              </button>
            )}
            <button
              onClick={() => addToCart(item, selectedExtras)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-1"
              style={{ backgroundColor: primary }}
            >
              <Plus className="h-3 w-3" />
              Agregar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {data.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-cover shrink-0" />
            )}
            <h1 className="font-bold text-gray-900 text-sm truncate">{data.restaurantName}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {data.whatsappNumero && (
              <a
                href={`https://wa.me/${data.whatsappNumero.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: '#25D366' }}
              >
                <Phone className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            )}
            <button
              onClick={() => setScreen('mensaje')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Mensaje
            </button>
          </div>
        </div>

        {/* Category tabs */}
        {allCategories.length > 0 && (
          <div className="max-w-2xl mx-auto overflow-x-auto flex gap-1 px-4 pb-2.5 scrollbar-hide">
            {allCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  categoryRefs.current[cat.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeCategory === cat.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={activeCategory === cat.id ? { backgroundColor: primary } : {}}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Items ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-28 space-y-6">
        {allCategories.map(cat => {
          const catItems = itemsByCategory(cat.id)
          if (catItems.length === 0) return null
          return (
            <section
              key={cat.id}
              ref={el => { categoryRefs.current[cat.id] = el as HTMLDivElement | null }}
            >
              <h2 className="font-bold text-gray-800 text-sm mb-3 sticky top-[105px] bg-gray-50 py-1 z-10">{cat.nombre}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                {catItems.map(item => <ItemCard key={item.id} item={item} />)}
              </div>
            </section>
          )
        })}

        {uncategorized.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-800 text-sm mb-3">Otros</h2>
            <div className="grid grid-cols-2 gap-3">
              {uncategorized.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        {data.poweredByWaitless && (
          <p className="text-center text-[10px] text-gray-400 pt-2">
            Menú digital por <span className="font-semibold">WAITLESS</span>
          </p>
        )}
      </main>

      {/* ── Floating cart button ────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4">
          <button
            onClick={() => setScreen('cart')}
            className="w-full max-w-sm flex items-center justify-between px-4 py-3.5 rounded-2xl shadow-lg text-white"
            style={{ backgroundColor: primary }}
          >
            <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold">
              {cartCount}
            </div>
            <span className="font-semibold text-sm">Ver carrito</span>
            <span className="font-bold text-sm">${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
