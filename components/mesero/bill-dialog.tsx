'use client'

import React, { useEffect } from "react"

import { useState } from 'react'
import { X, Receipt, CreditCard, Banknote, Percent, Check, Printer, Smartphone, Users, PlusCircle, ExternalLink } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice, type PaymentMethod } from '@/lib/store'
import { canDo } from '@/lib/permissions'

interface BillDialogProps {
  sessionId: string
  onClose: () => void
}

export function BillDialog({ sessionId, onClose }: BillDialogProps) {
  const {
  getSessionBill,
  applyDiscount,
  setTipAmount,
  requestPayment,
  confirmPayment,
  persistSplitBill,
  addPartialPayment,
  config,
  currentUser,
} = useApp()
  const canApplyDiscount = canDo(currentUser?.role, 'aplicar_descuento')


  const session = getSessionBill(sessionId)

  const [descuento, setDescuento] = useState(session?.descuento?.toString() || '0')
  const [motivoDescuento, setMotivoDescuento] = useState('')

const quickDiscounts = [
  { label: "Seguirnos", percent: 10 },
  { label: "Cliente frecuente", percent: 5 },
]
  const [propina, setPropina] = useState(session?.propina?.toString() || '0')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [onlinePaymentUrl, setOnlinePaymentUrl] = useState<string | null>(null)
  const [isCreatingOnlinePayment, setIsCreatingOnlinePayment] = useState(false)

  // Split bill state
  const [splitMode, setSplitMode] = useState(false)
  const [splitCount, setSplitCount] = useState(2)
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PaymentMethod | null; paid: boolean; monto: string }>>(
    Array.from({ length: 2 }, (_, i) => ({ method: null, paid: false, monto: '' }))
  )

  useEffect(() => {
    setSplitPayments(Array.from({ length: splitCount }, (_, i) => ({ method: null, paid: false, monto: '' })))
  }, [splitCount])

  // Partial payment state
  const [partialAmount, setPartialAmount] = useState('')
  const [partialMethod, setPartialMethod] = useState<PaymentMethod | null>(null)

  if (!session) {
    return null
  }
  const isAlreadyPaid =
  session.billStatus === 'pagada' ||
  session.billStatus === 'cerrada' ||
  session.billStatus === 'en_pago'

  const handleApplyDiscount = () => {
    const amount = Number.parseFloat(descuento) || 0
    if (amount > 0 && motivoDescuento.trim()) {
      applyDiscount(sessionId, amount, motivoDescuento)
    }
  }

  const handleSetTip = (amount: number) => {
    setPropina(amount.toString())
    setTipAmount(sessionId, amount)
  }

  const handleConfirmPayment = async () => {
  if (!selectedMethod) return

  // Avoid double payment
  if (session.paymentStatus === 'pagado') return

  // Set payment method first, then confirm
  requestPayment(sessionId, selectedMethod)
  await confirmPayment(sessionId)
  onClose()
}

  // Task 4.3 — Pago online via Stripe
  const handleOnlinePayment = async () => {
    setIsCreatingOnlinePayment(true)
    try {
      const { data: { session: authSession } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      const token = authSession?.access_token
      if (!token) throw new Error('Sin sesión activa')

      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, currency: 'ars', description: `Mesa — sesión ${sessionId}` }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error creando pago')
      setOnlinePaymentUrl(data.paymentUrl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      // Si el proveedor no está configurado, mostrar mensaje claro
      alert(msg.includes('configurado') ? 'Pagos online no configurados. Contacta al administrador.' : msg)
    } finally {
      setIsCreatingOnlinePayment(false)
    }
  }

  // Split bill helpers
  const setSplitPersonMethod = (index: number, method: PaymentMethod) => {
    setSplitPayments((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], method }
      return next
    })
  }

  const markSplitPersonPaid = (index: number) => {
    setSplitPayments((prev) => {
      const next = [...prev]
      if (!next[index].method) return prev
      next[index] = { ...next[index], paid: true }
      return next
    })
  }

  const allSplitPaid = splitPayments.length > 0 && splitPayments.every((p) => p.paid)
  const paidCount = splitPayments.filter((p) => p.paid).length

  const setSplitPersonMonto = (index: number, monto: string) => {
    setSplitPayments(prev => {
      const next = [...prev]
      next[index] = { ...next[index], monto }
      return next
    })
  }

  const unmarkSplitPersonPaid = (index: number) => {
    setSplitPayments(prev => {
      const next = [...prev]
      next[index] = { ...next[index], paid: false }
      return next
    })
  }

  const handleCloseSplitBill = async () => {
    const seats = splitPayments.map((p, i) => ({
      method: p.method!,
      monto: resolvedMontos[i],
    }))
    await persistSplitBill(sessionId, seats)
    await confirmPayment(sessionId)
    onClose()
  }





  const suggestedTips = [
    { label: '10%', value: Math.round(session.subtotal * 0.1) },
    { label: '15%', value: Math.round(session.subtotal * 0.15) },
    { label: '20%', value: Math.round(session.subtotal * 0.2) },
  ]

  // P1.2: Filtrar por métodos activos en config — enum idéntico en frontend, tipos y base de datos
  const allPaymentMethods: { key: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { key: 'efectivo', label: 'Efectivo', icon: <Banknote className="h-5 w-5" /> },
    { key: 'tarjeta', label: 'Tarjeta', icon: <CreditCard className="h-5 w-5" /> },
    { key: 'transferencia', label: 'Transferencia', icon: <Smartphone className="h-5 w-5" /> },
    { key: 'apple_pay', label: 'Apple Pay', icon: <Smartphone className="h-5 w-5" /> },
  ]
  const paymentMethods = allPaymentMethods.filter(m => {
    const activos = config.metodospagoActivos
    if (m.key === 'efectivo') return activos.efectivo
    if (m.key === 'tarjeta') return activos.tarjeta
    if (m.key === 'transferencia') return activos.transferencia
    return true // apple_pay siempre disponible si no está en config
  })

  // Recalculate total with current values
  const currentDiscount = Number.parseFloat(descuento) || 0
  const currentTip = Number.parseFloat(propina) || 0
  const calculatedTotal = session.subtotal + session.impuestos + currentTip - currentDiscount

  const montoAbonado = session.montoAbonado ?? 0
  const pendiente = Math.max(0, calculatedTotal - montoAbonado)

  // Equal share base: round down, last person absorbs the difference
  const baseShare = splitCount > 0 ? Math.floor(calculatedTotal / splitCount) : calculatedTotal
  const lastShare = calculatedTotal - baseShare * (splitCount - 1)

  // Resolve each person's monto: use their custom value if set, else distribute equally
  const resolvedMontos = splitPayments.map((p, i) => {
    if (p.monto !== '') return Number(p.monto) || 0
    return i === splitCount - 1 ? lastShare : baseShare
  })
  const sharePerPerson = baseShare // kept for display in the "c/u" indicator

  const totalAsignado = resolvedMontos.reduce((s, m) => s + m, 0)
  const diferencia = Math.round((calculatedTotal - totalAsignado) * 100) / 100

  const handlePartialPayment = () => {
    const amount = Number.parseFloat(partialAmount)
    if (!amount || amount <= 0 || !partialMethod) return
    addPartialPayment(sessionId, amount, partialMethod)
    setPartialAmount('')
    setPartialMethod(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Cuenta Mesa {session.mesa}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* en_pago banner — Stripe checkout in progress */}
          {session.billStatus === 'en_pago' && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm">
              <Spinner className="size-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">Pago online en curso</p>
                <p className="text-amber-700 dark:text-amber-400 text-xs">Esperando confirmación de Stripe. No cerrés esta pantalla.</p>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Detalle de consumo</h3>
            <Card>
              <CardContent className="p-3 space-y-2">
                {session.orders && session.orders.length > 0 ? (
                  session.orders.map((order) => (
                    <div key={order.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Pedido #{order.numero}
                      </div>
                      {order.items.map((item) => {
                        const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                        const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                        return (
                          <div key={item.id} className="text-sm">
                            <div className="flex justify-between">
                              <span className="text-foreground font-medium">
                                {item.cantidad}x {item.menuItem.nombre}
                              </span>
                              <span className="text-muted-foreground">{formatPrice(itemTotal)}</span>
                            </div>
                            {/* Extras en el resumen de cobro */}
                            {item.extras && item.extras.length > 0 && (
                              <div className="ml-3 mt-0.5">
                                {item.extras.map((extra) => (
                                  <p key={extra.id} className="text-xs text-primary">
                                    + {extra.nombre} (+{formatPrice(extra.precio)})
                                  </p>
                                ))}
                              </div>
                            )}
                            {/* Notas/modificadores en el resumen de cobro */}
                            {item.notas && (
                              <p className="ml-3 mt-0.5 text-xs text-amber-600 italic">
                                Nota: {item.notas}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No hay items en esta cuenta</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mode toggle: Cuenta completa / Dividir cuenta */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                !splitMode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-secondary'
              }`}
              onClick={() => setSplitMode(false)}
            >
              Cuenta completa
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                splitMode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-secondary'
              }`}
              onClick={() => setSplitMode(true)}
            >
              <Users className="h-4 w-4" />
              Dividir cuenta
            </button>
          </div>

          {!splitMode ? (
            <>
              {/* Discount — solo manager y admin */}
              {canApplyDiscount ? (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Percent className="h-4 w-4" />
                    Descuento
                  </h3>

                  {/* Botones de descuento estilo propina */}
                  <div className="flex gap-2 mb-2">
                    {quickDiscounts.map((d) => {
                      const value = Math.round(session.subtotal * (d.percent / 100))
                      return (
                        <Button
                          key={d.label}
                          variant={Number.parseFloat(descuento) === value ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 h-9 text-xs"
                          onClick={() => {
                            setDescuento(value.toString())
                            setMotivoDescuento(d.label)
                          }}
                        >
                          {d.label} ({d.percent}%)
                        </Button>
                      )
                    })}
                  </div>

                  {/* Descuento manual */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Monto</Label>
                      <Input
                        type="number"
                        value={descuento}
                        onChange={(e) => setDescuento(e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex gap-1 items-end">
                      <Input
                        value={motivoDescuento}
                        onChange={(e) => setMotivoDescuento(e.target.value)}
                        placeholder="Motivo del descuento"
                        className="h-9 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 shrink-0"
                        onClick={handleApplyDiscount}
                        disabled={!motivoDescuento.trim() || Number.parseFloat(descuento) <= 0}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Solo managers y admins pueden aplicar descuentos.</p>
                </div>
              )}

              {/* Tip */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Propina</h3>
                <div className="flex gap-2 mb-2">
                  {suggestedTips.map((tip) => (
                    <Button
                      key={tip.label}
                      variant={Number.parseFloat(propina) === tip.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-9 text-xs"
                      onClick={() => handleSetTip(tip.value)}
                    >
                      {tip.label} ({formatPrice(tip.value)})
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Otro:</Label>
                  <Input
                    type="number"
                    value={propina}
                    onChange={(e) => {
                      setPropina(e.target.value)
                      setTipAmount(sessionId, Number.parseFloat(e.target.value) || 0)
                    }}
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Totals */}
              <Card>
                <CardContent className="p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatPrice(session.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IVA ({config.impuestoPorcentaje}%)</span>
                      <span>{formatPrice(session.impuestos)}</span>
                    </div>
                    {currentDiscount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Descuento</span>
                        <span>-{formatPrice(currentDiscount)}</span>
                      </div>
                    )}
                    {currentTip > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Propina</span>
                        <span>{formatPrice(currentTip)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
                      <span>Total</span>
                      <span>{formatPrice(calculatedTotal)}</span>
                    </div>
                    {montoAbonado > 0 && (
                      <>
                        <div className="flex justify-between text-success text-sm">
                          <span>Abonado</span>
                          <span>-{formatPrice(montoAbonado)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-destructive pt-1 border-t border-border">
                          <span>Pendiente</span>
                          <span>{formatPrice(pendiente)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Partial Payment */}
              {pendiente > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <PlusCircle className="h-4 w-4" />
                    Registrar abono parcial
                  </h3>
                  <div className="flex gap-2 mb-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.key}
                        onClick={() => setPartialMethod(method.key)}
                        className={`flex-1 p-2 rounded-xl border text-center transition-all ${
                          partialMethod === method.key
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex justify-center mb-0.5">{method.icon}</div>
                        <span className="text-xs font-medium">{method.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder={`Hasta ${formatPrice(pendiente)}`}
                      className="h-9 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 shrink-0"
                      onClick={handlePartialPayment}
                      disabled={!partialMethod || !partialAmount || Number(partialAmount) <= 0}
                    >
                      Abonar
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Método de pago</h3>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.key}
                      onClick={() => setSelectedMethod(method.key)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedMethod === method.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex justify-center mb-1">{method.icon}</div>
                      <span className="text-xs font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 bg-transparent"
                  onClick={() => {
                    const printWindow = window.open('', '_blank', 'width=400,height=600')
                    if (!printWindow) return
                    const orderLines = (session.orders || []).map(order =>
                      order.items.map(item => {
                        const extrasTotal = item.extras?.reduce((e: number, ex: { precio: number }) => e + ex.precio, 0) || 0
                        const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                        let line = `<tr><td style="text-align:left">${item.cantidad}x ${item.menuItem.nombre}</td><td style="text-align:right">$${itemTotal.toFixed(2)}</td></tr>`
                        if (item.extras && item.extras.length > 0) {
                          line += item.extras.map((ex: { nombre: string; precio: number }) => `<tr><td style="padding-left:16px;font-size:11px;color:#666">+ ${ex.nombre}</td><td style="text-align:right;font-size:11px;color:#666">+$${ex.precio.toFixed(2)}</td></tr>`).join('')
                        }
                        if (item.notas) {
                          line += `<tr><td colspan="2" style="padding-left:16px;font-size:11px;color:#b45309;font-style:italic">Nota: ${item.notas}</td></tr>`
                        }
                        return line
                      }).join('')
                    ).join('')

                    printWindow.document.write(`<!DOCTYPE html><html><head><title>Recibo</title><style>
                      *{margin:0;padding:0;box-sizing:border-box}
                      body{font-family:'Courier New',monospace;font-size:13px;padding:16px;max-width:300px;margin:0 auto}
                      .center{text-align:center}
                      .bold{font-weight:bold}
                      .sep{border-top:1px dashed #999;margin:8px 0}
                      table{width:100%;border-collapse:collapse}
                      td{padding:2px 0;vertical-align:top}
                      .total-row td{font-weight:bold;font-size:15px;padding-top:6px;border-top:2px solid #000}
                      @media print{body{padding:0}}
                    </style></head><body>
                      <div class="center bold" style="font-size:16px;margin-bottom:4px">${config.restaurantName ?? ''}</div>
                      <div class="center" style="font-size:11px;color:#666;margin-bottom:8px">PLATAFORMA OPERATIVA</div>
                      <div class="sep"></div>
                      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span>Mesa: ${session.mesa}</span><span>${new Date().toLocaleDateString('es-MX')}</span></div>
                      <div style="font-size:11px;color:#666;margin-bottom:8px">${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div class="sep"></div>
                      <table>${orderLines}</table>
                      <div class="sep"></div>
                      <table>
                        <tr><td>Subtotal</td><td style="text-align:right">$${session.subtotal.toFixed(2)}</td></tr>
                        <tr><td>IVA</td><td style="text-align:right">$${session.impuestos.toFixed(2)}</td></tr>
                        ${currentDiscount > 0 ? `<tr><td style="color:green">Descuento</td><td style="text-align:right;color:green">-$${currentDiscount.toFixed(2)}</td></tr>` : ''}
                        ${currentTip > 0 ? `<tr><td>Propina</td><td style="text-align:right">$${currentTip.toFixed(2)}</td></tr>` : ''}
                        <tr class="total-row"><td>TOTAL</td><td style="text-align:right">$${calculatedTotal.toFixed(2)}</td></tr>
                      </table>
                      ${selectedMethod ? `<div class="sep"></div><div class="center" style="font-size:11px">Metodo: ${selectedMethod === 'tarjeta' ? 'Tarjeta' : selectedMethod === 'apple_pay' ? 'Apple Pay' : selectedMethod === 'transferencia' ? 'Transferencia' : 'Efectivo'}</div>` : ''}
                      <div class="sep"></div>
                      <div class="center" style="font-size:11px;color:#666;margin-top:8px">Gracias por su visita</div>
                      <div class="center" style="font-size:10px;color:#999">www.paquevosveais.com</div>
                    </body></html>`)
                    printWindow.document.close()
                    printWindow.focus()
                    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
                  }}
                >
                  <Printer className="h-4 w-4 mr-1.5" />
                  Imprimir
                </Button>
                <Button
                  className="flex-1 h-10 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => setShowConfirm(true)}
                  disabled={!selectedMethod || isAlreadyPaid || pendiente <= 0}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {montoAbonado > 0 ? `Cobrar resto (${formatPrice(pendiente)})` : 'Cobrar'}
                </Button>
              </div>

              {/* Task 4.3 — Pago online */}
              {!isAlreadyPaid && pendiente > 0 && (
                <div className="pt-1 space-y-2">
                  {onlinePaymentUrl ? (
                    <a
                      href={onlinePaymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full h-9 rounded-md border border-border text-sm text-primary hover:bg-accent transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir link de pago online
                    </a>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs"
                      onClick={handleOnlinePayment}
                      disabled={isCreatingOnlinePayment}
                    >
                      {isCreatingOnlinePayment ? (
                        <Spinner className="size-4 mr-1.5" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-1.5" />
                      )}
                      Generar link de pago online
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Split Bill Mode */
            <div className="space-y-4">
              {/* Totals summary for split mode */}
              <Card>
                <CardContent className="p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatPrice(session.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IVA ({config.impuestoPorcentaje}%)</span>
                      <span>{formatPrice(session.impuestos)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
                      <span>Total</span>
                      <span>{formatPrice(calculatedTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Number of people picker */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">¿Entre cuántas personas?</h3>
                <div className="flex gap-2 flex-wrap">
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSplitCount(n)}
                      className={`w-10 h-10 rounded-xl border text-sm font-semibold transition-all ${
                        splitCount === n
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 text-foreground'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {paidCount} de {splitCount} pagados
                </span>
                <span className="text-sm font-medium text-foreground">
                  ≈ {formatPrice(baseShare)} c/u
                </span>
              </div>

              {/* Balance warning */}
              {diferencia !== 0 && (
                <div className={`text-xs px-3 py-2 rounded-lg flex items-center justify-between ${
                  diferencia > 0 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                }`}>
                  <span>{diferencia > 0 ? 'Falta asignar' : 'Excede el total en'}</span>
                  <span className="font-bold">{formatPrice(Math.abs(diferencia))}</span>
                </div>
              )}

              {/* Person cards */}
              <div className="space-y-3">
                {splitPayments.map((person, index) => (
                  <Card
                    key={index}
                    className={`border transition-colors ${
                      person.paid ? 'border-success bg-success/5' : 'border-border'
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {person.paid && <Check className="h-4 w-4 text-success" />}
                          <span className="text-sm font-semibold text-foreground">
                            Persona {index + 1}
                          </span>
                        </div>
                        {person.paid ? (
                          <span className="text-sm font-bold text-foreground">
                            {formatPrice(resolvedMontos[index])}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={person.monto}
                              onChange={e => setSplitPersonMonto(index, e.target.value)}
                              placeholder={resolvedMontos[index].toFixed(2)}
                              className="h-7 w-24 text-sm text-right"
                            />
                          </div>
                        )}
                      </div>

                      {!person.paid ? (
                        <>
                          {/* Payment method buttons */}
                          <div className="grid grid-cols-3 gap-1.5 mb-2">
                            {paymentMethods.map((method) => (
                              <button
                                key={method.key}
                                onClick={() => setSplitPersonMethod(index, method.key)}
                                className={`p-2 rounded-xl border text-center transition-all ${
                                  person.method === method.key
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:border-primary/50 text-foreground'
                                }`}
                              >
                                <div className="flex justify-center mb-0.5">{method.icon}</div>
                                <span className="text-xs font-medium">{method.label}</span>
                              </button>
                            ))}
                          </div>

                          {/* Mark paid button */}
                          <Button
                            size="sm"
                            className="w-full h-8 bg-success hover:bg-success/90 text-success-foreground text-xs"
                            disabled={!person.method}
                            onClick={() => markSplitPersonPaid(index)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Marcar pagado
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-success font-medium py-1">
                            Pagado con{' '}
                            {person.method === 'efectivo' ? 'Efectivo'
                              : person.method === 'tarjeta' ? 'Tarjeta'
                              : person.method === 'transferencia' ? 'Transferencia'
                              : 'Apple Pay'}
                          </p>
                          <button
                            onClick={() => unmarkSplitPersonPaid(index)}
                            className="text-[10px] text-muted-foreground hover:text-destructive underline transition-colors"
                          >
                            Deshacer
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Bottom actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 bg-transparent"
                  onClick={() => {
                    const printWindow = window.open('', '_blank', 'width=400,height=600')
                    if (!printWindow) return
                    const orderLines = (session.orders || []).map(order =>
                      order.items.map(item => {
                        const extrasTotal = item.extras?.reduce((e: number, ex: { precio: number }) => e + ex.precio, 0) || 0
                        const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                        let line = `<tr><td style="text-align:left">${item.cantidad}x ${item.menuItem.nombre}</td><td style="text-align:right">$${itemTotal.toFixed(2)}</td></tr>`
                        if (item.extras && item.extras.length > 0) {
                          line += item.extras.map((ex: { nombre: string; precio: number }) => `<tr><td style="padding-left:16px;font-size:11px;color:#666">+ ${ex.nombre}</td><td style="text-align:right;font-size:11px;color:#666">+$${ex.precio.toFixed(2)}</td></tr>`).join('')
                        }
                        if (item.notas) {
                          line += `<tr><td colspan="2" style="padding-left:16px;font-size:11px;color:#b45309;font-style:italic">Nota: ${item.notas}</td></tr>`
                        }
                        return line
                      }).join('')
                    ).join('')
                    printWindow.document.write(`<!DOCTYPE html><html><head><title>Recibo</title><style>
                      *{margin:0;padding:0;box-sizing:border-box}
                      body{font-family:'Courier New',monospace;font-size:13px;padding:16px;max-width:300px;margin:0 auto}
                      .center{text-align:center}.bold{font-weight:bold}
                      .sep{border-top:1px dashed #999;margin:8px 0}
                      table{width:100%;border-collapse:collapse}
                      td{padding:2px 0;vertical-align:top}
                      .total-row td{font-weight:bold;font-size:15px;padding-top:6px;border-top:2px solid #000}
                      @media print{body{padding:0}}
                    </style></head><body>
                      <div class="center bold" style="font-size:16px;margin-bottom:4px">${config.restaurantName ?? ''}</div>
                      <div class="center" style="font-size:11px;color:#666;margin-bottom:8px">PLATAFORMA OPERATIVA</div>
                      <div class="sep"></div>
                      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span>Mesa: ${session.mesa}</span><span>${new Date().toLocaleDateString('es-MX')}</span></div>
                      <div style="font-size:11px;color:#666;margin-bottom:8px">${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div class="sep"></div>
                      <table>${orderLines}</table>
                      <div class="sep"></div>
                      <table>
                        <tr><td>Subtotal</td><td style="text-align:right">$${session.subtotal.toFixed(2)}</td></tr>
                        <tr><td>IVA</td><td style="text-align:right">$${session.impuestos.toFixed(2)}</td></tr>
                        <tr class="total-row"><td>TOTAL</td><td style="text-align:right">$${calculatedTotal.toFixed(2)}</td></tr>
                      </table>
                      <div class="sep"></div>
                      <div style="font-size:11px;color:#666;margin-bottom:4px">Dividido entre ${splitCount} personas:</div>
                      <table>
                        ${splitPayments.map((p, i) => `<tr><td style="font-size:11px">Persona ${i + 1}${p.method ? ' (' + (p.method === 'tarjeta' ? 'Tarjeta' : p.method === 'transferencia' ? 'Transferencia' : p.method === 'apple_pay' ? 'Apple Pay' : 'Efectivo') + ')' : ''}</td><td style="text-align:right;font-size:11px">$${resolvedMontos[i].toFixed(2)}</td></tr>`).join('')}
                      </table>
                      <div class="sep"></div>
                      <div class="center" style="font-size:11px;color:#666;margin-top:8px">Gracias por su visita</div>
                      <div class="center" style="font-size:10px;color:#999">www.paquevosveais.com</div>
                    </body></html>`)
                    printWindow.document.close()
                    printWindow.focus()
                    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
                  }}
                >
                  <Printer className="h-4 w-4 mr-1.5" />
                  Imprimir
                </Button>

                {allSplitPaid && diferencia === 0 ? (
                  <Button
                    className="flex-1 h-10 bg-success hover:bg-success/90 text-success-foreground"
                    onClick={handleCloseSplitBill}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Cerrar cuenta
                  </Button>
                ) : (
                  <Button
                    className="flex-1 h-10"
                    disabled
                    variant="outline"
                  >
                    {!allSplitPaid
                      ? `${paidCount} de ${splitCount} pagados`
                      : diferencia > 0
                        ? `Falta ${formatPrice(diferencia)}`
                        : `Excede ${formatPrice(Math.abs(diferencia))}`
                    }
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 rounded-xl">
            <Card className="w-full max-w-sm">
              <CardContent className="p-4 text-center">
                <Check className="h-12 w-12 mx-auto text-success mb-3" />
                <h3 className="text-lg font-bold text-foreground mb-1">Confirmar cobro</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {montoAbonado > 0 ? (
                    <>Restante a cobrar: <span className="font-bold text-foreground">{formatPrice(pendiente)}</span><br /></>
                  ) : (
                    <>Total a cobrar: <span className="font-bold text-foreground">{formatPrice(calculatedTotal)}</span><br /></>
                  )}
                  Método: <span className="capitalize">{selectedMethod}</span>
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => setShowConfirm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                      onClick={handleConfirmPayment}
                    >
                      Confirmar
                    </Button>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
