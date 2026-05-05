'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Loader2, ChevronDown, ChevronUp, Store } from 'lucide-react'
import { formatPrice } from '@/lib/store'

interface OrderItem {
  id: string
  cantidad: number
  menuItem: { nombre: string; precio: number }
  extras?: { nombre: string; precio: number }[]
  notas?: string
}

interface ConsumerOrder {
  id: string
  numero: number
  canal: string
  status: string
  total: number
  subtotal: number
  impuestos: number
  created_at: string
  items: OrderItem[]
  payment_status: string
  payment_method: string | null
  restaurant: { id: string; nombre: string; slug: string; logo_url: string | null } | null
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  recibido:   { label: 'Recibido',   color: 'text-zinc-500 bg-zinc-100' },
  preparando: { label: 'Preparando', color: 'text-amber-600 bg-amber-50' },
  listo:      { label: 'Listo',      color: 'text-blue-600 bg-blue-50' },
  entregado:  { label: 'Entregado',  color: 'text-emerald-700 bg-emerald-50' },
  cancelado:  { label: 'Cancelado',  color: 'text-red-500 bg-red-50' },
}

const CANAL_LABEL: Record<string, string> = {
  para_llevar: 'Para llevar',
  delivery:    'Delivery',
  mesa:        'En mesa',
  mesero:      'En mesa',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateGroup(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

function OrderCard({ order }: { order: ConsumerOrder }) {
  const [expanded, setExpanded] = useState(false)
  const st = STATUS_LABEL[order.status] ?? { label: order.status, color: 'text-zinc-500 bg-zinc-100' }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Restaurant avatar */}
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden">
              {order.restaurant?.logo_url ? (
                <img src={order.restaurant.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store className="h-5 w-5 text-zinc-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-zinc-900 leading-tight">
                {order.restaurant?.nombre ?? 'Restaurante'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pedido #{order.numero} · {CANAL_LABEL[order.canal] ?? order.canal}
              </p>
              <p className="text-[11px] text-zinc-400">
                {order.items.length} ítem{order.items.length !== 1 ? 's' : ''} · {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
              {st.label}
            </span>
            <p className="text-sm font-bold text-zinc-900">{formatPrice(order.total)}</p>
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
              : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-50">
          <div className="space-y-2 mt-3">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm gap-3">
                <div className="min-w-0">
                  <span className="font-medium text-zinc-700">{item.cantidad}× {item.menuItem.nombre}</span>
                  {item.extras && item.extras.length > 0 && (
                    <p className="text-[11px] text-zinc-400">+ {item.extras.map(e => e.nombre).join(', ')}</p>
                  )}
                  {item.notas && <p className="text-[11px] text-amber-600 italic">{item.notas}</p>}
                </div>
                <span className="text-zinc-500 shrink-0">
                  {formatPrice(item.menuItem.precio * item.cantidad)}
                </span>
              </div>
            ))}
          </div>
          {order.impuestos > 0 && (
            <div className="flex justify-between text-[11px] text-zinc-400 mt-3 pt-2 border-t border-zinc-100">
              <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
            </div>
          )}
          {order.impuestos > 0 && (
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>Impuestos</span><span>{formatPrice(order.impuestos)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-zinc-900 mt-1 pt-1 border-t border-zinc-100">
            <span>Total</span><span>{formatPrice(order.total)}</span>
          </div>
          {order.payment_method && (
            <p className="text-[11px] text-zinc-400 mt-1">
              Pago: {order.payment_method === 'tarjeta' ? 'Tarjeta' : order.payment_method === 'efectivo' ? 'Efectivo' : order.payment_method}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function ConsumerOrdersTab({ token }: { token: string }) {
  const [orders, setOrders] = useState<ConsumerOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/consumidor/orders', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLoading(false)
  }, [token])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
        <ShoppingBag className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
        <p className="font-bold text-zinc-700">Sin pedidos aún</p>
        <p className="text-sm text-zinc-400 mt-1">Cuando hagas tu primer pedido aparecerá aquí.</p>
      </div>
    )
  }

  // Group by date
  const groups: { label: string; orders: ConsumerOrder[] }[] = []
  for (const order of orders) {
    const label = formatDateGroup(order.created_at)
    const existing = groups.find(g => g.label === label)
    if (existing) {
      existing.orders.push(order)
    } else {
      groups.push({ label, orders: [order] })
    }
  }

  return (
    <div className="space-y-5">
      {groups.map(group => (
        <div key={group.label}>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.orders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
