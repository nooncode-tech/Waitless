'use client'

import { useState } from 'react'
import { ChevronLeft, Gift, Bell, Check, Users, Minus, Plus, Receipt, CreditCard, Wallet } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/store'

interface BillViewProps {
  sessionId: string
  mesa: number
  onBack: () => void
  onShowRewards: () => void
}

type PayMode = 'full' | 'split' | 'items'

export function BillView({ sessionId, mesa, onBack, onShowRewards }: BillViewProps) {
  const {
    tableSessions,
    config,
    setTipAmount,
    createWaiterCall,
    waiterCalls,
  } = useApp()

  const session = tableSessions.find(s => s.id === sessionId)

  const hasPendingBillCall = waiterCalls.some(
    c => c.mesa === mesa && c.tipo === 'cuenta' && !c.atendido
  )
  const [billRequested, setBillRequested] = useState(hasPendingBillCall)
  const [payMode, setPayMode] = useState<PayMode>('full')
  const [splitPeople, setSplitPeople] = useState(2)

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
        <header className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center" aria-label="Volver">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <span className="text-sm font-semibold text-foreground">Mi Cuenta</span>
            <div className="w-8" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">No hay cuenta activa</p>
        </main>
      </div>
    )
  }

  const suggestedTips = [0, 10, 15, 20]
  const currentTipPercent = session.subtotal > 0
    ? Math.round((session.propina / session.subtotal) * 100)
    : 0

  const handleTipSelect = (percent: number) => {
    setTipAmount(sessionId, session.subtotal * (percent / 100))
  }

  const handleRequestBill = () => {
    createWaiterCall(mesa, 'cuenta', 'El cliente solicita la cuenta')
    setBillRequested(true)
  }

  const isPaid = session.paymentStatus === 'pagado'
  const isWaiting = billRequested || hasPendingBillCall
  const canRequest = !isPaid && !isWaiting && session.orders.length > 0

  const splitAmount = session.total > 0 ? Math.ceil((session.total / splitPeople) * 100) / 100 : 0

  const payModes: { key: PayMode; label: string; description: string; icon: React.ReactNode; supported: boolean }[] = [
    {
      key: 'full',
      label: 'Pagar todo',
      description: 'Cubre la cuenta completa de la mesa.',
      icon: <CreditCard className="h-4 w-4" />,
      supported: true,
    },
    {
      key: 'split',
      label: 'Dividir en partes iguales',
      description: 'Divide el total entre los comensales.',
      icon: <Users className="h-4 w-4" />,
      supported: true,
    },
    {
      key: 'items',
      label: 'Pagar mis platillos',
      description: 'Cada quien paga lo que pidió.',
      icon: <Wallet className="h-4 w-4" />,
      supported: false,
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 pt-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center" aria-label="Volver al menú">
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="text-center">
            <span className="text-sm font-semibold text-foreground">Mi Cuenta</span>
            <p className="text-[11px] text-muted-foreground">Mesa {mesa}</p>
          </div>
          <div className="w-8" />
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-56 space-y-6">

        {/* Order summary */}
        {session.orders.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Resumen de pedidos
            </h2>
            <div className="space-y-3">
              {session.orders.map((order) => (
                <div key={order.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Pedido #{order.numero}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      order.status === 'entregado'
                        ? 'bg-success/10 text-success'
                        : order.status === 'listo'
                        ? 'bg-warning/10 text-warning'
                        : order.status === 'cancelado'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {order.status === 'entregado' ? 'Entregado' :
                       order.status === 'listo' ? 'Listo' :
                       order.status === 'cancelado' ? 'Cancelado' : 'En proceso'}
                    </span>
                  </div>
                  {order.items.map((item) => {
                    const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                    const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                    return (
                      <div key={item.id} className="flex justify-between py-1">
                        <div className="flex-1">
                          <span className="text-sm text-foreground">
                            {item.cantidad}× {item.menuItem.nombre}
                          </span>
                          {item.extras && item.extras.length > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              + {item.extras.map(e => e.nombre).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-foreground font-medium">
                          {formatPrice(itemTotal)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-8">
            <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay consumos aún</p>
          </div>
        )}

        {/* Rewards */}
        {canRequest && session.orders.length > 0 && (
          <button
            onClick={onShowRewards}
            className="w-full flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Obtener descuento</span>
            </div>
            <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
          </button>
        )}

        {/* Tip */}
        {session.orders.length > 0 && !isPaid && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Propina (opcional)
            </h2>
            <div className="flex gap-2">
              {suggestedTips.map((percent) => (
                <button
                  key={percent}
                  onClick={() => handleTipSelect(percent)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                    currentTipPercent === percent
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-foreground border-border hover:border-foreground'
                  }`}
                >
                  {percent === 0 ? 'Sin' : `${percent}%`}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Payment mode selector */}
        {session.orders.length > 0 && !isPaid && session.total > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              ¿Cómo quieren pagar?
            </h2>
            <div className="space-y-2">
              {payModes.map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => mode.supported && setPayMode(mode.key)}
                  disabled={!mode.supported}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                    !mode.supported
                      ? 'opacity-40 cursor-not-allowed border-border'
                      : payMode === mode.key
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border hover:border-foreground/40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    payMode === mode.key ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {mode.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{mode.label}</p>
                      {!mode.supported && (
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Próximamente</span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{mode.description}</p>
                  </div>
                  {mode.supported && (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      payMode === mode.key ? 'border-foreground bg-foreground' : 'border-border'
                    }`}>
                      {payMode === mode.key && <Check className="h-3 w-3 text-background" />}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Split calculator */}
            {payMode === 'split' && (
              <div className="mt-3 p-4 bg-secondary rounded-2xl space-y-3">
                <p className="text-xs text-muted-foreground text-center">¿Cuántas personas dividen?</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setSplitPeople(p => Math.max(2, p - 1))}
                    className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:border-foreground transition-colors"
                    aria-label="Reducir personas"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-2xl font-bold text-foreground w-10 text-center">{splitPeople}</span>
                  <button
                    onClick={() => setSplitPeople(p => Math.min(20, p + 1))}
                    className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:border-foreground transition-colors"
                    aria-label="Agregar persona"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="bg-background rounded-xl p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">Cada persona paga</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{formatPrice(splitAmount)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatPrice(session.total)} ÷ {splitPeople} personas
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom: totals + primary action */}
      {session.orders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-w-md mx-auto shadow-lg space-y-3">
          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(session.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>IVA ({config.impuestoPorcentaje}%)</span>
              <span>{formatPrice(session.impuestos)}</span>
            </div>
            {session.propina > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Propina</span>
                <span>{formatPrice(session.propina)}</span>
              </div>
            )}
            {session.descuento > 0 && (
              <div className="flex justify-between text-sm text-success font-medium">
                <span>Descuento {session.descuentoMotivo && `· ${session.descuentoMotivo}`}</span>
                <span>−{formatPrice(session.descuento)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-foreground pt-1.5 border-t border-dashed">
              <span>Total</span>
              <span>
                {payMode === 'split'
                  ? `${formatPrice(splitAmount)} c/u`
                  : formatPrice(session.total)}
              </span>
            </div>
          </div>

          {/* CTA */}
          {isPaid ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-success/10 rounded-xl border border-success/30">
              <Check className="h-4 w-4 text-success" />
              <p className="text-sm font-semibold text-success">Cuenta pagada — ¡Gracias!</p>
            </div>
          ) : isWaiting ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-warning/10 rounded-xl border border-warning/20">
              <Bell className="h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-semibold text-warning">Cuenta solicitada</p>
                <p className="text-[10px] text-warning/70 text-center">El mesero vendrá a cobrarte pronto</p>
              </div>
            </div>
          ) : (
            <Button
              className="w-full bg-foreground hover:bg-foreground/90 text-background h-12 text-sm font-bold rounded-xl gap-2"
              onClick={handleRequestBill}
            >
              <Bell className="h-4 w-4" />
              Pedir la cuenta
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
