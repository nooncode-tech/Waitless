'use client'

import React, { useEffect } from "react"
import { useState } from 'react'
import { X, Receipt, CreditCard, Banknote, Percent, Check, Printer, Smartphone, Users, PlusCircle, ExternalLink } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
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
    Array.from({ length: 2 }, () => ({ method: null, paid: false, monto: '' }))
  )

  useEffect(() => {
    setSplitPayments(Array.from({ length: splitCount }, () => ({ method: null, paid: false, monto: '' })))
  }, [splitCount])

  // Partial payment state
  const [partialAmount, setPartialAmount] = useState('')
  const [partialMethod, setPartialMethod] = useState<PaymentMethod | null>(null)

  if (!session) return null

  const isAlreadyPaid =
    session.billStatus === 'pagada' ||
    session.billStatus === 'cerrada' ||
    session.billStatus === 'en_pago'

  const handleApplyDiscount = () => {
    const amount = Number.parseFloat(descuento) || 0
    if (amount > 0 && motivoDescuento.trim()) applyDiscount(sessionId, amount, motivoDescuento)
  }

  const handleSetTip = (amount: number) => {
    setPropina(amount.toString())
    setTipAmount(sessionId, amount)
  }

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return
    if (session.paymentStatus === 'pagado') return
    requestPayment(sessionId, selectedMethod)
    await confirmPayment(sessionId)
    onClose()
  }

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
      alert(msg.includes('configurado') ? 'Pagos online no configurados. Contacta al administrador.' : msg)
    } finally {
      setIsCreatingOnlinePayment(false)
    }
  }

  // Split bill helpers
  const setSplitPersonMethod = (index: number, method: PaymentMethod) => {
    setSplitPayments(prev => prev.map((p, i) => i === index ? { ...p, method } : p))
  }

  const markSplitPersonPaid = (index: number) => {
    setSplitPayments(prev => {
      if (!prev[index].method) return prev
      return prev.map((p, i) => i === index ? { ...p, paid: true } : p)
    })
  }

  const unmarkSplitPersonPaid = (index: number) => {
    setSplitPayments(prev => prev.map((p, i) => i === index ? { ...p, paid: false } : p))
  }

  const setSplitPersonMonto = (index: number, monto: string) => {
    setSplitPayments(prev => prev.map((p, i) => i === index ? { ...p, monto } : p))
  }

  const allSplitPaid = splitPayments.length > 0 && splitPayments.every(p => p.paid)
  const paidCount = splitPayments.filter(p => p.paid).length

  const handleCloseSplitBill = async () => {
    const seats = splitPayments.map((p, i) => ({ method: p.method!, monto: resolvedMontos[i] }))
    await persistSplitBill(sessionId, seats)
    await confirmPayment(sessionId)
    onClose()
  }

  const suggestedTips = [
    { label: '10%', value: Math.round(session.subtotal * 0.1) },
    { label: '15%', value: Math.round(session.subtotal * 0.15) },
    { label: '20%', value: Math.round(session.subtotal * 0.2) },
  ]

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
    return true
  })

  const currentDiscount = Number.parseFloat(descuento) || 0
  const currentTip = Number.parseFloat(propina) || 0
  const calculatedTotal = session.subtotal + session.impuestos + currentTip - currentDiscount

  const montoAbonado = session.montoAbonado ?? 0
  const pendiente = Math.max(0, calculatedTotal - montoAbonado)

  const baseShare = splitCount > 0 ? Math.floor(calculatedTotal / splitCount) : calculatedTotal
  const lastShare = calculatedTotal - baseShare * (splitCount - 1)

  const resolvedMontos = splitPayments.map((p, i) => {
    if (p.monto !== '') return Number(p.monto) || 0
    return i === splitCount - 1 ? lastShare : baseShare
  })

  const totalAsignado = resolvedMontos.reduce((s, m) => s + m, 0)
  const diferencia = Math.round((calculatedTotal - totalAsignado) * 100) / 100

  const handlePartialPayment = () => {
    const amount = Number.parseFloat(partialAmount)
    if (!amount || amount <= 0 || !partialMethod) return
    addPartialPayment(sessionId, amount, partialMethod)
    setPartialAmount('')
    setPartialMethod(null)
  }

  const methodLabel = (method: PaymentMethod | null) => {
    if (method === 'tarjeta') return 'Tarjeta'
    if (method === 'transferencia') return 'Transferencia'
    if (method === 'apple_pay') return 'Apple Pay'
    return 'Efectivo'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-black text-gray-900">
              Cuenta Mesa {session.mesa}
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">

          {/* en_pago banner */}
          {session.billStatus === 'en_pago' && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Spinner className="size-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-bold text-amber-800">Pago online en curso</p>
                <p className="text-[11px] text-amber-700">Esperando confirmación de Stripe. No cerrés esta pantalla.</p>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Detalle de consumo</h3>
            <div className="border border-gray-100 rounded-2xl bg-white p-3 space-y-2">
              {session.orders && session.orders.length > 0 ? (
                session.orders.map(order => (
                  <div key={order.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div className="text-[10px] font-medium text-gray-400 mb-1">
                      Pedido #{order.numero}
                    </div>
                    {order.items.map(item => {
                      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                      const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                      return (
                        <div key={item.id} className="text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-900 font-medium">
                              {item.cantidad}x {item.menuItem.nombre}
                            </span>
                            <span className="text-gray-500">{formatPrice(itemTotal)}</span>
                          </div>
                          {item.extras && item.extras.length > 0 && (
                            <div className="ml-3 mt-0.5">
                              {item.extras.map(extra => (
                                <p key={extra.id} className="text-[10px] text-gray-500">
                                  + {extra.nombre} (+{formatPrice(extra.precio)})
                                </p>
                              ))}
                            </div>
                          )}
                          {item.notas && (
                            <p className="ml-3 mt-0.5 text-[10px] text-amber-600 italic">
                              Nota: {item.notas}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 py-4 text-center">No hay items en esta cuenta</p>
              )}
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${!splitMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              onClick={() => setSplitMode(false)}
            >
              Cuenta completa
            </button>
            <button
              className={`flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${splitMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              onClick={() => setSplitMode(true)}
            >
              <Users className="h-3.5 w-3.5" />
              Dividir cuenta
            </button>
          </div>

          {!splitMode ? (
            <>
              {/* Discount */}
              {canApplyDiscount ? (
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5" />
                    Descuento
                  </h3>
                  <div className="flex gap-2 mb-2">
                    {quickDiscounts.map(d => {
                      const value = Math.round(session.subtotal * (d.percent / 100))
                      const active = Number.parseFloat(descuento) === value
                      return (
                        <button
                          key={d.label}
                          onClick={() => { setDescuento(value.toString()); setMotivoDescuento(d.label) }}
                          className={`flex-1 h-9 rounded-xl border text-xs font-semibold transition-colors ${active ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {d.label} ({d.percent}%)
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Monto</label>
                      <Input
                        type="number"
                        value={descuento}
                        onChange={e => setDescuento(e.target.value)}
                        placeholder="0"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="col-span-2 flex gap-1 items-end">
                      <Input
                        value={motivoDescuento}
                        onChange={e => setMotivoDescuento(e.target.value)}
                        placeholder="Motivo del descuento"
                        className="h-9 text-xs"
                      />
                      <button
                        onClick={handleApplyDiscount}
                        disabled={!motivoDescuento.trim() || Number.parseFloat(descuento) <= 0}
                        className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-xl">
                  <Percent className="h-4 w-4 text-gray-400" />
                  <p className="text-xs text-gray-400">Solo managers y admins pueden aplicar descuentos.</p>
                </div>
              )}

              {/* Tip */}
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-2">Propina</h3>
                <div className="flex gap-2 mb-2">
                  {suggestedTips.map(tip => {
                    const active = Number.parseFloat(propina) === tip.value
                    return (
                      <button
                        key={tip.label}
                        onClick={() => handleSetTip(tip.value)}
                        className={`flex-1 h-9 rounded-xl border text-xs font-semibold transition-colors ${active ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                      >
                        {tip.label} ({formatPrice(tip.value)})
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-400 whitespace-nowrap">Otro:</label>
                  <Input
                    type="number"
                    value={propina}
                    onChange={e => {
                      setPropina(e.target.value)
                      setTipAmount(sessionId, Number.parseFloat(e.target.value) || 0)
                    }}
                    placeholder="0"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="border border-gray-100 rounded-2xl bg-white p-3 space-y-1 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(session.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>IVA ({config.impuestoPorcentaje}%)</span>
                  <span>{formatPrice(session.impuestos)}</span>
                </div>
                {currentDiscount > 0 && (
                  <div className="flex justify-between text-[#06C167]">
                    <span>Descuento</span>
                    <span>-{formatPrice(currentDiscount)}</span>
                  </div>
                )}
                {currentTip > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Propina</span>
                    <span>{formatPrice(currentTip)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(calculatedTotal)}</span>
                </div>
                {montoAbonado > 0 && (
                  <>
                    <div className="flex justify-between text-[#06C167]">
                      <span>Abonado</span>
                      <span>-{formatPrice(montoAbonado)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-red-500 pt-1 border-t border-gray-100">
                      <span>Pendiente</span>
                      <span>{formatPrice(pendiente)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Partial Payment */}
              {pendiente > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Registrar abono parcial
                  </h3>
                  <div className="flex gap-2 mb-2">
                    {paymentMethods.map(method => (
                      <button
                        key={method.key}
                        onClick={() => setPartialMethod(method.key)}
                        className={`flex-1 p-2 rounded-xl border text-center transition-all ${partialMethod === method.key ? 'border-gray-900 bg-gray-100 text-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="flex justify-center mb-0.5 text-gray-500">{method.icon}</div>
                        <span className="text-[10px] font-medium text-gray-700">{method.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={partialAmount}
                      onChange={e => setPartialAmount(e.target.value)}
                      placeholder={`Hasta ${formatPrice(pendiente)}`}
                      className="h-9 text-xs flex-1"
                    />
                    <button
                      onClick={handlePartialPayment}
                      disabled={!partialMethod || !partialAmount || Number(partialAmount) <= 0}
                      className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      Abonar
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-2">Método de pago</h3>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map(method => (
                    <button
                      key={method.key}
                      onClick={() => setSelectedMethod(method.key)}
                      className={`p-3 rounded-xl border text-center transition-all ${selectedMethod === method.key ? 'border-gray-900 bg-gray-100 text-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex justify-center mb-1 text-gray-500">{method.icon}</div>
                      <span className="text-xs font-medium text-gray-700">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
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
                        ${currentDiscount > 0 ? `<tr><td style="color:green">Descuento</td><td style="text-align:right;color:green">-$${currentDiscount.toFixed(2)}</td></tr>` : ''}
                        ${currentTip > 0 ? `<tr><td>Propina</td><td style="text-align:right">$${currentTip.toFixed(2)}</td></tr>` : ''}
                        <tr class="total-row"><td>TOTAL</td><td style="text-align:right">$${calculatedTotal.toFixed(2)}</td></tr>
                      </table>
                      ${selectedMethod ? `<div class="sep"></div><div class="center" style="font-size:11px">Metodo: ${methodLabel(selectedMethod)}</div>` : ''}
                      <div class="sep"></div>
                      <div class="center" style="font-size:11px;color:#666;margin-top:8px">Gracias por su visita</div>
                    </body></html>`)
                    printWindow.document.close()
                    printWindow.focus()
                    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
                  }}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!selectedMethod || isAlreadyPaid || pendiente <= 0}
                  className="flex-1 h-10 rounded-xl bg-[#06C167] hover:bg-[#05a857] text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {montoAbonado > 0 ? `Cobrar resto (${formatPrice(pendiente)})` : 'Cobrar'}
                </button>
              </div>

              {/* Pago online */}
              {!isAlreadyPaid && pendiente > 0 && (
                <div className="pt-1 space-y-2">
                  {onlinePaymentUrl ? (
                    <a
                      href={onlinePaymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir link de pago online
                    </a>
                  ) : (
                    <button
                      onClick={handleOnlinePayment}
                      disabled={isCreatingOnlinePayment}
                      className="w-full h-9 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isCreatingOnlinePayment ? (
                        <Spinner className="size-4" />
                      ) : (
                        <CreditCard className="h-3.5 w-3.5" />
                      )}
                      Generar link de pago online
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Split Bill Mode */
            <div className="space-y-4">

              {/* Totals summary */}
              <div className="border border-gray-100 rounded-2xl bg-white p-3 space-y-1 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(session.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>IVA ({config.impuestoPorcentaje}%)</span>
                  <span>{formatPrice(session.impuestos)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(calculatedTotal)}</span>
                </div>
              </div>

              {/* Number of people picker */}
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-2">¿Entre cuántas personas?</h3>
                <div className="flex gap-2 flex-wrap">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => setSplitCount(n)}
                      className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all ${splitCount === n ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:border-gray-400 text-gray-700'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {paidCount} de {splitCount} pagados
                </span>
                <span className="text-xs font-semibold text-gray-900">
                  ≈ {formatPrice(baseShare)} c/u
                </span>
              </div>

              {/* Balance warning */}
              {diferencia !== 0 && (
                <div className={`text-[11px] px-3 py-2 rounded-xl flex items-center justify-between font-medium ${diferencia > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                  <span>{diferencia > 0 ? 'Falta asignar' : 'Excede el total en'}</span>
                  <span className="font-bold">{formatPrice(Math.abs(diferencia))}</span>
                </div>
              )}

              {/* Person cards */}
              <div className="space-y-3">
                {splitPayments.map((person, index) => (
                  <div
                    key={index}
                    className={`border rounded-2xl p-3 transition-colors ${person.paid ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-100 bg-white'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {person.paid && <Check className="h-3.5 w-3.5 text-[#06C167]" />}
                        <span className="text-xs font-bold text-gray-900">
                          Persona {index + 1}
                        </span>
                      </div>
                      {person.paid ? (
                        <span className="text-xs font-bold text-gray-900">
                          {formatPrice(resolvedMontos[index])}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">$</span>
                          <Input
                            type="number"
                            value={person.monto}
                            onChange={e => setSplitPersonMonto(index, e.target.value)}
                            placeholder={resolvedMontos[index].toFixed(2)}
                            className="h-7 w-24 text-xs text-right"
                          />
                        </div>
                      )}
                    </div>

                    {!person.paid ? (
                      <>
                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                          {paymentMethods.map(method => (
                            <button
                              key={method.key}
                              onClick={() => setSplitPersonMethod(index, method.key)}
                              className={`p-2 rounded-xl border text-center transition-all ${person.method === method.key ? 'border-gray-900 bg-gray-100 text-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              <div className="flex justify-center mb-0.5 text-gray-500">{method.icon}</div>
                              <span className="text-[10px] font-medium text-gray-700">{method.label}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          disabled={!person.method}
                          onClick={() => markSplitPersonPaid(index)}
                          className="w-full h-8 rounded-xl bg-[#06C167] hover:bg-[#05a857] text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Marcar pagado
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#06C167] font-medium py-1">
                          Pagado con {methodLabel(person.method)}
                        </p>
                        <button
                          onClick={() => unmarkSplitPersonPaid(index)}
                          className="text-[10px] text-gray-400 hover:text-red-500 underline transition-colors"
                        >
                          Deshacer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom actions */}
              <div className="flex gap-2 pt-2">
                <button
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
                        ${splitPayments.map((p, i) => `<tr><td style="font-size:11px">Persona ${i + 1}${p.method ? ' (' + methodLabel(p.method) + ')' : ''}</td><td style="text-align:right;font-size:11px">$${resolvedMontos[i].toFixed(2)}</td></tr>`).join('')}
                      </table>
                      <div class="sep"></div>
                      <div class="center" style="font-size:11px;color:#666;margin-top:8px">Gracias por su visita</div>
                    </body></html>`)
                    printWindow.document.close()
                    printWindow.focus()
                    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
                  }}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>

                {allSplitPaid && diferencia === 0 ? (
                  <button
                    onClick={handleCloseSplitBill}
                    className="flex-1 h-10 rounded-xl bg-[#06C167] hover:bg-[#05a857] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    Cerrar cuenta
                  </button>
                ) : (
                  <div className="flex-1 h-10 rounded-xl border border-gray-200 text-xs font-semibold text-gray-400 flex items-center justify-center">
                    {!allSplitPaid
                      ? `${paidCount} de ${splitCount} pagados`
                      : diferencia > 0
                        ? `Falta ${formatPrice(diferencia)}`
                        : `Excede ${formatPrice(Math.abs(diferencia))}`
                    }
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-[#06C167]" />
              </div>
              <h3 className="text-sm font-black text-gray-900 mb-1">Confirmar cobro</h3>
              <p className="text-xs text-gray-400 mb-4">
                {montoAbonado > 0 ? (
                  <>Restante a cobrar: <span className="font-bold text-gray-900">{formatPrice(pendiente)}</span><br /></>
                ) : (
                  <>Total a cobrar: <span className="font-bold text-gray-900">{formatPrice(calculatedTotal)}</span><br /></>
                )}
                Método: <span className="capitalize font-medium text-gray-700">{methodLabel(selectedMethod)}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-9 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPayment}
                  className="flex-1 h-9 rounded-xl bg-[#06C167] hover:bg-[#05a857] text-white text-xs font-semibold transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
