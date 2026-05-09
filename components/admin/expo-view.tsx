'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { Check, Clock, ChefHat, Utensils } from 'lucide-react'
import { getTimeDiffMinutes } from '@/lib/store'

export function ExpoView() {
  const { orders, markOrderDelivered } = useApp()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(interval)
  }, [])

  const readyOrders = orders.filter(
    o =>
      o.status !== 'entregado' &&
      o.status !== 'cancelado' &&
      (o.status === 'listo' || o.cocinaStatus === 'listo')
  )

  const byTable = readyOrders.reduce<Record<string, typeof readyOrders>>((acc, order) => {
    const key = order.mesa != null ? `Mesa ${order.mesa}` : order.nombreCliente || 'Para llevar'
    if (!acc[key]) acc[key] = []
    acc[key].push(order)
    return acc
  }, {})

  const tableKeys = Object.keys(byTable).sort()

  const getElapsed = (order: (typeof readyOrders)[0]) => getTimeDiffMinutes(order.createdAt)

  const elapsedColor = (min: number) =>
    min >= 15 ? 'text-red-600' : min >= 10 ? 'text-amber-600' : 'text-[#06C167]'

  return (
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
          <ChefHat className="h-4 w-4 text-[#06C167]" />
          <span className="text-sm font-semibold text-[#06C167]">
            {readyOrders.length} pedido{readyOrders.length !== 1 ? 's' : ''} listos para entregar
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {tableKeys.length === 0 && (
        <div className="border border-dashed border-gray-200 rounded-2xl py-10 text-center">
          <Utensils className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Sin pedidos listos para entregar</p>
          <p className="text-xs text-gray-400 mt-1">Los pedidos aparecerán aquí cuando la cocina los marque como listos</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {tableKeys.map(tableKey => (
          <div key={tableKey} className="border border-emerald-200 bg-emerald-50/30 rounded-2xl overflow-hidden">
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">{tableKey}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#06C167] text-white font-semibold">
                {byTable[tableKey].length} pedido{byTable[tableKey].length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="px-3 pb-3 space-y-2">
              {byTable[tableKey].map(order => {
                const elapsed = getElapsed(order)
                return (
                  <div key={order.id} className="bg-white rounded-xl border border-emerald-100 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-900">#{order.numero}</span>
                      <div className={`flex items-center gap-1 text-[10px] font-medium ${elapsedColor(elapsed)}`}>
                        <Clock className="h-3 w-3" />
                        {elapsed}min
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-start gap-1 text-[11px] text-gray-900">
                          <span className="shrink-0 font-semibold">{item.cantidad}x</span>
                          <div className="min-w-0">
                            <span className="font-medium">{item.menuItem.nombre}</span>
                            {item.notas && (
                              <p className="text-amber-600 italic truncate">{item.notas}</p>
                            )}
                            {item.extras && item.extras.length > 0 && (
                              <p className="text-gray-400 truncate">
                                + {item.extras.map(e => e.nombre).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => markOrderDelivered(order.id)}
                      className="w-full h-7 rounded-xl bg-[#06C167] hover:bg-[#05a857] text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      Marcar entregado
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
