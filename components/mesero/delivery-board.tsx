'use client'

import { useState } from 'react'
import { Check, Clock, Package, MapPin, Phone, Truck, ShoppingBag, AlertCircle, User, Copy } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPrice, getChannelLabel, getStatusLabel, getTimeDiff, type OrderStatus } from '@/lib/store'

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

  const deliveryStaff = users.filter(u => u.activo && (u.role === 'mesero' || u.role === 'manager'))

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
        <div className="border border-success/20 bg-green-50 rounded-xl p-2 text-center">
          <p className="text-xl font-bold text-success">{readyCount}</p>
          <p className="text-[9px] text-success">Listos</p>
        </div>
        <div className="border border-border bg-muted rounded-xl p-2 text-center">
          <p className="text-xl font-bold text-foreground">{enCaminoCount}</p>
          <p className="text-[9px] text-muted-foreground">En camino</p>
        </div>
        <div className="border border-warning/20 bg-kds-preparing rounded-xl p-2 text-center">
          <p className="text-xl font-bold text-warning">{preparingCount}</p>
          <p className="text-[9px] text-warning">Preparando</p>
        </div>
        <div className="border border-border bg-card rounded-xl p-2 text-center">
          <p className="text-xl font-bold text-foreground">{pendingOrders.length}</p>
          <p className="text-[9px] text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Tablero de entregas</h3>

        {pendingOrders.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-10 text-center">
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sin órdenes pendientes</p>
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
                  className={`border rounded-xl transition-all ${
                    isReady    ? 'border-success bg-green-50/50' :
                    isEnCamino ? 'border-accent bg-muted/50' :
                    'border-border bg-card'
                  }`}
                >
                  <div className="p-3 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">#{order.numero}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] h-4 px-1 ${
                            order.canal === 'delivery'    ? 'border-muted-foreground text-muted-foreground' :
                            order.canal === 'para_llevar' ? 'border-warning text-warning' :
                            ''
                          }`}>
                            {order.canal === 'delivery'    && <Truck       className="h-2.5 w-2.5 mr-0.5" />}
                            {order.canal === 'para_llevar' && <ShoppingBag className="h-2.5 w-2.5 mr-0.5" />}
                            {getChannelLabel(order.canal)}
                          </Badge>
                          {order.mesa && (
                            <span className="text-[10px] text-muted-foreground">Mesa {order.mesa}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-[10px] h-4 ${
                          isReady    ? 'bg-success text-white' :
                          isEnCamino ? 'bg-foreground text-background' :
                          order.status === 'preparando' ? 'bg-muted text-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {isEnCamino ? 'En camino' : getStatusLabel(order.status)}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {getTimeDiff(order.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pb-3">
                    {/* Customer Info */}
                    {(isDelivery || order.canal === 'para_llevar') && order.nombreCliente && (
                      <div className="mb-2 p-2 bg-muted rounded-lg text-xs">
                        <p className="font-semibold text-foreground">{order.nombreCliente}</p>
                        {order.telefono && (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />{order.telefono}
                          </p>
                        )}
                        {order.direccion && (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />{order.direccion}
                          </p>
                        )}
                        {order.zonaReparto && (
                          <span className="mt-1 inline-block text-[9px] bg-border text-muted-foreground px-1.5 py-0.5 rounded-full">
                            {order.zonaReparto}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Repartidor asignado */}
                    {isEnCamino && repartidorUser && (
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span>{repartidorUser.nombre}</span>
                      </div>
                    )}

                    {/* Items */}
                    <ul className="space-y-0.5 mb-2">
                      {order.items.map(item => (
                        <li key={item.id} className="text-xs text-foreground">
                          {item.cantidad}x {item.menuItem.nombre}
                        </li>
                      ))}
                    </ul>

                    {/* Total */}
                    <div className="flex justify-between text-xs mb-2 pt-1 border-t border-border">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold text-foreground">{formatPrice(total)}</span>
                    </div>

                    {/* Kitchen Status */}
                    {!isEnCamino && (
                      <div className="flex gap-1 text-[10px] mb-2">
                        <span className={`px-1.5 py-0.5 rounded ${
                          order.cocinaStatus === 'listo'      ? 'bg-green-50 text-success' :
                          order.cocinaStatus === 'preparando' ? 'bg-kds-preparing text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          Cocina: {order.cocinaStatus === 'listo' ? 'Listo' :
                                   order.cocinaStatus === 'preparando' ? 'Prep.' : 'Cola'}
                        </span>
                        {!allKitchensReady && (
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <AlertCircle className="h-2.5 w-2.5" />Esperando
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {allKitchensReady && isReady && !isAssigning && (
                      <div className="flex gap-1">
                        {isDelivery ? (
                          <Button
                            className="flex-1 h-7 text-xs"
                            onClick={() => { setAssigningId(order.id); setSelectedRepartidor('') }}
                          >
                            <Truck className="h-3 w-3 mr-1" />En camino
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-success hover:bg-success/90 text-white h-7 text-xs"
                            onClick={() => handleMarkDelivered(order.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {order.canal === 'para_llevar' ? 'Entregar' : 'Entregado'}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Assign repartidor panel */}
                    {isAssigning && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Asignar repartidor
                        </p>
                        <Select value={selectedRepartidor} onValueChange={setSelectedRepartidor}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccioná quién lleva" />
                          </SelectTrigger>
                          <SelectContent>
                            {deliveryStaff.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            className="flex-1 h-7 text-xs"
                            onClick={() => { setAssigningId(null); setSelectedRepartidor('') }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            className="flex-1 h-7 text-xs"
                            disabled={!selectedRepartidor}
                            onClick={() => handleConfirmRepartidor(order.id)}
                          >
                            <Truck className="h-3 w-3 mr-1" />Salir
                          </Button>
                        </div>
                      </div>
                    )}

                    {isEnCamino && (
                      <div className="space-y-1.5">
                        {isDelivery && (
                          <button
                            onClick={() => copyTrackingLink(order.id)}
                            className="w-full flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg py-1.5 transition-colors"
                          >
                            {copiedId === order.id
                              ? <><Check className="h-3 w-3 text-success" /><span className="text-success">Link copiado</span></>
                              : <><Copy className="h-3 w-3" />Copiar link de tracking</>
                            }
                          </button>
                        )}
                        <Button
                          className="w-full bg-success hover:bg-success/90 text-white h-7 text-xs"
                          onClick={() => handleMarkDelivered(order.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />Entregado
                        </Button>
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
