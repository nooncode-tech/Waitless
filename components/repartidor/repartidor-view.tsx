'use client'

import { useState } from 'react'
import { Check, Clock, MapPin, Phone, Package, Truck, LogOut } from 'lucide-react'
import { useApp } from '@/lib/context'
import { formatPrice, getTimeDiff } from '@/lib/store'
import { notifyConsumerDelivery } from '@/lib/push-triggers'

interface RepartidorViewProps {
  onBack: () => void
}

export function RepartidorView({ onBack }: RepartidorViewProps) {
  const { orders, currentUser, updateOrderStatus } = useApp()
  const [tab, setTab] = useState<'pendiente' | 'completado'>('pendiente')

  if (!currentUser) return null

  // Only show orders assigned to this repartidor
  const myOrders = orders.filter(
    o => o.canal === 'delivery' && o.repartidorId === currentUser.id
  )

  const pendingOrders = myOrders.filter(
    o => o.status !== 'entregado' && o.status !== 'cancelado'
  ).sort((a, b) => {
    if (a.status === 'en_camino' && b.status !== 'en_camino') return -1
    if (b.status === 'en_camino' && a.status !== 'en_camino') return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const completedOrders = myOrders.filter(o => o.status === 'entregado')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 20)

  const activeList = tab === 'pendiente' ? pendingOrders : completedOrders

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-['Sora',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-safe-top pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Repartidor</p>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{currentUser.nombre}</h1>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs">Salir</span>
          </button>
        </div>

        {/* Summary strip */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{pendingOrders.length}</p>
            <p className="text-[10px] text-gray-400 font-medium">Pendientes</p>
          </div>
          <div className="flex-1 bg-emerald-50 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-[#06C167]">{completedOrders.length}</p>
            <p className="text-[10px] text-[#06C167] font-medium">Entregados hoy</p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">
              {pendingOrders.filter(o => o.status === 'en_camino').length}
            </p>
            <p className="text-[10px] text-gray-400 font-medium">En camino</p>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex">
          <button
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'pendiente'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400'
            }`}
            onClick={() => setTab('pendiente')}
          >
            Activos
            {pendingOrders.length > 0 && (
              <span className="ml-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'completado'
                ? 'border-[#06C167] text-[#06C167]'
                : 'border-transparent text-gray-400'
            }`}
            onClick={() => setTab('completado')}
          >
            Completados
          </button>
        </div>
      </div>

      {/* Order list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {activeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">
              {tab === 'pendiente'
                ? 'Sin entregas asignadas por ahora'
                : 'Aún no hay entregas completadas hoy'}
            </p>
          </div>
        ) : (
          activeList.map(order => {
            const isEnCamino = order.status === 'en_camino'
            const isListo    = order.status === 'listo'
            const isDone     = order.status === 'entregado'

            const total = order.items.reduce((sum, item) => {
              const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
              return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
            }, 0)

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border overflow-hidden ${
                  isDone     ? 'border-emerald-100 opacity-70' :
                  isEnCamino ? 'border-gray-900 shadow-sm' :
                  isListo    ? 'border-emerald-200' :
                  'border-gray-200'
                }`}
              >
                {/* Card header */}
                <div className={`px-4 py-3 flex items-center justify-between ${
                  isEnCamino ? 'bg-gray-900' : isListo ? 'bg-emerald-50' : 'bg-white'
                }`}>
                  <div className="flex items-center gap-2">
                    <Truck className={`h-4 w-4 ${
                      isEnCamino ? 'text-white' : isListo ? 'text-[#06C167]' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-bold ${
                      isEnCamino ? 'text-white' : 'text-gray-900'
                    }`}>
                      Pedido #{order.numero}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] flex items-center gap-0.5 ${
                      isEnCamino ? 'text-gray-300' : 'text-gray-400'
                    }`}>
                      <Clock className="h-3 w-3" />
                      {getTimeDiff(order.createdAt)}
                    </span>
                    {isDone && (
                      <span className="text-[10px] bg-emerald-100 text-[#06C167] font-semibold px-2 py-0.5 rounded-full">
                        Entregado
                      </span>
                    )}
                    {isEnCamino && (
                      <span className="text-[10px] bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full">
                        En camino
                      </span>
                    )}
                    {isListo && (
                      <span className="text-[10px] bg-[#06C167] text-white font-semibold px-2 py-0.5 rounded-full">
                        Listo
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {/* Customer info */}
                  {order.nombreCliente && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-gray-900">{order.nombreCliente}</p>
                      {order.telefono && (
                        <a
                          href={`tel:${order.telefono}`}
                          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {order.telefono}
                        </a>
                      )}
                      {order.direccion && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(order.direccion)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 text-sm text-gray-500 hover:text-gray-900"
                        >
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{order.direccion}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div className="border-t border-gray-50 pt-2">
                    <ul className="space-y-1">
                      {order.items.map(item => (
                        <li key={item.id} className="flex justify-between text-xs text-gray-600">
                          <span>{item.cantidad}× {item.menuItem.nombre}</span>
                          <span className="text-gray-400">{formatPrice(item.menuItem.precio * item.cantidad)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between text-sm font-semibold text-gray-900 mt-2 pt-2 border-t border-gray-50">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isDone && (
                    <div className="space-y-2">
                      {isListo && (
                        <button
                          onClick={() => {
                            updateOrderStatus(order.id, 'en_camino')
                            notifyConsumerDelivery(order.id, 'en_camino')
                          }}
                          className="w-full h-11 rounded-2xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80"
                        >
                          <Truck className="h-4 w-4" />
                          Salir a entregar
                        </button>
                      )}
                      {isEnCamino && (
                        <button
                          onClick={() => {
                            updateOrderStatus(order.id, 'entregado')
                            notifyConsumerDelivery(order.id, 'entregado')
                          }}
                          className="w-full h-11 rounded-2xl bg-[#06C167] text-white text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80"
                        >
                          <Check className="h-4 w-4" />
                          Marcar como entregado
                        </button>
                      )}
                      {order.status !== 'listo' && order.status !== 'en_camino' && (
                        <div className="text-center py-2">
                          <p className="text-xs text-gray-400">
                            Esperando que cocina marque el pedido como listo
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
