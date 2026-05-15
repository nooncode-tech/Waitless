'use client'

import React, { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, type PaymentMethod } from '@/lib/store'
import { canDo } from '@/lib/permissions'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface BillDialogProps {
  sessionId: string
  onClose: () => void
}

function CssSpinner() {
  return (
    <>
      <style>{`@keyframes billSpin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#000', borderRadius: '50%', animation: 'billSpin 0.7s linear infinite', flexShrink: 0 }} />
    </>
  )
}

export function BillDialog({ sessionId, onClose }: BillDialogProps) {
  const { getSessionBill, applyDiscount, setTipAmount, requestPayment, confirmPayment, persistSplitBill, addPartialPayment, config, currentUser } = useApp()
  const canApplyDiscount = canDo(currentUser?.role, 'aplicar_descuento')

  const session = getSessionBill(sessionId)

  const [descuento, setDescuento] = useState(session?.descuento?.toString() || '0')
  const [motivoDescuento, setMotivoDescuento] = useState('')
  const quickDiscounts = [
    { label: 'Seguirnos', percent: 10 },
    { label: 'Cliente frecuente', percent: 5 },
  ]
  const [propina, setPropina] = useState(session?.propina?.toString() || '0')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [onlinePaymentUrl, setOnlinePaymentUrl] = useState<string | null>(null)
  const [isCreatingOnlinePayment, setIsCreatingOnlinePayment] = useState(false)

  const [splitMode, setSplitMode] = useState(false)
  const [splitCount, setSplitCount] = useState(2)
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PaymentMethod | null; paid: boolean; monto: string }>>(
    Array.from({ length: 2 }, () => ({ method: null, paid: false, monto: '' }))
  )
  useEffect(() => {
    setSplitPayments(Array.from({ length: splitCount }, () => ({ method: null, paid: false, monto: '' })))
  }, [splitCount])

  const [partialAmount, setPartialAmount] = useState('')
  const [partialMethod, setPartialMethod] = useState<PaymentMethod | null>(null)

  if (!session) return null

  const isAlreadyPaid = session.billStatus === 'pagada' || session.billStatus === 'cerrada' || session.billStatus === 'en_pago'

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

  const setSplitPersonMethod = (index: number, method: PaymentMethod) => {
    setSplitPayments(prev => prev.map((p, i) => i === index ? { ...p, method } : p))
  }
  const markSplitPersonPaid = (index: number) => {
    setSplitPayments(prev => { if (!prev[index].method) return prev; return prev.map((p, i) => i === index ? { ...p, paid: true } : p) })
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

  const allPaymentMethods: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: 'efectivo', label: 'Efectivo', icon: '$' },
    { key: 'tarjeta', label: 'Tarjeta', icon: '◫' },
    { key: 'transferencia', label: 'QR', icon: '⊞' },
    { key: 'apple_pay', label: 'Apple Pay', icon: '◈' },
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

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, borderRadius: 10, border: '1px solid #E5E5E5',
    padding: '0 12px', fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
  }

  const btnBase: React.CSSProperties = {
    fontFamily: FONT, border: 'none', cursor: 'pointer', borderRadius: 999, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }

  const printReceipt = () => {
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
  }

  const printSplitReceipt = () => {
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
        return line
      }).join('')
    ).join('')
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Recibo</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:13px;padding:16px;max-width:300px;margin:0 auto}
      .center{text-align:center}.bold{font-weight:bold}.sep{border-top:1px dashed #999;margin:8px 0}
      table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}
      .total-row td{font-weight:bold;font-size:15px;padding-top:6px;border-top:2px solid #000}@media print{body{padding:0}}
    </style></head><body>
      <div class="center bold" style="font-size:16px;margin-bottom:4px">${config.restaurantName ?? ''}</div>
      <div class="sep"></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:8px"><span>Mesa: ${session.mesa}</span><span>${new Date().toLocaleDateString('es-MX')}</span></div>
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
      <table>${splitPayments.map((p, i) => `<tr><td style="font-size:11px">Persona ${i + 1}${p.method ? ' (' + methodLabel(p.method) + ')' : ''}</td><td style="text-align:right;font-size:11px">$${resolvedMontos[i].toFixed(2)}</td></tr>`).join('')}</table>
      <div class="sep"></div>
      <div class="center" style="font-size:11px;color:#666;margin-top:8px">Gracias por su visita</div>
    </body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '92dvh', overflowY: 'auto', overscrollBehavior: 'contain', paddingBottom: 'env(safe-area-inset-bottom)', position: 'relative' }}>

        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em' }}>Cobro</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#909090', marginTop: 2 }}>
              Mesa {session.mesa} · {session.orders?.length ?? 0} pedido{(session.orders?.length ?? 0) !== 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 999, border: 'none', background: '#F0F0F0', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>×</button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* en_pago banner */}
          {session.billStatus === 'en_pago' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #FDE68A', background: '#FEF3C7', padding: '12px 14px' }}>
              <CssSpinner />
              <div>
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pago online en curso</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#b45309', marginTop: 2 }}>Esperando confirmación de Stripe. No cerrés esta pantalla.</div>
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>Detalle de consumo</div>
            <div style={{ border: '1px solid #F0F0F0', borderRadius: 14, background: '#fff', padding: 12 }}>
              {session.orders && session.orders.length > 0 ? (
                session.orders.map(order => (
                  <div key={order.id} style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: 8, marginBottom: 8 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#909090', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Pedido #{order.numero}
                    </div>
                    {order.items.map(item => {
                      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                      const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                      return (
                        <div key={item.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ fontWeight: 600 }}>{item.cantidad}× {item.menuItem.nombre}</span>
                            <span style={{ color: '#666', fontFamily: MONO }}>{formatPrice(itemTotal)}</span>
                          </div>
                          {item.extras && item.extras.length > 0 && (
                            <div style={{ paddingLeft: 14, marginTop: 2 }}>
                              {item.extras.map(extra => (
                                <div key={extra.id} style={{ fontFamily: MONO, fontSize: 10, color: '#909090' }}>+ {extra.nombre} (+{formatPrice(extra.precio)})</div>
                              ))}
                            </div>
                          )}
                          {item.notas && (
                            <div style={{ paddingLeft: 14, fontFamily: MONO, fontSize: 10, color: '#b45309', fontStyle: 'italic' }}>Nota: {item.notas}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
              ) : (
                <div style={{ fontFamily: MONO, fontSize: 12, color: '#909090', textAlign: 'center', padding: '16px 0' }}>No hay items en esta cuenta</div>
              )}
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 12, border: '1px solid #E5E5E5', overflow: 'hidden' }}>
            <button onClick={() => setSplitMode(false)} style={{ ...btnBase, borderRadius: 0, height: 40, fontSize: 13, background: !splitMode ? '#000' : '#fff', color: !splitMode ? '#fff' : '#909090' }}>
              Cuenta completa
            </button>
            <button onClick={() => setSplitMode(true)} style={{ ...btnBase, borderRadius: 0, height: 40, fontSize: 13, background: splitMode ? '#000' : '#fff', color: splitMode ? '#fff' : '#909090' }}>
              ⊙ Dividir cuenta
            </button>
          </div>

          {!splitMode ? (
            <>
              {/* Discount */}
              {canApplyDiscount ? (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>Descuento</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {quickDiscounts.map(d => {
                      const value = Math.round(session.subtotal * (d.percent / 100))
                      const active = Number.parseFloat(descuento) === value
                      return (
                        <button key={d.label} onClick={() => { setDescuento(value.toString()); setMotivoDescuento(d.label) }}
                          style={{ ...btnBase, flex: 1, height: 36, fontSize: 12, background: active ? '#000' : '#F0F0F0', color: active ? '#fff' : '#333', borderRadius: 10 }}>
                          {d.label} ({d.percent}%)
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8 }}>
                    <input type="number" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0" style={inputStyle} />
                    <input value={motivoDescuento} onChange={e => setMotivoDescuento(e.target.value)} placeholder="Motivo del descuento" style={inputStyle} />
                    <button onClick={handleApplyDiscount} disabled={!motivoDescuento.trim() || Number.parseFloat(descuento) <= 0}
                      style={{ ...btnBase, height: 38, padding: '0 14px', fontSize: 12, background: motivoDescuento.trim() && Number.parseFloat(descuento) > 0 ? '#000' : '#E5E5E5', color: motivoDescuento.trim() && Number.parseFloat(descuento) > 0 ? '#fff' : '#909090', borderRadius: 10 }}>
                      Aplicar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F0F0F0', borderRadius: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: '#909090' }}>Solo managers y admins pueden aplicar descuentos.</span>
                </div>
              )}

              {/* Tip */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>Propina</div>
                {/* Tip tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                  {[
                    ...suggestedTips.map(t => ({ label: t.label, value: t.value, amt: formatPrice(t.value) })),
                    { label: 'Sin', value: 0, amt: '—' },
                  ].map((t, i) => {
                    const active = i < 3 ? Number.parseFloat(propina) === t.value && t.value > 0 : Number.parseFloat(propina) === 0
                    return (
                      <button key={t.label} onClick={() => handleSetTip(t.value)}
                        style={{ padding: '12px 8px', borderRadius: 12, border: `1px solid ${active ? '#000' : '#E5E5E5'}`, background: active ? '#000' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: active ? '#fff' : '#000', fontVariantNumeric: 'tabular-nums' }}>{t.label}</div>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: active ? 'rgba(255,255,255,0.7)' : '#909090', marginTop: 2 }}>{t.amt}</div>
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: '#909090', whiteSpace: 'nowrap' }}>Otra:</span>
                  <input type="number" value={propina} onChange={e => { setPropina(e.target.value); setTipAmount(sessionId, Number.parseFloat(e.target.value) || 0) }}
                    placeholder="0" style={inputStyle} />
                </div>
              </div>

              {/* Totals */}
              <div style={{ border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 0, paddingTop: 10 }}>
                {[
                  { label: `Subtotal`, value: formatPrice(session.subtotal) },
                  { label: `IVA (${config.impuestoPorcentaje}%)`, value: formatPrice(session.impuestos) },
                  ...(currentDiscount > 0 ? [{ label: 'Descuento', value: `-${formatPrice(currentDiscount)}`, green: true }] : []),
                  ...(currentTip > 0 ? [{ label: 'Propina', value: formatPrice(currentTip) }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12.5, padding: '4px 0', color: (row as { green?: boolean }).green ? '#0a3a0a' : 'rgba(0,0,0,0.65)' }}>
                    <span>{row.label}</span>
                    <span style={{ fontWeight: 700, color: (row as { green?: boolean }).green ? '#0a3a0a' : '#000' }}>{row.value}</span>
                  </div>
                ))}
                {montoAbonado > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12.5, padding: '4px 0', color: '#0a3a0a' }}>
                    <span>Abonado</span><span style={{ fontWeight: 700 }}>-{formatPrice(montoAbonado)}</span>
                  </div>
                )}
              </div>

              {/* Grand total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: 16, background: '#000', color: '#fff', borderRadius: 14 }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7 }}>
                    {montoAbonado > 0 ? 'Pendiente' : 'Total a cobrar'}
                  </div>
                  <div style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 34, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                    {formatPrice(montoAbonado > 0 ? pendiente : calculatedTotal)}
                  </div>
                </div>
              </div>

              {/* Partial payment */}
              {pendiente > 0 && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>Registrar abono parcial</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {paymentMethods.map(method => (
                      <button key={method.key} onClick={() => setPartialMethod(method.key)}
                        style={{ ...btnBase, flex: 1, minWidth: 60, height: 40, fontSize: 12, borderRadius: 10, border: `1px solid ${partialMethod === method.key ? '#000' : '#E5E5E5'}`, background: partialMethod === method.key ? '#F0F0F0' : '#fff', color: '#333' }}>
                        {method.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} placeholder={`Hasta ${formatPrice(pendiente)}`} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={handlePartialPayment} disabled={!partialMethod || !partialAmount || Number(partialAmount) <= 0}
                      style={{ ...btnBase, height: 38, padding: '0 14px', fontSize: 12, background: partialMethod && Number(partialAmount) > 0 ? '#000' : '#E5E5E5', color: partialMethod && Number(partialAmount) > 0 ? '#fff' : '#909090', borderRadius: 10 }}>
                      Abonar
                    </button>
                  </div>
                </div>
              )}

              {/* Payment method */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>Método de pago</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${paymentMethods.length}, 1fr)`, gap: 8 }}>
                  {paymentMethods.map(method => (
                    <button key={method.key} onClick={() => setSelectedMethod(method.key)}
                      style={{ padding: '12px 8px', borderRadius: 12, border: `1px solid ${selectedMethod === method.key ? '#000' : '#E5E5E5'}`, background: selectedMethod === method.key ? '#F0F0F0' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 20, color: '#333' }}>{method.icon}</div>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#333' }}>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={printReceipt} style={{ ...btnBase, flex: 1, height: 44, fontSize: 13, background: '#F0F0F0', color: '#333', borderRadius: 12 }}>
                  ⎙ Imprimir
                </button>
                <button onClick={() => setShowConfirm(true)} disabled={!selectedMethod || isAlreadyPaid || pendiente <= 0}
                  style={{ ...btnBase, flex: 1, height: 44, fontSize: 13, background: selectedMethod && !isAlreadyPaid && pendiente > 0 ? '#BEEBBE' : '#E5E5E5', color: selectedMethod && !isAlreadyPaid && pendiente > 0 ? '#0a3a0a' : '#909090', borderRadius: 12, cursor: selectedMethod && !isAlreadyPaid && pendiente > 0 ? 'pointer' : 'not-allowed' }}>
                  {montoAbonado > 0 ? `Cobrar resto (${formatPrice(pendiente)})` : 'Cobrar'}
                </button>
              </div>

              {/* Online payment */}
              {!isAlreadyPaid && pendiente > 0 && (
                <div>
                  {onlinePaymentUrl ? (
                    <a href={onlinePaymentUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', height: 40, borderRadius: 10, border: '1px solid #E5E5E5', fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#333', textDecoration: 'none', background: '#fff' }}>
                      ↗ Abrir link de pago online
                    </a>
                  ) : (
                    <button onClick={handleOnlinePayment} disabled={isCreatingOnlinePayment}
                      style={{ ...btnBase, width: '100%', height: 40, fontSize: 12, background: '#F0F0F0', color: '#333', borderRadius: 10, opacity: isCreatingOnlinePayment ? 0.6 : 1 }}>
                      {isCreatingOnlinePayment ? <CssSpinner /> : null}
                      Generar link de pago online
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ─── Split bill mode ─── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Totals summary */}
              <div style={{ border: '1px solid #F0F0F0', borderRadius: 14, padding: 12 }}>
                {[
                  { label: `Subtotal`, value: formatPrice(session.subtotal) },
                  { label: `IVA (${config.impuestoPorcentaje}%)`, value: formatPrice(session.impuestos) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12.5, padding: '4px 0', color: 'rgba(0,0,0,0.65)' }}>
                    <span>{row.label}</span><span style={{ fontWeight: 700, color: '#000' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 13, fontWeight: 700, paddingTop: 8, borderTop: '1px solid #F0F0F0', marginTop: 4 }}>
                  <span>Total</span><span>{formatPrice(calculatedTotal)}</span>
                </div>
              </div>

              {/* People picker */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>¿Entre cuántas personas?</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n} onClick={() => setSplitCount(n)}
                      style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${splitCount === n ? '#000' : '#E5E5E5'}`, background: splitCount === n ? '#000' : '#fff', color: splitCount === n ? '#fff' : '#333', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: '#909090' }}>{paidCount} de {splitCount} pagados</span>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>≈ {formatPrice(baseShare)} c/u</span>
              </div>

              {/* Balance warning */}
              {diferencia !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: diferencia > 0 ? '#FEF3C7' : '#FEE2E2', fontFamily: MONO, fontSize: 11, fontWeight: 700, color: diferencia > 0 ? '#92400E' : '#991B1B' }}>
                  <span>{diferencia > 0 ? 'Falta asignar' : 'Excede el total en'}</span>
                  <span>{formatPrice(Math.abs(diferencia))}</span>
                </div>
              )}

              {/* Person cards */}
              {splitPayments.map((person, index) => (
                <div key={index} style={{ border: `1px solid ${person.paid ? '#BEEBBE' : '#E5E5E5'}`, borderRadius: 14, padding: 14, background: person.paid ? 'rgba(190,235,190,0.2)' : '#fff', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {person.paid && <span style={{ color: '#0a3a0a', fontSize: 14 }}>✓</span>}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Persona {index + 1}</span>
                    </div>
                    {person.paid ? (
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{formatPrice(resolvedMontos[index])}</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: '#909090' }}>$</span>
                        <input type="number" value={person.monto} onChange={e => setSplitPersonMonto(index, e.target.value)}
                          placeholder={resolvedMontos[index].toFixed(2)}
                          style={{ width: 90, height: 32, borderRadius: 8, border: '1px solid #E5E5E5', padding: '0 8px', fontSize: 13, fontFamily: MONO, textAlign: 'right', outline: 'none' }} />
                      </div>
                    )}
                  </div>
                  {!person.paid ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${paymentMethods.length}, 1fr)`, gap: 6, marginBottom: 10 }}>
                        {paymentMethods.map(method => (
                          <button key={method.key} onClick={() => setSplitPersonMethod(index, method.key)}
                            style={{ padding: '8px 4px', borderRadius: 10, border: `1px solid ${person.method === method.key ? '#000' : '#E5E5E5'}`, background: person.method === method.key ? '#F0F0F0' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ fontSize: 16, color: '#333' }}>{method.icon}</div>
                            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#666' }}>{method.label}</span>
                          </button>
                        ))}
                      </div>
                      <button disabled={!person.method} onClick={() => markSplitPersonPaid(index)}
                        style={{ ...btnBase, width: '100%', height: 36, fontSize: 13, background: person.method ? '#000' : '#E5E5E5', color: person.method ? '#fff' : '#909090', borderRadius: 10, cursor: person.method ? 'pointer' : 'not-allowed' }}>
                        ✓ Marcar pagado
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#0a3a0a' }}>Pagado con {methodLabel(person.method)}</span>
                      <button onClick={() => unmarkSplitPersonPaid(index)} style={{ fontFamily: MONO, fontSize: 11, color: '#909090', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Deshacer</button>
                    </div>
                  )}
                </div>
              ))}

              {/* Bottom actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={printSplitReceipt} style={{ ...btnBase, flex: 1, height: 44, fontSize: 13, background: '#F0F0F0', color: '#333', borderRadius: 12 }}>⎙ Imprimir</button>
                {allSplitPaid && diferencia === 0 ? (
                  <button onClick={handleCloseSplitBill} style={{ ...btnBase, flex: 1, height: 44, fontSize: 13, background: '#BEEBBE', color: '#0a3a0a', borderRadius: 12 }}>✓ Cerrar cuenta</button>
                ) : (
                  <div style={{ flex: 1, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F0F0', fontFamily: MONO, fontSize: 12, color: '#909090' }}>
                    {!allSplitPaid ? `${paidCount} de ${splitCount} pagados` : diferencia > 0 ? `Falta ${formatPrice(diferencia)}` : `Excede ${formatPrice(Math.abs(diferencia))}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, zIndex: 20 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center', fontFamily: FONT }}>
              <div style={{ width: 52, height: 52, borderRadius: 999, background: '#BEEBBE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24 }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', marginBottom: 6 }}>Confirmar cobro</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>
                {montoAbonado > 0 ? (
                  <span>Restante: <strong style={{ color: '#000' }}>{formatPrice(pendiente)}</strong><br /></span>
                ) : (
                  <span>Total: <strong style={{ color: '#000' }}>{formatPrice(calculatedTotal)}</strong><br /></span>
                )}
                Método: <span style={{ color: '#000', fontWeight: 700 }}>{methodLabel(selectedMethod)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowConfirm(false)} style={{ ...btnBase, flex: 1, height: 42, fontSize: 14, background: '#F0F0F0', color: '#333' }}>Cancelar</button>
                <button onClick={handleConfirmPayment} style={{ ...btnBase, flex: 1, height: 42, fontSize: 14, background: '#BEEBBE', color: '#0a3a0a' }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
