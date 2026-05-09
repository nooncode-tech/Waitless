'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Phone, Mail, MapPin, MessageSquare, Package, Truck, ShoppingBag, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/store'

interface HistoryOrder {
  id: string; numero: number; canal: string; mesa: number | null
  items: Array<{ menuItem: { nombre: string }; cantidad: number; extras?: Array<{ nombre: string }> }>
  status: string; nombreCliente: string | null; telefono: string | null
  email: string | null; direccion: string | null; zonaReparto: string | null
  notas: string | null; cancelado: boolean; cancelReason: string | null
  cancelMotivo: string | null; subtotal: number; impuestos: number
  propina: number; total: number; paymentMethod: string | null
  paymentStatus: string | null; createdAt: string
}

const CANAL_LABELS: Record<string, string> = {
  mesa: 'Mesa', para_llevar: 'Para llevar', delivery: 'Delivery', mesero: 'Mesero',
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', apple_pay: 'Apple Pay',
}

function CanalIcon({ canal }: { canal: string }) {
  if (canal === 'delivery') return <Truck className="h-3 w-3" />
  if (canal === 'para_llevar') return <ShoppingBag className="h-3 w-3" />
  return <Package className="h-3 w-3" />
}

export function OrdersHistory() {
  const { currentUser } = useApp()
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [canal, setCanal] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const limit = 30
  const totalPages = Math.ceil(total / limit)

  const fetchHistory = useCallback(async (currentPage: number) => {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Sin sesión'); setLoading(false); return }

      const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) })
      if (q.trim()) params.set('q', q.trim())
      if (canal !== 'all') params.set('canal', canal)
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const res = await fetch(`/api/admin/orders/history?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { setError('Error al cargar historial'); setLoading(false); return }
      const json = await res.json()
      setOrders(json.orders); setTotal(json.total)
    } catch { setError('Error de conexión') } finally { setLoading(false) }
  }, [q, canal, from, to])

  useEffect(() => { setPage(1); fetchHistory(1) }, [fetchHistory])

  const goPage = (p: number) => { setPage(p); fetchHistory(p) }

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    return <p className="text-sm text-gray-400 p-4">Sin acceso</p>
  }

  return (
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      {/* Filters */}
      <form onSubmit={e => { e.preventDefault(); setPage(1); fetchHistory(1) }} className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center border border-gray-200 rounded-xl px-2.5 gap-2 h-8 bg-white">
            <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nombre, teléfono o correo..."
              className="flex-1 text-xs bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
            />
            {q && (
              <button type="button" onClick={() => setQ('')}><X className="h-3 w-3 text-gray-400" /></button>
            )}
          </div>
          <button type="submit" className="h-8 px-3 rounded-xl border border-gray-200 text-gray-700 text-xs hover:bg-gray-50">Buscar</button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={canal} onChange={e => setCanal(e.target.value)} className="h-7 rounded-xl border border-gray-200 px-2 text-xs bg-white text-gray-700">
            <option value="all">Todos los canales</option>
            <option value="mesa">Mesa</option>
            <option value="para_llevar">Para llevar</option>
            <option value="delivery">Delivery</option>
          </select>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-7 rounded-xl border border-gray-200 px-2 text-xs bg-white text-gray-700" title="Desde" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-7 rounded-xl border border-gray-200 px-2 text-xs bg-white text-gray-700" title="Hasta" />
        </div>
      </form>

      <p className="text-[11px] text-gray-400">{total} pedido{total !== 1 ? 's' : ''} completado{total !== 1 ? 's' : ''}</p>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin pedidos en el historial</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id} className="border border-gray-100 rounded-2xl bg-white p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-900">#{order.numero}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                    <CanalIcon canal={order.canal} />
                    {CANAL_LABELS[order.canal] ?? order.canal}
                    {order.mesa ? ` · Mesa ${order.mesa}` : ''}
                  </span>
                  {order.cancelado
                    ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600">Cancelado</span>
                    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-[#06C167]">Entregado</span>}
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                  {' '}
                  {new Date(order.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {(order.nombreCliente || order.telefono || order.email || order.direccion) && (
                <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-1">
                  {order.nombreCliente && <p className="text-xs font-semibold text-gray-900">{order.nombreCliente}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {order.telefono && (
                      <a href={`tel:${order.telefono}`} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900">
                        <Phone className="h-3 w-3" />{order.telefono}
                      </a>
                    )}
                    {order.email && (
                      <a href={`mailto:${order.email}`} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900">
                        <Mail className="h-3 w-3" />{order.email}
                      </a>
                    )}
                    {order.direccion && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <MapPin className="h-3 w-3" />{order.direccion}{order.zonaReparto ? ` · ${order.zonaReparto}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-0.5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-gray-900">
                      {item.cantidad}× {item.menuItem?.nombre ?? '?'}
                      {item.extras && item.extras.length > 0 && (
                        <span className="text-gray-400"> · {item.extras.map((e: { nombre: string }) => e.nombre).join(', ')}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {order.notas && (
                <div className="flex items-start gap-1.5 text-[11px] text-gray-400">
                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="italic">{order.notas}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div className="text-[11px] text-gray-400">
                  {order.paymentMethod && PAYMENT_LABELS[order.paymentMethod]
                    ? PAYMENT_LABELS[order.paymentMethod]
                    : order.paymentMethod ?? '—'}
                  {order.cancelMotivo && <span className="ml-2 text-red-500">· {order.cancelMotivo}</span>}
                </div>
                <span className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => goPage(page - 1)} className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => goPage(page + 1)} className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
