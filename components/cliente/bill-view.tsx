'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice } from '@/lib/store'

interface BillViewProps {
  sessionId: string
  mesa: number
  onBack: () => void
  onShowRewards: () => void
  onPayNow?: () => void
}

type PayMode = 'full' | 'split' | 'items'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

export function BillView({ sessionId, mesa, onBack, onShowRewards, onPayNow }: BillViewProps) {
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
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto', fontFamily: FONT }}>
        <header style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: '#F4F4F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4 7l4.5 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: '#000' }}>Mi Cuenta · Mesa {mesa}</span>
        </header>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ fontFamily: MONO, fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>No hay cuenta activa</div>
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

  const payModes: { key: PayMode; label: string; description: string; supported: boolean }[] = [
    {
      key: 'full',
      label: 'Pagar todo',
      description: 'Cubre la cuenta completa de la mesa.',
      supported: true,
    },
    {
      key: 'split',
      label: 'Dividir en partes iguales',
      description: 'Divide el total entre los comensales.',
      supported: true,
    },
    {
      key: 'items',
      label: 'Pagar mis platillos',
      description: 'Cada quien paga lo que pidió.',
      supported: false,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto', fontFamily: FONT }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E5E5', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: '#F4F4F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4 7l4.5 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: '#000', lineHeight: 1 }}>Mi Cuenta</div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>Mesa {mesa}</div>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '16px 16px 220px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Order summary */}
        {session.orders.length > 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 10px' }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>— Tu cuenta —</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {session.orders.map(order => (
                  <div key={order.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(0,0,0,0.45)', letterSpacing: '-0.01em' }}>Pedido #{order.numero}</span>
                      <span style={{
                        background: order.status === 'entregado' ? '#0a3a0a' : order.status === 'listo' ? '#BEEBBE' : '#F4F4F2',
                        color: order.status === 'entregado' ? '#BEEBBE' : order.status === 'listo' ? '#0a3a0a' : 'rgba(0,0,0,0.55)',
                        padding: '3px 8px', borderRadius: 3, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO,
                      }}>
                        {order.status === 'entregado' ? 'Entregado' : order.status === 'listo' ? 'Listo' : order.status === 'cancelado' ? 'Cancelado' : 'En proceso'}
                      </span>
                    </div>
                    {order.items.map(item => {
                      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                      const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'baseline', marginBottom: 5, paddingBottom: 5, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1.5px)', backgroundPosition: 'bottom', backgroundSize: '6px 4px', backgroundRepeat: 'repeat-x' }}>
                          <span style={{ fontSize: 13, color: '#000', letterSpacing: '-0.01em', flex: 1 }}>
                            <span style={{ fontFamily: MONO, color: 'rgba(0,0,0,0.4)', marginRight: 6 }}>{item.cantidad}×</span>
                            {item.menuItem.nombre}
                          </span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: '#000', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{formatPrice(itemTotal)}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F4F4F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="4" y="2" width="14" height="18" rx="2" stroke="#909090" strokeWidth="1.6"/><path d="M8 7h6M8 11h6M8 15h4" stroke="#909090" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: '#000' }}>No hay consumos aún</div>
          </div>
        )}

        {/* Rewards */}
        {canRequest && session.orders.length > 0 && (
          <button
            onClick={onShowRewards}
            style={{ background: '#BEEBBE', border: '1px solid rgba(10,58,10,0.2)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: FONT }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#0a3a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 4h4l-3 2.5 1.2 4L8 10l-3.7 2.5 1.2-4L2.5 6h4L8 2Z" stroke="#BEEBBE" strokeWidth="1.3" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.01em', color: '#0a3a0a' }}>Obtener descuento</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(10,58,10,0.65)', marginTop: 2 }}>Canjeá tus puntos WAITLESS</div>
              </div>
            </div>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2.5L6.5 5L3.5 7.5" stroke="#0a3a0a" strokeWidth="1.4"/></svg>
          </button>
        )}

        {/* Tip */}
        {session.orders.length > 0 && !isPaid && (
          <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>Propina (opcional)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {suggestedTips.map(percent => (
                <button
                  key={percent}
                  onClick={() => handleTipSelect(percent)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 8px', borderRadius: 14, border: '1px solid',
                    borderColor: currentTipPercent === percent ? '#000' : '#E5E5E5',
                    background: currentTipPercent === percent ? '#000' : '#fff',
                    color: currentTipPercent === percent ? '#fff' : '#000',
                    cursor: 'pointer', fontFamily: FONT,
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {percent === 0 ? 'Sin' : `${percent}%`}
                  </span>
                  {percent > 0 && (
                    <span style={{ fontFamily: MONO, fontSize: 10, opacity: 0.7, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(session.subtotal * (percent / 100))}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment mode */}
        {session.orders.length > 0 && !isPaid && session.total > 0 && (
          <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>¿Cómo quieren pagar?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {payModes.map(mode => (
                <button
                  key={mode.key}
                  onClick={() => mode.supported && setPayMode(mode.key)}
                  disabled={!mode.supported}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                    border: '1px solid',
                    borderColor: !mode.supported ? '#E5E5E5' : payMode === mode.key ? '#000' : '#E5E5E5',
                    borderRadius: 14, background: '#fff', cursor: mode.supported ? 'pointer' : 'not-allowed',
                    opacity: mode.supported ? 1 : 0.4, textAlign: 'left', fontFamily: FONT,
                  }}
                >
                  {/* Radio */}
                  <div style={{ width: 18, height: 18, borderRadius: 999, border: '1.5px solid', borderColor: mode.supported && payMode === mode.key ? '#000' : '#E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {mode.supported && payMode === mode.key && (
                      <div style={{ width: 10, height: 10, borderRadius: 999, background: '#000' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.01em', color: '#000' }}>{mode.label}</span>
                      {!mode.supported && (
                        <span style={{ fontFamily: MONO, fontSize: 9.5, color: 'rgba(0,0,0,0.4)', background: '#F4F4F2', padding: '2px 7px', borderRadius: 3 }}>Próximamente</span>
                      )}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>{mode.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Split calculator */}
            {payMode === 'split' && (
              <div style={{ marginTop: 12, background: '#F4F4F2', borderRadius: 12, padding: 16 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', textAlign: 'center', marginBottom: 12 }}>¿Cuántas personas dividen?</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <button
                    onClick={() => setSplitPeople(p => Math.max(2, p - 1))}
                    style={{ width: 40, height: 40, borderRadius: 999, background: '#fff', border: '1px solid #E5E5E5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.04em', color: '#000', width: 40, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{splitPeople}</span>
                  <button
                    onClick={() => setSplitPeople(p => Math.min(20, p + 1))}
                    style={{ width: 40, height: 40, borderRadius: 999, background: '#fff', border: '1px solid #E5E5E5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
                <div style={{ background: '#fff', borderRadius: 10, padding: 12, textAlign: 'center', marginTop: 12 }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>Cada persona paga</div>
                  <div style={{ fontWeight: 700, fontSize: 36, letterSpacing: '-0.05em', color: '#000', lineHeight: 1.1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{formatPrice(splitAmount)}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>{formatPrice(session.total)} ÷ {splitPeople} personas</div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom: totals + CTA */}
      {session.orders.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 520, background: '#fff', borderTop: '1px solid #E5E5E5', padding: '16px 20px 28px', boxSizing: 'border-box' }}>
          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', paddingBottom: 5, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1.5px)', backgroundPosition: 'bottom', backgroundSize: '6px 4px', backgroundRepeat: 'repeat-x' }}>
              <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>Subtotal</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.55)', fontVariantNumeric: 'tabular-nums' }}>{formatPrice(session.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', paddingBottom: 5, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1.5px)', backgroundPosition: 'bottom', backgroundSize: '6px 4px', backgroundRepeat: 'repeat-x' }}>
              <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>IVA ({config.impuestoPorcentaje}%)</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.55)', fontVariantNumeric: 'tabular-nums' }}>{formatPrice(session.impuestos)}</span>
            </div>
            {session.propina > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', paddingBottom: 5, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1.5px)', backgroundPosition: 'bottom', backgroundSize: '6px 4px', backgroundRepeat: 'repeat-x' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>Propina</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.55)', fontVariantNumeric: 'tabular-nums' }}>{formatPrice(session.propina)}</span>
              </div>
            )}
            {session.descuento > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', paddingBottom: 5, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1.5px)', backgroundPosition: 'bottom', backgroundSize: '6px 4px', backgroundRepeat: 'repeat-x' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: '#0a3a0a' }}>Descuento{session.descuentoMotivo ? ` · ${session.descuentoMotivo}` : ''}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: MONO, fontSize: 12, color: '#0a3a0a', fontVariantNumeric: 'tabular-nums' }}>−{formatPrice(session.descuento)}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', paddingTop: 4, borderTop: '1px dashed rgba(0,0,0,0.2)', marginTop: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.04em', color: '#000' }}>TOTAL</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.04em', color: '#000', fontVariantNumeric: 'tabular-nums' }}>
                {payMode === 'split' ? `${formatPrice(splitAmount)} c/u` : formatPrice(session.total)}
              </span>
            </div>
          </div>

          {/* CTA */}
          {isPaid ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', background: '#BEEBBE', borderRadius: 14 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.5 9l4 4L14.5 5" stroke="#0a3a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#0a3a0a', letterSpacing: '-0.02em' }}>Cuenta pagada — ¡Gracias!</span>
            </div>
          ) : isWaiting ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 20px', background: '#FEF9C3', border: '1px solid rgba(180,150,0,0.2)', borderRadius: 14 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3a6 6 0 1 0 0 12A6 6 0 0 0 9 3ZM9 7v3M9 12v.2" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', letterSpacing: '-0.01em' }}>Cuenta solicitada</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(146,64,14,0.7)', textAlign: 'center', marginTop: 2 }}>El mesero vendrá a cobrarte pronto</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onPayNow && (
                <button
                  style={{ width: '100%', height: 52, background: '#000', color: '#fff', borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 15, fontFamily: FONT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.01em' }}
                  onClick={onPayNow}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="4" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.5"/></svg>
                  Pagar ahora
                </button>
              )}
              <button
                style={{
                  width: '100%',
                  height: onPayNow ? 44 : 52,
                  background: onPayNow ? '#fff' : '#000',
                  color: onPayNow ? '#000' : '#fff',
                  borderRadius: 999,
                  border: onPayNow ? '1px solid #E5E5E5' : 'none',
                  fontWeight: 700,
                  fontSize: onPayNow ? 13 : 15,
                  fontFamily: FONT,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  letterSpacing: '-0.01em',
                }}
                onClick={handleRequestBill}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a5 5 0 1 0 0 10A5 5 0 0 0 8 2ZM8 12v2M6 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Llamar al mesero
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
