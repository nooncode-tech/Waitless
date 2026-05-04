'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Phone, Mail, MapPin, MessageSquare, Package, Truck, ShoppingBag, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/store'

interface HistoryOrder {
  id: string
  numero: number
  canal: string
  mesa: number | null
  items: Array<{ menuItem: { nombre: string }; cantidad: number; extras?: Array<{ nombre: string }> }>
  status: string
  nombreCliente: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  zonaReparto: string | null
  notas: string | null
  cancelado: boolean
  cancelReason: string | null
  cancelMotivo: string | null
  subtotal: number
  impuestos: number
  propina: number
  total: number
  paymentMethod: string | null
  paymentStatus: string | null
  createdAt: string
}

const CANAL_LABELS: Record<string, string> = {
  mesa: 'Mesa',
  para_llevar: 'Para llevar',
  delivery: 'Delivery',
  mesero: 'Mesero',
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  apple_pay: 'Apple Pay',
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
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Sin sesión'); setLoading(false); return }

      const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) })
      if (q.trim()) params.set('q', q.trim())
      if (canal !== 'all') params.set('canal', canal)
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const res = await fetch(`/api/admin/orders/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { setError('Error al cargar historial'); setLoading(false); return }
      const json = await res.json()
      setOrders(json.orders)
      setTotal(json.total)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [q, canal, from, to])

  useEffect(() => {
    setPage(1)
    fetchHistory(1)
  }, [fetchHistory])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchHistory(1)
  }

  const goPage = (p: number) => {
    setPage(p)
    fetchHistory(p)
  }

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    return <p className="text-sm text-muted-foreground p-4">Sin acceso</p>
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <form onSubmit={handleSearch} className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center border border-border rounded-lg px-2.5 gap-2 h-8">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nombre, teléfono o correo..."
              className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {q && (
              <button type="button" onClick={() => setQ('')}>
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button type="submit" size="xs" variant="outline">Buscar</Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={canal}
            onChange={e => setCanal(e.target.value)}
            className="h-7 rounded-lg border border-border px-2 text-xs bg-background text-foreground"
          >
            <option value="all">Todos los canales</option>
            <option value="mesa">Mesa</option>
            <option value="para_llevar">Para llevar</option>
            <option value="delivery">Delivery</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="h-7 rounded-lg border border-border px-2 text-xs bg-background text-foreground"
            title="Desde"
          />
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="h-7 rounded-lg border border-border px-2 text-xs bg-background text-foreground"
            title="Hasta"
          />
        </div>
      </form>

      {/* Conteo */}
      <p className="text-[11px] text-muted-foreground">
        {total} pedido{total !== 1 ? 's' : ''} completado{total !== 1 ? 's' : ''}
      </p>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin pedidos en el historial</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id} className="border border-border rounded-xl p-3 space-y-2.5">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">#{order.numero}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 flex items-center gap-1">
                    <CanalIcon canal={order.canal} />
                    {CANAL_LABELS[order.canal] ?? order.canal}
                    {order.mesa ? ` · Mesa ${order.mesa}` : ''}
                  </Badge>
                  {order.cancelado ? (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Cancelado</Badge>
                  ) : (
                    <Badge className="text-[10px] h-4 px-1.5 bg-green-100 text-green-800 border-0">Entregado</Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                  {' '}
                  {new Date(order.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Datos del cliente */}
              {(order.nombreCliente || order.telefono || order.email || order.direccion) && (
                <div className="bg-muted/40 rounded-lg px-3 py-2 space-y-1">
                  {order.nombreCliente && (
                    <p className="text-xs font-semibold text-foreground">{order.nombreCliente}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {order.telefono && (
                      <a href={`tel:${order.telefono}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                        <Phone className="h-3 w-3" />{order.telefono}
                      </a>
                    )}
                    {order.email && (
                      <a href={`mailto:${order.email}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                        <Mail className="h-3 w-3" />{order.email}
                      </a>
                    )}
                    {order.direccion && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />{order.direccion}{order.zonaReparto ? ` · ${order.zonaReparto}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-0.5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-foreground">
                      {item.cantidad}× {item.menuItem?.nombre ?? '?'}
                      {item.extras && item.extras.length > 0 && (
                        <span className="text-muted-foreground"> · {item.extras.map((e: { nombre: string }) => e.nombre).join(', ')}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Notas */}
              {order.notas && (
                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="italic">{order.notas}</span>
                </div>
              )}

              {/* Footer: total y pago */}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <div className="text-[11px] text-muted-foreground">
                  {order.paymentMethod && PAYMENT_LABELS[order.paymentMethod]
                    ? PAYMENT_LABELS[order.paymentMethod]
                    : order.paymentMethod ?? '—'}
                  {order.cancelMotivo && (
                    <span className="ml-2 text-destructive">· {order.cancelMotivo}</span>
                  )}
                </div>
                <span className="text-sm font-bold text-foreground">{formatPrice(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => goPage(page + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
