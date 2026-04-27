'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Clock, ChefHat, Utensils } from 'lucide-react'
import { getTimeDiffMinutes } from '@/lib/store'
import { cn } from '@/lib/utils'

export function ExpoView() {
  const { orders, markOrderDelivered } = useApp()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(interval)
  }, [])


  // Orders ready to be served: status === 'listo' or either kitchen marked listo
  const readyOrders = orders.filter(
    o =>
      o.status !== 'entregado' &&
      o.status !== 'cancelado' &&
      (o.status === 'listo' || o.cocinaStatus === 'listo')
  )

  // Group by mesa
  const byTable = readyOrders.reduce<Record<string, typeof readyOrders>>((acc, order) => {
    const key = order.mesa != null ? `Mesa ${order.mesa}` : order.nombreCliente || 'Para llevar'
    if (!acc[key]) acc[key] = []
    acc[key].push(order)
    return acc
  }, {})

  const tableKeys = Object.keys(byTable).sort()

  const getElapsed = (order: (typeof readyOrders)[0]) =>
    getTimeDiffMinutes(order.createdAt)

  const elapsedColor = (min: number) =>
    min >= 15 ? 'text-red-600' : min >= 10 ? 'text-amber-600' : 'text-green-600'

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
          <ChefHat className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700">
            {readyOrders.length} pedido{readyOrders.length !== 1 ? 's' : ''} listos para entregar
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {tableKeys.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Utensils className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Sin pedidos listos para entregar</p>
            <p className="text-xs text-muted-foreground mt-1">Los pedidos aparecerán aquí cuando la cocina los marque como listos</p>
          </CardContent>
        </Card>
      )}

      {/* Table groups */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {tableKeys.map(tableKey => (
          <Card key={tableKey} className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">{tableKey}</CardTitle>
                <Badge className="bg-green-600 text-white text-[10px] h-5">
                  {byTable[tableKey].length} pedido{byTable[tableKey].length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {byTable[tableKey].map(order => {
                const elapsed = getElapsed(order)
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg border border-green-100 p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">#{order.numero}</span>
                      <div className={cn('flex items-center gap-1 text-[10px] font-medium', elapsedColor(elapsed))}>
                        <Clock className="h-3 w-3" />
                        {elapsed}min
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-0.5">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-start gap-1 text-[11px] text-foreground">
                          <span className="shrink-0 font-semibold">{item.cantidad}x</span>
                          <div className="min-w-0">
                            <span className="font-medium">{item.menuItem.nombre}</span>
                            {item.notas && (
                              <p className="text-amber-600 italic truncate">{item.notas}</p>
                            )}
                            {item.extras && item.extras.length > 0 && (
                              <p className="text-muted-foreground truncate">
                                + {item.extras.map(e => e.nombre).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      className="w-full h-7 text-[11px] bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => markOrderDelivered(order.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Marcar entregado
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
