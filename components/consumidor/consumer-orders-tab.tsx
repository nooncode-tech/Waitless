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

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  recibido:   { label: 'Recibido',  dot: 'bg-gray-400',  text: 'text-gray-600',  bg: 'bg-gray-100' },
  preparando: { label: 'En cocina', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  listo:      { label: 'Listo',     dot: 'bg-blue-500',  text: 'text-blue-700',  bg: 'bg-blue-50' },
  entregado:  { label: 'Entregado', dot: 'bg-[#06C167]', text: 'text-[#1A7A47]', bg: 'bg-[#E8F9F1]' },
  cancelado:  { label: 'Cancelado', dot: 'bg-red-500',   text: 'text-red-600',   bg: 'bg-red-50' },
}

const CANAL_LABEL: Record<string, string> = {
  para_llevar: 'Para llevar',
  delivery:    'Delivery',
  mesa:        'En mesa',
  mesero:      'En mesa',
}

const PAYMENT_LABEL: Record<string, string> = {
  tarjeta:           'Tarjeta',
  efectivo:          'Efectivo',
  transferencia:     'Transferencia',
  paypal:            'PayPal',
  waitless_creditos: 'Waitless Créditos',
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
  const st = STATUS_CONFIG[order.status] ?? { label: order.status, dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100' }
  const isActive = order.status === 'recibido' || order.status === 'preparando' || order.status === 'listo'

  const itemSummary = order.items
    .slice(0, 2)
    .map(i => `${i.cantidad > 1 ? `${i.cantidad}× ` : ''}${i.menuItem.nombre}`)
    .join(' · ')
  const extraCount = order.items.length > 2 ? ` · +${order.items.length - 2}` : ''

  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${isActive ? 'shadow-md ring-1 ring-black/5' : 'shadow-sm'}`}>
      {isActive && <div className="h-1 bg-black" />}

      <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
            {order.restaurant?.logo_url
              ? <img src={order.restaurant.logo_url} alt="" className="w-full h-full object-cover" />
              : <Store className="h-5 w-5 text-gray-400" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-sm text-gray-900 leading-tight">
                {order.restaurant?.nombre ?? 'Restaurante'}
              </p>
              <p className="text-sm font-black text-gray-900 shrink-0" style={{ letterSpacing: '-0.02em' }}>
                {formatPrice(order.total)}
              </p>
            </div>

            <p className="text-[12px] text-gray-500 mt-0.5 truncate">
              {itemSummary}{extraCount}
            </p>

            <div className="flex items-center justify-between mt-2">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${isActive ? 'animate-pulse' : ''}`} />
                {st.label}
              </span>
              <div className="flex items-center gap-1 text-gray-400">
                <span className="text-[11px]">{CANAL_LABEL[order.canal] ?? order.canal}</span>
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </div>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-3 mb-2.5">
            Pedido #{order.numero} · {formatDate(order.created_at)}
          </p>
          <div className="space-y-2.5">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-gray-800">{item.cantidad}× {item.menuItem.nombre}</span>
                  {item.extras && item.extras.length > 0 && (
                    <p className="text-[11px] text-gray-400">+ {item.extras.map(e => e.nombre).join(', ')}</p>
                  )}
                  {item.notas && <p className="text-[11px] text-amber-600 italic">{item.notas}</p>}
                </div>
                <span className="text-gray-500 shrink-0 text-[13px]">
                  {formatPrice(item.menuItem.precio * item.cantidad)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            {order.impuestos > 0 && (
              <>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Impuestos</span><span>{formatPrice(order.impuestos)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900">
              <span>Total</span><span>{formatPrice(order.total)}</span>
            </div>
            {order.payment_method && (
              <p className="text-[11px] text-gray-400 pt-0.5">
                Pagado con {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
              </p>
            )}
          </div>
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
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="h-8 w-8 text-gray-300" />
        </div>
        <p className="font-bold text-gray-900">Sin pedidos aún</p>
        <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
          Cuando hagas tu primer pedido aparecerá aquí.
        </p>
      </div>
    )
  }

  const groups: { label: string; orders: ConsumerOrder[] }[] = []
  for (const order of orders) {
    const label = formatDateGroup(order.created_at)
    const existing = groups.find(g => g.label === label)
    if (existing) existing.orders.push(order)
    else groups.push({ label, orders: [order] })
  }

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.label}>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
            {group.label}
          </p>
          <div className="space-y-3">
            {group.orders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
