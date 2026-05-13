'use client'

import { useState } from 'react'
import { Check, Clock, Package, MapPin, Phone, Truck, ShoppingBag, AlertCircle, User, Copy, ChevronDown } from 'lucide-react'
import { useApp } from '@/lib/context'
import { formatPrice, getChannelLabel, getStatusLabel, getTimeDiff } from '@/lib/store'
import { notifyConsumerDelivery } from '@/lib/push-triggers'

export function DeliveryBoard() {
  const { orders, users, updateOrderStatus, assignRepartidor } = useApp()
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedRepartidor, setSelectedRepartidor] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyTrackingLink = (orderId: string) => {
    const url = `${window.location.origin}/tracking/${orderId}`
    navigator.clipboard.writeText(url)
    setCopiedId(orderId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deliveryStaff = users.filter(u =>
    u.activo && (u.role === 'repartidor' || u.role === 'mesero' || u.role === 'manager')
  )

  const pendingOrders = orders.filter(o =>
    o.status !== 'entregado' &&
    (o.canal === 'mesa' || o.canal === 'para_llevar' || o.canal === 'delivery' || o.canal === 'mesero')
  ).sort((a, b) => {
    if (a.status === 'listo' && b.status !== 'listo') return -1
    if (b.status === 'listo' && a.status !== 'listo') return 1
    if (a.status === 'en_camino' && b.status !== 'en_camino') return -1
    if (b.status === 'en_camino' && a.status !== 'en_camino') return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const handleMarkDelivered = (orderId: string) => {
    updateOrderStatus(orderId, 'entregado')
    notifyConsumerDelivery(orderId, 'entregado')
  }
  const handleMarkEnCamino = (orderId: string) => {
    updateOrderStatus(orderId, 'en_camino')
    notifyConsumerDelivery(orderId, 'en_camino')
  }

  const handleConfirmRepartidor = (orderId: string) => {
    if (!selectedRepartidor) return
    assignRepartidor(orderId, selectedRepartidor)
    handleMarkEnCamino(orderId)
    setAssigningId(null)
    setSelectedRepartidor('')
  }

  const readyCount    = pendingOrders.filter(o => o.status === 'listo').length
  const preparingCount = pendingOrders.filter(o => o.status === 'preparando').length
  const enCaminoCount = pendingOrders.filter(o => o.status === 'en_camino').length

  return (
    <div className="p-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-2 text-center">
          <p className="text-xl font-bold text-[#06C167]">{readyCount}</p>
          <p className="text-[9px] text-[#06C167] font-medium">Listos</p>
        </div>
        <div className="border border-gray-200 bg-gray-50 rounded-2xl p-2 text-center">
          <p className="text-xl font-bold text-gray-900">{enCaminoCount}</p>
          <p className="text-[9px] text-gray-500 font-medium">En camino</p>
        </div>
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-2 text-center">
          <p className="text-xl font-bold text-amber-600">{preparingCount}</p>
          <p className="text-[9px] text-amber-600 font-medium">Preparando</p>
        </div>
        <div className="border border-gray-200 bg-white rounded-2xl p-2 text-center">
          <p className="text-xl font-bold text-gray-900">{pendingOrders.length}</p>
          <p className="text-[9px] text-gray-500 font-medium">Total</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-gray-900">Tablero de entregas</h3>

        {pendingOrders.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl py-10 text-center">
            <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Sin órdenes pendientes</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {pendingOrders.map((order) => {
              const isReady    = order.status === 'listo'
              const isEnCamino = order.status === 'en_camino'
              const allKitchensReady = order.cocinaStatus === 'listo'
              const isDelivery = order.canal === 'delivery'
              const isAssigning = assigningId === order.id
              const repartidorUser = order.repartidorId
                ? users.find(u => u.id === order.repartidorId)
                : null

              const total = order.items.reduce((sum, item) => {
                const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
              }, 0)

              return (
                <div
                  key={order.id}
                  className={`border rounded-2xl transition-all ${
                    isReady    ? 'border-emerald-200 bg-emerald-50/50' :
                    isEnCamino ? 'border-gray-300 bg-gray-50' :
                    'border-gray-200 bg-white'
                  }`}
                >
                  <div className="p-3 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">#{order.numero}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center text-[10px] h-4 px-1.5 rounded-full border font-medium ${
                            order.canal === 'delivery'    ? 'border-gray-300 text-gray-500' :
                            order.canal === 'para_llevar' ? 'border-amber-300 text-amber-600' :
                            'border-gray-200 text-gray-400'
                          }`}>
                            {order.canal === 'delivery'    && <Truck       className="h-2.5 w-2.5 mr-0.5" />}
                            {order.canal === 'para_llevar' && <ShoppingBag className="h-2.5 w-2.5 mr-0.5" />}
                            {getChannelLabel(order.canal)}
                          </span>
                          {order.mesa && (
                            <span className="text-[10px] text-gray-400">Mesa {order.mesa}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center text-[10px] h-5 px-1.5 rounded-full font-semibold ${
                          isReady    ? 'bg-[#06C167] text-white' :
                          isEnCamino ? 'bg-gray-900 text-white' :
                          order.status === 'preparando' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {isEnCamino ? 'En camino' : getStatusLabel(order.status)}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-end gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {getTimeDiff(order.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pb-3">
                    {/* Customer Info */}
                    {(isDelivery || order.canal === 'para_llevar') && order.nombreCliente && (
                      <div className="mb-2 p-2 bg-gray-50 rounded-xl text-xs">
                        <p className="font-semibold text-gray-900">{order.nombreCliente}</p>
                        {order.telefono && (
                          <p className="text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5" />{order.telefono}
                          </p>
                        )}
                        {order.direccion && (
                          <p className="text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5" />{order.direccion}
                          </p>
                        )}
                        {order.zonaReparto && (
                          <span className="mt-1 inline-block text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                            {order.zonaReparto}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Repartidor asignado */}
                    {isEnCamino && repartidorUser && (
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] text-gray-500">
                        <User className="h-3 w-3 shrink-0" />
                        <span>{repartidorUser.nombre}</span>
                      </div>
                    )}

                    {/* Items */}
                    <ul className="space-y-0.5 mb-2">
                      {order.items.map(item => (
                        <li key={item.id} className="text-xs text-gray-700">
                          {item.cantidad}x {item.menuItem.nombre}
                        </li>
                      ))}
                    </ul>

                    {/* Total */}
                    <div className="flex justify-between text-xs mb-2 pt-1 border-t border-gray-100">
                      <span className="text-gray-400">Total</span>
                      <span className="font-semibold text-gray-900">{formatPrice(total)}</span>
                    </div>

                    {/* Kitchen Status */}
                    {!isEnCamino && (
                      <div className="flex gap-1 text-[10px] mb-2">
                        <span className={`px-1.5 py-0.5 rounded-lg ${
                          order.cocinaStatus === 'listo'      ? 'bg-emerald-50 text-[#06C167]' :
                          order.cocinaStatus === 'preparando' ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          Cocina: {order.cocinaStatus === 'listo' ? 'Listo' :
                                   order.cocinaStatus === 'preparando' ? 'Prep.' : 'Cola'}
                        </span>
                        {!allKitchensReady && (
                          <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                            <AlertCircle className="h-2.5 w-2.5" />Esperando
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {allKitchensReady && isReady && !isAssigning && (
                      <div className="flex gap-1">
                        {isDelivery ? (
                          <button
                            className="flex-1 h-8 text-xs rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center gap-1 active:opacity-80"
                            onClick={() => { setAssigningId(order.id); setSelectedRepartidor('') }}
                          >
                            <Truck className="h-3 w-3" />En camino
                          </button>
                        ) : (
                          <button
                            className="w-full h-8 text-xs rounded-xl bg-[#06C167] text-white font-semibold flex items-center justify-center gap-1 active:opacity-80"
                            onClick={() => handleMarkDelivered(order.id)}
                          >
                            <Check className="h-3 w-3" />
                            {order.canal === 'para_llevar' ? 'Entregar' : 'Entregado'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Assign repartidor panel */}
                    {isAssigning && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          Asignar repartidor
                        </p>
                        <div className="relative">
                          <select
                            className="w-full h-8 text-xs rounded-xl border border-gray-200 bg-white px-2 pr-7 appearance-none text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                            value={selectedRepartidor}
                            onChange={e => setSelectedRepartidor(e.target.value)}
                          >
                            <option value="">Seleccioná quién lleva</option>
                            {deliveryStaff.map(u => (
                              <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="flex-1 h-8 text-xs rounded-xl border border-gray-200 text-gray-700 font-medium active:bg-gray-50"
                            onClick={() => { setAssigningId(null); setSelectedRepartidor('') }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="flex-1 h-8 text-xs rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center gap-1 disabled:opacity-40 active:opacity-80"
                            disabled={!selectedRepartidor}
                            onClick={() => handleConfirmRepartidor(order.id)}
                          >
                            <Truck className="h-3 w-3" />Salir
                          </button>
                        </div>
                      </div>
                    )}

                    {isEnCamino && (
                      <div className="space-y-1.5">
                        {isDelivery && (
                          <button
                            onClick={() => copyTrackingLink(order.id)}
                            className="w-full flex items-center justify-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-700 border border-dashed border-gray-200 rounded-xl py-1.5 transition-colors"
                          >
                            {copiedId === order.id
                              ? <><Check className="h-3 w-3 text-[#06C167]" /><span className="text-[#06C167]">Link copiado</span></>
                              : <><Copy className="h-3 w-3" />Copiar link de tracking</>
                            }
                          </button>
                        )}
                        <button
                          className="w-full h-8 text-xs rounded-xl bg-[#06C167] text-white font-semibold flex items-center justify-center gap-1 active:opacity-80"
                          onClick={() => handleMarkDelivered(order.id)}
                        >
                          <Check className="h-3 w-3" />Entregado
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
