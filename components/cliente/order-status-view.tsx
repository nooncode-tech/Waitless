'use client'

import { ChevronLeft, Check, ChefHat, Package, Truck } from 'lucide-react'
import { formatTime, getStatusLabel, type Order } from '@/lib/store'
import { useApp } from '@/lib/context'

interface OrderStatusViewProps {
  orders: Order[]
  mesa: number
  onBack: () => void
}

const STATUS_STEPS = [
  { key: 'recibido', label: 'Recibido', icon: Check },
  { key: 'preparando', label: 'Preparando', icon: ChefHat },
  { key: 'listo', label: 'Listo', icon: Package },
  { key: 'entregado', label: 'Entregado', icon: Truck },
]

export function OrderStatusView({ orders, mesa, onBack }: OrderStatusViewProps) {
  const { cancelOrder, canCancelOrder } = useApp()

  const getStepIndex = (status: string) => {
    return STATUS_STEPS.findIndex(s => s.key === status)
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
        {/* Header */}
        <header className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              Estado de pedidos
            </span>
            <div className="w-8" />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Sin pedidos activos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Aún no has realizado ningún pedido
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white px-4 pt-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="text-center">
            <span className="text-sm font-semibold text-foreground">
              Estado de pedidos
            </span>
            <p className="text-[11px] text-muted-foreground">Mesa {mesa}</p>
          </div>
          <div className="w-8" />
        </div>
      </header>

      {/* Orders */}
      <main className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {orders.map(order => {
            const currentStepIndex = getStepIndex(order.status)

            return (
              <div
                key={order.id}
                className="bg-secondary/50 rounded-2xl overflow-hidden"
              >
                {/* Order Header */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      Pedido #{order.numero}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      order.status === 'listo'
                        ? 'bg-emerald-100 text-emerald-700'
                        : order.status === 'preparando'
                        ? 'bg-amber-100 text-amber-700'
                        : order.status === 'entregado'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {getStatusLabel(order.status)}
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="px-4 pt-3 pb-4 border-t border-b border-black/5">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-3 left-4 right-4 h-0.5 bg-border" />
                    <div
                      className="absolute top-3 left-4 h-0.5 bg-foreground transition-all duration-500"
                      style={{
                        width: `calc(${
                          (currentStepIndex /
                            (STATUS_STEPS.length - 1)) *
                          100
                        }% - 32px)`,
                      }}
                    />

                    {STATUS_STEPS.map((step, index) => {
                      const isCompleted = index <= currentStepIndex
                      const isCurrent = index === currentStepIndex
                      const Icon = step.icon

                      return (
                        <div
                          key={step.key}
                          className="relative flex flex-col items-center z-10"
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-foreground text-background'
                                : 'bg-white border-2 border-border text-muted-foreground'
                            } ${isCurrent ? 'ring-4 ring-secondary' : ''}`}
                          >
                            <Icon className="h-3 w-3" />
                          </div>
                          <span
                            className={`text-[10px] mt-1.5 whitespace-nowrap ${
                              isCompleted
                                ? 'text-foreground font-medium'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-4 pb-3">
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Artículos
                  </p>
                  <ul className="space-y-0.5">
                    {order.items.map(item => (
                      <li
                        key={item.id}
                        className="text-[13px] text-foreground flex items-center gap-2"
                      >
                        <span className="text-muted-foreground">
                          {item.cantidad}x
                        </span>
                        <span>{item.menuItem.nombre}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 🔴 CANCELAR PEDIDO */}
                  {canCancelOrder(order.id) && (
                    <button
                      className="mt-3 text-xs text-red-600 underline"
                      onClick={() => {
                        const ok = confirm(
                          '¿Cancelar este pedido? Esta acción no se puede deshacer.'
                        )
                        if (!ok) return

                        cancelOrder(
                          order.id,
                          'cliente_solicito',
                          'Cancelado antes de preparacion'
                        )
                      }}
                    >
                      Cancelar pedido
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

