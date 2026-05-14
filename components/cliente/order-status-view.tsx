'use client'

import { useState } from 'react'
import { formatTime, type Order, type OrderStatus } from '@/lib/store'
import { useApp } from '@/lib/context'

interface OrderStatusViewProps {
  orders: Order[]
  mesa: number
  onBack: () => void
}

const STATUS_STEPS = [
  { key: 'recibido',   label: 'Recibido' },
  { key: 'preparando', label: 'Cocinando' },
  { key: 'listo',      label: 'Listo' },
  { key: 'entregado',  label: 'Entregado' },
]

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

function getSegments(status: string): Array<'on' | 'live' | 'off'> {
  switch (status) {
    case 'recibido':   return ['on', 'off', 'off', 'off']
    case 'preparando': return ['on', 'live', 'off', 'off']
    case 'listo':      return ['on', 'on', 'live', 'off']
    case 'entregado':  return ['on', 'on', 'on', 'on']
    default:           return ['off', 'off', 'off', 'off']
  }
}

function getStatusChip(status: string) {
  switch (status) {
    case 'listo':      return { bg: '#BEEBBE', color: '#0a3a0a', label: 'Listo' }
    case 'preparando': return { bg: '#FEF9C3', color: '#92400E', label: 'En cocina' }
    case 'entregado':  return { bg: '#000', color: '#BEEBBE', label: 'Entregado' }
    case 'cancelado':  return { bg: '#FEE2E2', color: '#c00', label: 'Cancelado' }
    default:           return { bg: '#F4F4F2', color: 'rgba(0,0,0,0.55)', label: status }
  }
}

export function OrderStatusView({ orders, mesa, onBack }: OrderStatusViewProps) {
  const { cancelOrder, canCancelOrder } = useApp()
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  if (orders.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto', fontFamily: FONT }}>
        <header style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: '#F4F4F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4 7l4.5 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: '#000' }}>Estado · Mesa {mesa}</span>
        </header>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#F4F4F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="#909090" strokeWidth="1.8"/><path d="M9 8h6M9 12h6M9 16h4" stroke="#909090" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.03em', color: '#000' }}>Sin pedidos activos</div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>Aún no has realizado ningún pedido</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto', fontFamily: FONT }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E5E5', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, background: '#F4F4F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4 7l4.5 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: '#000', lineHeight: 1 }}>Estado de pedidos</div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>Mesa {mesa}</div>
          </div>

          {/* Live dot */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <style>{`@keyframes osPulseDot{0%{box-shadow:0 0 0 0 rgba(190,235,190,.8)}70%{box-shadow:0 0 0 6px rgba(190,235,190,0)}100%{box-shadow:0 0 0 0 rgba(190,235,190,0)}}`}</style>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: '#BEEBBE', display: 'inline-block', animation: 'osPulseDot 1.8s infinite' }} />
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.45)' }}>En vivo</span>
          </div>
        </div>
      </header>

      {/* Orders */}
      <main style={{ flex: 1, padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {orders.map(order => {
          const segments = getSegments(order.status)
          const chip = getStatusChip(order.status)
          const isActive = order.status === 'recibido' || order.status === 'preparando' || order.status === 'listo'

          return (
            <div
              key={order.id}
              style={{
                background: '#fff',
                border: order.status === 'listo' ? '2px solid #BEEBBE' : '1px solid #E5E5E5',
                borderRadius: 16,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Mint top bar when ready */}
              {order.status === 'listo' && (
                <div style={{ height: 3, background: '#BEEBBE' }} />
              )}

              {/* Order header */}
              <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.03em', color: '#000' }}>
                    Pedido #{order.numero}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
                    {formatTime(order.createdAt)}
                  </div>
                </div>
                <div style={{ background: chip.bg, color: chip.color, padding: '4px 10px', borderRadius: 3, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO, flexShrink: 0 }}>
                  {chip.label}
                </div>
              </div>

              {/* Status track */}
              {order.status !== 'cancelado' && (
                <div style={{ padding: '0 16px 14px', borderBottom: '1px solid #EFEFEF' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {segments.map((seg, i) => (
                      <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: seg === 'on' ? '#000' : seg === 'live' ? '#BEEBBE' : 'rgba(0,0,0,0.08)' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: MONO, fontSize: 10, color: 'rgba(0,0,0,0.45)' }}>
                    {STATUS_STEPS.map(step => (
                      <span key={step.key}>{step.label}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 8 }}>Artículos</div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', padding: 0, margin: 0 }}>
                  {order.items.map(item => (
                    <li key={item.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13, color: '#000', letterSpacing: '-0.01em' }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>{item.cantidad}×</span>
                      <span style={{ fontWeight: 600 }}>{item.menuItem.nombre}</span>
                    </li>
                  ))}
                </ul>

                {/* Cancel option */}
                {canCancelOrder(order.id) && (
                  confirmCancelId === order.id ? (
                    <div style={{ marginTop: 14, padding: '12px 14px', background: '#fff0f0', border: '1px solid #FCA5A5', borderRadius: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#c00', marginBottom: 4 }}>¿Cancelar este pedido?</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.55)', marginBottom: 12 }}>Esta acción no se puede deshacer.</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          style={{ flex: 1, height: 36, border: '1px solid #E5E5E5', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#000', background: '#fff', fontFamily: FONT, cursor: 'pointer' }}
                          onClick={() => setConfirmCancelId(null)}
                        >
                          No, mantener
                        </button>
                        <button
                          style={{ flex: 1, height: 36, background: '#c00', color: '#fff', borderRadius: 999, border: 'none', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer' }}
                          onClick={() => {
                            cancelOrder(order.id, 'cliente_solicito', 'Cancelado antes de preparación')
                            setConfirmCancelId(null)
                          }}
                        >
                          Sí, cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      style={{ marginTop: 12, fontSize: 12, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline', padding: 0 }}
                      onClick={() => setConfirmCancelId(order.id)}
                    >
                      Cancelar pedido
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
