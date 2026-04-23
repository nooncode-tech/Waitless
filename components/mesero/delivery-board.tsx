'use client'

import { Check, Clock, Package, MapPin, Phone, Truck, ShoppingBag, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatTime, getChannelLabel, getStatusLabel, getTimeDiff, type OrderStatus } from '@/lib/store'

export function DeliveryBoard() {
  const { orders, updateOrderStatus } = useApp()

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

  const handleMarkDelivered = (orderId: string) => updateOrderStatus(orderId, 'entregado')
  const handleMarkEnCamino = (orderId: string) => updateOrderStatus(orderId, 'en_camino')

  const readyCount = pendingOrders.filter(o => o.status === 'listo').length
  const preparingCount = pendingOrders.filter(o => o.status === 'preparando').length
  const enCaminoCount = pendingOrders.filter(o => o.status === 'en_camino').length

  return (
    <div className="p-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="border border-[#16A34A]/20 bg-[#F0FDF4] rounded-xl p-2 text-center">
          <p className="text-xl font-bold text-[#16A34A]">{readyCount}</p>
          <p className="text-[9px] text-[#16A34A]">Listos</p>
        </div>
        <div className="border border-[#E5E5E5] bg-[#F2F2F2] rounded-xl p-2 text-center">
          <p className="text-xl font-bold text-black">{enCaminoCount}</p>
          <p className="text-[9px] text-[#6B6B6B]">En camino</p>
        </div>
        <div className="border border-[#D97706]/20 bg-[#FFFBEB] rounded-xl p-2 text-center">
          <p className="text-xl font-bold text-[#D97706]">{preparingCount}</p>
          <p className="text-[9px] text-[#D97706]">Preparando</p>
        </div>
        <div className="border border-[#E5E5E5] bg-white rounded-xl p-2 text-center">
          <p className="text-xl font-bold text-black">{pendingOrders.length}</p>
          <p className="text-[9px] text-[#6B6B6B]">Total</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-black">Tablero de entregas</h3>

        {pendingOrders.length === 0 ? (
          <div className="border border-dashed border-[#E5E5E5] rounded-xl py-10 text-center">
            <Package className="h-8 w-8 mx-auto text-[#BEBEBE] mb-2" />
            <p className="text-sm text-[#BEBEBE]">Sin órdenes pendientes</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {pendingOrders.map((order) => {
              const isReady = order.status === 'listo'
              const isEnCamino = order.status === 'en_camino'
              const allKitchensReady = order.cocinaStatus === 'listo'

              const total = order.items.reduce((sum, item) => {
                const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
              }, 0)

              return (
                <div
                  key={order.id}
                  className={`border rounded-xl transition-all ${
                    isReady ? 'border-[#16A34A] bg-[#F0FDF4]/50' :
                    isEnCamino ? 'border-[#BEBEBE] bg-[#F2F2F2]/50' :
                    'border-[#E5E5E5] bg-white'
                  }`}
                >
                  <div className="p-3 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-black">#{order.numero}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] h-4 px-1 ${
                            order.canal === 'delivery' ? 'border-[#6B6B6B] text-[#6B6B6B]' :
                            order.canal === 'para_llevar' ? 'border-[#D97706] text-[#D97706]' :
                            ''
                          }`}>
                            {order.canal === 'delivery' && <Truck className="h-2.5 w-2.5 mr-0.5" />}
                            {order.canal === 'para_llevar' && <ShoppingBag className="h-2.5 w-2.5 mr-0.5" />}
                            {getChannelLabel(order.canal)}
                          </Badge>
                          {order.mesa && (
                            <span className="text-[10px] text-[#6B6B6B]">Mesa {order.mesa}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-[10px] h-4 ${
                          isReady ? 'bg-[#16A34A] text-white' :
                          isEnCamino ? 'bg-black text-white' :
                          order.status === 'preparando' ? 'bg-[#F2F2F2] text-black' :
                          'bg-[#F2F2F2] text-[#6B6B6B]'
                        }`}>
                          {isEnCamino ? 'En camino' : getStatusLabel(order.status)}
                        </Badge>
                        <p className="text-[10px] text-[#6B6B6B] mt-0.5 flex items-center justify-end gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {getTimeDiff(order.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pb-3">
                    {/* Customer Info */}
                    {(order.canal === 'delivery' || order.canal === 'para_llevar') && order.nombreCliente && (
                      <div className="mb-2 p-2 bg-[#F2F2F2] rounded-lg text-xs">
                        <p className="font-semibold text-black">{order.nombreCliente}</p>
                        {order.telefono && (
                          <p className="text-[#6B6B6B] flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />{order.telefono}
                          </p>
                        )}
                        {order.direccion && (
                          <p className="text-[#6B6B6B] flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />{order.direccion}
                          </p>
                        )}
                        {order.zonaReparto && (
                          <span className="mt-1 inline-block text-[9px] bg-[#E5E5E5] text-[#6B6B6B] px-1.5 py-0.5 rounded-full">
                            {order.zonaReparto}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Items */}
                    <ul className="space-y-0.5 mb-2">
                      {order.items.map(item => (
                        <li key={item.id} className="text-xs text-black">
                          {item.cantidad}x {item.menuItem.nombre}
                        </li>
                      ))}
                    </ul>

                    {/* Total */}
                    <div className="flex justify-between text-xs mb-2 pt-1 border-t border-[#E5E5E5]">
                      <span className="text-[#6B6B6B]">Total</span>
                      <span className="font-semibold text-black">{formatPrice(total)}</span>
                    </div>

                    {/* Kitchen Status */}
                    {!isEnCamino && (
                      <div className="flex gap-1 text-[10px] mb-2">
                        <span className={`px-1.5 py-0.5 rounded ${
                          order.cocinaStatus === 'listo' ? 'bg-[#F0FDF4] text-[#16A34A]' :
                          order.cocinaStatus === 'preparando' ? 'bg-[#FFFBEB] text-[#D97706]' :
                          'bg-[#F2F2F2] text-[#6B6B6B]'
                        }`}>
                          Cocina: {order.cocinaStatus === 'listo' ? 'Listo' :
                                   order.cocinaStatus === 'preparando' ? 'Prep.' : 'Cola'}
                        </span>
                        {!allKitchensReady && (
                          <span className="text-[9px] text-[#BEBEBE] flex items-center gap-0.5">
                            <AlertCircle className="h-2.5 w-2.5" />Esperando
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {allKitchensReady && isReady && (
                      <div className="flex gap-1">
                        {order.canal === 'delivery' ? (
                          <Button
                            className="flex-1 bg-black hover:bg-black/90 text-white h-7 text-xs"
                            onClick={() => handleMarkEnCamino(order.id)}
                          >
                            <Truck className="h-3 w-3 mr-1" />En camino
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-[#16A34A] hover:bg-[#16A34A]/90 text-white h-7 text-xs"
                            onClick={() => handleMarkDelivered(order.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {order.canal === 'para_llevar' ? 'Entregar' : 'Entregado'}
                          </Button>
                        )}
                      </div>
                    )}

                    {isEnCamino && (
                      <Button
                        className="w-full bg-[#16A34A] hover:bg-[#16A34A]/90 text-white h-7 text-xs"
                        onClick={() => handleMarkDelivered(order.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />Entregado
                      </Button>
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
