'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { formatPrice, formatTime, getStatusLabel, type Order } from '@/lib/store'
import { AddOrderDialog } from './add-order-dialog'
import { BillDialog } from './bill-dialog'
import { EditOrderDialog } from '@/components/shared/edit-order-dialog'
import { CancelOrderDialog } from '@/components/shared/cancel-order-dialog'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface TableSessionProps {
  mesa: number
  onBack: () => void
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 360, padding: 20, fontFamily: FONT }}>
        {children}
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const label = getStatusLabel(status as Parameters<typeof getStatusLabel>[0])
  let bg = 'rgba(0,0,0,0.07)', color = 'rgba(0,0,0,0.55)'
  if (status === 'listo') { bg = '#BEEBBE'; color = '#0a3a0a' }
  if (status === 'entregado') { bg = '#BEEBBE'; color = '#0a3a0a' }
  if (status === 'preparando') { bg = '#FEF3C7'; color = '#92400E' }
  if (status === 'cancelado') { bg = '#FEE2E2'; color = '#991B1B' }
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: bg, color, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block' }}>
      {label}
    </span>
  )
}

export function TableSession({ mesa, onBack }: TableSessionProps) {
  const { orders, tableSessions, updateOrderStatus, menuItems, markOrderDelivered, closeTableSession, moveTableSession, mergeTableSessions, splitTableSession, canEditOrder, canCancelOrder, getActiveTables, reopenTableSession, currentUser, getPendingCalls, markCallAttended } = useApp()
  const [showAddOrder, setShowAddOrder] = useState(false)
  const [showBillDialog, setShowBillDialog] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [splitSelectedOrders, setSplitSelectedOrders] = useState<string[]>([])
  const [splitTargetMesa, setSplitTargetMesa] = useState<number | null>(null)
  const [showReopenDialog, setShowReopenDialog] = useState(false)
  const [reopenReason, setReopenReason] = useState('')

  const session = tableSessions.find(s => s.mesa === mesa && s.activa)

  const tableOrders = (session?.orders || []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const activeOrders = tableOrders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
  const deliveredOrders = tableOrders.filter(o => o.status === 'entregado')

  const total = tableOrders.reduce((sum, order) =>
    sum + order.items.reduce((s, item) => {
      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
      return s + (item.menuItem.precio + extrasTotal) * item.cantidad
    }, 0), 0)

  const handleMarkDelivered = (orderId: string) => markOrderDelivered(orderId)

  const isPaid = session?.billStatus === 'pagada'
  const allDelivered = tableOrders.length > 0 && activeOrders.length === 0
  const paymentRequested = session?.paymentStatus === 'pendiente' || session?.paymentStatus === 'parcial'
  const canReopen = canDo(currentUser?.role, 'reabrir_mesa')
  const canBill = allDelivered
  const canCloseTable = session && ((isPaid && allDelivered) || tableOrders.length === 0)

  const closedSession = !session
    ? tableSessions.filter(s => s.mesa === mesa && !s.activa).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null

  const pendingCallsForTable = getPendingCalls().filter(c => c.mesa === mesa)
  const activeCall = pendingCallsForTable[0]

  const handleCloseTable = () => {
    if (session) {
      closeTableSession(session.id)
      onBack()
    }
  }

  const btnBase: React.CSSProperties = { fontFamily: FONT, border: 'none', cursor: 'pointer', borderRadius: 999, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }

  return (
    <div style={{ fontFamily: FONT, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Back nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 6px' }}>
        <button
          onClick={onBack}
          style={{ ...btnBase, width: 36, height: 36, borderRadius: '50%', border: '1px solid #E5E5E5', background: '#fff', fontSize: 16 }}
        >
          ←
        </button>
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#909090', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
          Sesión · Mesa {mesa}
        </span>
        {isPaid && (
          <span style={{ background: '#BEEBBE', color: '#0a3a0a', fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em', marginLeft: 4 }}>
            Pagada
          </span>
        )}
        {paymentRequested && !isPaid && (
          <span style={{ background: '#FEF3C7', color: '#92400E', fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em', marginLeft: 4 }}>
            Cuenta pend.
          </span>
        )}
      </div>

      {/* Call banner */}
      {activeCall && (
        <div style={{ margin: '6px 16px 0', padding: '12px 14px', background: '#BEEBBE', color: '#0a3a0a', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#0a3a0a', display: 'inline-block', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Mesa {mesa} llama</div>
            <div style={{ fontFamily: MONO, fontSize: 10.5 }}>
              {activeCall.tipo === 'cuenta' ? 'Pedir cuenta' : activeCall.tipo === 'atencion' ? 'Atención' : 'Otro'}
              {activeCall.mensaje ? ` · ${activeCall.mensaje}` : ''}
            </div>
          </div>
          <button
            onClick={() => { if (currentUser) markCallAttended(activeCall.id, currentUser.id) }}
            style={{ ...btnBase, background: '#0a3a0a', color: '#BEEBBE', height: 30, padding: '0 12px', fontSize: 11, borderRadius: 999 }}
          >
            Atender
          </button>
        </div>
      )}

      {/* Session head */}
      <div style={{ padding: '16px 16px 16px', borderBottom: '1px solid #EFEFEF' }}>
        <div style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 32, lineHeight: 1 }}>Mesa {mesa}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#909090', marginTop: 4 }}>
          {activeOrders.length} activo{activeOrders.length !== 1 ? 's' : ''}
          {deliveredOrders.length > 0 && ` · ${deliveredOrders.length} entregado${deliveredOrders.length !== 1 ? 's' : ''}`}
        </div>
        {session && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#909090', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Total acumulado</span>
            <span style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
              {formatPrice(session.total)}
            </span>
          </div>
        )}
      </div>

      {/* Secondary actions */}
      {session && !isPaid && (
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid #EFEFEF', flexWrap: 'wrap' }}>
          <button onClick={() => setShowMoveDialog(true)} style={{ ...btnBase, height: 30, padding: '0 12px', fontSize: 12, background: '#F0F0F0', color: '#333' }}>⇄ Mover</button>
          <button onClick={() => setShowMergeDialog(true)} style={{ ...btnBase, height: 30, padding: '0 12px', fontSize: 12, background: '#F0F0F0', color: '#333' }}>⊕ Unir</button>
          {activeOrders.length > 1 && (
            <button onClick={() => { setSplitSelectedOrders([]); setSplitTargetMesa(null); setShowSplitDialog(true) }} style={{ ...btnBase, height: 30, padding: '0 12px', fontSize: 12, background: '#F0F0F0', color: '#333' }}>✂ Separar</button>
          )}
          {canCloseTable && (
            <button onClick={() => setShowCloseConfirm(true)} style={{ ...btnBase, height: 30, padding: '0 12px', fontSize: 12, background: '#FEE2E2', color: '#991B1B' }}>× Cerrar</button>
          )}
        </div>
      )}

      {/* Reopen action */}
      {canReopen && closedSession && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #EFEFEF' }}>
          <button onClick={() => { setReopenReason(''); setShowReopenDialog(true) }} style={{ ...btnBase, height: 34, padding: '0 14px', fontSize: 12, background: '#F3E8FF', color: '#7C3AED' }}>
            ↺ Reabrir sesión
          </button>
        </div>
      )}

      {/* Orders */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 120px' }}>
        {tableOrders.length === 0 ? (
          <div style={{ padding: '50px 0', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, letterSpacing: '-0.06em', fontSize: 60, color: 'rgba(0,0,0,0.08)', lineHeight: 1 }}>Ø</div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#909090', marginTop: 10 }}>Sin consumos en esta mesa</div>
          </div>
        ) : (
          tableOrders.map((order) => {
            const isCancelled = order.status === 'cancelado'
            const isDelivered = order.status === 'entregado'
            return (
              <div key={order.id} style={{ marginTop: 16, opacity: isCancelled ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>
                    Orden #{order.numero} · {formatTime(order.createdAt)}
                    {order.seatNumber ? ` · Asiento ${order.seatNumber}` : ''}
                  </span>
                  <StatusChip status={order.status} />
                </div>

                {order.items.map((item) => {
                  const extrasTotal = item.extras?.reduce((sum, ex) => sum + ex.precio, 0) || 0
                  const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                  return (
                    <div key={item.id}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 0', borderBottom: '1px dashed rgba(0,0,0,0.12)' }}>
                        <span style={{ fontFamily: MONO, fontWeight: 700, color: '#000', minWidth: 24, fontSize: 13 }}>{item.cantidad}×</span>
                        <span style={{ flex: 1, fontSize: 14 }}>{item.menuItem.nombre}</span>
                        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12.5 }}>{formatPrice(itemTotal)}</span>
                      </div>
                      {item.extras && item.extras.length > 0 && (
                        <div style={{ paddingLeft: 32 }}>
                          {item.extras.map(extra => (
                            <div key={extra.id} style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', padding: '2px 0' }}>
                              + {extra.nombre} (+{formatPrice(extra.precio)})
                            </div>
                          ))}
                        </div>
                      )}
                      {item.notas && (
                        <div style={{ paddingLeft: 32, fontFamily: MONO, fontSize: 10.5, color: '#92400E', fontStyle: 'italic', padding: '2px 0 2px 32px' }}>
                          Nota: {item.notas}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Kitchen status */}
                {!isDelivered && !isCancelled && (
                  <div style={{ padding: '6px 0' }}>
                    <span style={{
                      fontFamily: MONO, fontSize: 10, padding: '3px 8px', borderRadius: 999, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                      background: order.cocinaStatus === 'listo' ? '#BEEBBE' : order.cocinaStatus === 'preparando' ? '#FEF3C7' : '#F0F0F0',
                      color: order.cocinaStatus === 'listo' ? '#0a3a0a' : order.cocinaStatus === 'preparando' ? '#92400E' : '#666',
                    }}>
                      Cocina: {order.cocinaStatus === 'listo' ? 'Listo' : order.cocinaStatus === 'preparando' ? 'Preparando' : 'En cola'}
                    </span>
                  </div>
                )}

                {/* Order actions */}
                {!isCancelled && !isDelivered && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 4 }}>
                    {canEditOrder(order.id) && (
                      <button onClick={() => setEditingOrder(order)} style={{ ...btnBase, flex: 1, height: 42, fontSize: 13, background: '#F0F0F0', color: '#333' }}>
                        ✎ Editar
                      </button>
                    )}
                    {canCancelOrder(order.id) && (
                      <button onClick={() => setCancellingOrder(order)} style={{ ...btnBase, flex: 1, height: 42, fontSize: 13, background: '#FEE2E2', color: '#991B1B' }}>
                        × Cancelar
                      </button>
                    )}
                    {order.status === 'listo' && (
                      <button onClick={() => handleMarkDelivered(order.id)} style={{ ...btnBase, flex: 1, height: 42, fontSize: 13, background: '#000', color: '#fff' }}>
                        ✓ Entregado
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Account summary */}
        {session && tableOrders.length > 0 && (
          <div style={{ marginTop: 20, borderTop: '1px dashed rgba(0,0,0,0.2)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12.5, padding: '4px 0', color: 'rgba(0,0,0,0.65)' }}>
              <span>Subtotal</span><span style={{ fontWeight: 700, color: '#000' }}>{formatPrice(session.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12.5, padding: '4px 0', color: 'rgba(0,0,0,0.65)' }}>
              <span>IVA</span><span style={{ fontWeight: 700, color: '#000' }}>{formatPrice(session.impuestos)}</span>
            </div>
            {session.descuento > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12.5, padding: '4px 0', color: '#0a3a0a' }}>
                <span>Descuento</span><span style={{ fontWeight: 700 }}>-{formatPrice(session.descuento)}</span>
              </div>
            )}
            {session.propina > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12.5, padding: '4px 0', color: 'rgba(0,0,0,0.65)' }}>
                <span>Propina</span><span style={{ fontWeight: 700, color: '#000' }}>{formatPrice(session.propina)}</span>
              </div>
            )}
            {isPaid && (
              <div style={{ marginTop: 10, textAlign: 'center', fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#0a3a0a', background: '#BEEBBE', borderRadius: 8, padding: '8px 12px' }}>
                Cuenta pagada
                {session.paymentMethod && (
                  <span style={{ opacity: 0.7, marginLeft: 6 }}>
                    ({session.paymentMethod === 'apple_pay' ? 'Apple Pay' : session.paymentMethod === 'tarjeta' ? 'Tarjeta' : session.paymentMethod === 'transferencia' ? 'Transferencia' : 'Efectivo'})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div style={{ position: 'sticky', bottom: 0, padding: '14px 16px 22px', background: 'linear-gradient(180deg,rgba(255,255,255,0.4),#fff 30%)', display: 'flex', gap: 8 }}>
        {!isPaid && session && (
          <button onClick={() => setShowAddOrder(true)} style={{ ...btnBase, flex: 1, height: 48, fontSize: 14, background: '#fff', color: '#000', border: '1px solid #E5E5E5' }}>
            ＋ Agregar
          </button>
        )}
        {isPaid && session && (
          <button onClick={() => setShowBillDialog(true)} style={{ ...btnBase, flex: 1, height: 48, fontSize: 14, background: '#BEEBBE', color: '#0a3a0a' }}>
            Ver cuenta →
          </button>
        )}
        {!isPaid && session && tableOrders.length > 0 && (
          <button
            onClick={() => setShowBillDialog(true)}
            disabled={!canBill}
            style={{ ...btnBase, flex: 1, height: 48, fontSize: 14, background: canBill ? '#000' : '#E5E5E5', color: canBill ? '#fff' : '#909090', cursor: canBill ? 'pointer' : 'not-allowed' }}
          >
            Cobrar →
          </button>
        )}
        {canCloseTable && !session && closedSession && (
          <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 12, color: '#909090', padding: '14px 0' }}>Mesa cerrada</div>
        )}
      </div>

      {/* ─── Dialogs / Modals ─── */}

      {showAddOrder && (
        <AddOrderDialog mesa={mesa} menuItems={menuItems} onClose={() => setShowAddOrder(false)} />
      )}
      {showBillDialog && session && (
        <BillDialog sessionId={session.id} onClose={() => setShowBillDialog(false)} />
      )}
      <EditOrderDialog order={editingOrder} open={!!editingOrder} onOpenChange={(open) => { if (!open) setEditingOrder(null) }} onUpdated={() => setEditingOrder(null)} />
      <CancelOrderDialog order={cancellingOrder} open={!!cancellingOrder} onOpenChange={(open) => { if (!open) setCancellingOrder(null) }} />

      {/* Move dialog */}
      {showMoveDialog && session && (
        <Overlay onClose={() => setShowMoveDialog(false)}>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', marginBottom: 4 }}>Mover Mesa {mesa}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#909090', marginBottom: 16 }}>Seleccioná la mesa destino (solo mesas libres)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {getActiveTables()
              .filter(t => t.numero !== mesa && !tableSessions.some(s => s.mesa === t.numero && s.activa))
              .map(t => (
                <button key={t.numero} onClick={() => { moveTableSession(session.id, t.numero); setShowMoveDialog(false); onBack() }}
                  style={{ ...btnBase, height: 48, fontSize: 16, fontWeight: 700, background: '#000', color: '#fff', borderRadius: 12 }}>
                  {t.numero}
                </button>
              ))}
          </div>
          {getActiveTables().filter(t => t.numero !== mesa && !tableSessions.some(s => s.mesa === t.numero && s.activa)).length === 0 && (
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#909090', textAlign: 'center', padding: '16px 0' }}>No hay mesas libres disponibles</div>
          )}
          <button onClick={() => setShowMoveDialog(false)} style={{ ...btnBase, width: '100%', height: 44, fontSize: 14, background: '#F0F0F0', color: '#333' }}>Cancelar</button>
        </Overlay>
      )}

      {/* Merge dialog */}
      {showMergeDialog && session && (
        <Overlay onClose={() => setShowMergeDialog(false)}>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', marginBottom: 4 }}>Unir con Mesa {mesa}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#909090', marginBottom: 16 }}>Seleccioná una mesa activa para traer sus pedidos acá</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {tableSessions.filter(s => s.activa && s.mesa !== mesa).map(s => (
              <button key={s.id} onClick={() => { mergeTableSessions(session.id, s.id); setShowMergeDialog(false) }}
                style={{ ...btnBase, height: 48, fontSize: 16, fontWeight: 700, background: '#000', color: '#fff', borderRadius: 12 }}>
                {s.mesa}
              </button>
            ))}
          </div>
          {tableSessions.filter(s => s.activa && s.mesa !== mesa).length === 0 && (
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#909090', textAlign: 'center', padding: '16px 0' }}>No hay otras mesas activas</div>
          )}
          <button onClick={() => setShowMergeDialog(false)} style={{ ...btnBase, width: '100%', height: 44, fontSize: 14, background: '#F0F0F0', color: '#333' }}>Cancelar</button>
        </Overlay>
      )}

      {/* Split dialog */}
      {showSplitDialog && session && (
        <Overlay onClose={() => setShowSplitDialog(false)}>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', marginBottom: 4 }}>Separar pedidos — Mesa {mesa}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#909090', marginBottom: 12 }}>Seleccioná los pedidos a mover y la mesa destino</div>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
            {activeOrders.map(order => (
              <label key={order.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #EFEFEF', cursor: 'pointer', minHeight: 48 }}>
                <input type="checkbox" checked={splitSelectedOrders.includes(order.id)}
                  onChange={e => setSplitSelectedOrders(prev => e.target.checked ? [...prev, order.id] : prev.filter(id => id !== order.id))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Pedido #{order.numero}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#909090' }}>
                    {order.items.map(i => `${i.cantidad}× ${i.menuItem.nombre}`).join(', ')}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Mesa destino:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {getActiveTables()
              .filter(t => t.numero !== mesa && !tableSessions.some(s => s.mesa === t.numero && s.activa))
              .map(t => (
                <button key={t.numero} onClick={() => setSplitTargetMesa(t.numero)}
                  style={{ ...btnBase, height: 44, fontSize: 16, fontWeight: 700, background: splitTargetMesa === t.numero ? '#000' : '#F0F0F0', color: splitTargetMesa === t.numero ? '#fff' : '#333', borderRadius: 12 }}>
                  {t.numero}
                </button>
              ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowSplitDialog(false)} style={{ ...btnBase, flex: 1, height: 44, fontSize: 14, background: '#F0F0F0', color: '#333' }}>Cancelar</button>
            <button
              disabled={splitSelectedOrders.length === 0 || splitTargetMesa === null}
              onClick={() => { if (splitTargetMesa !== null) { splitTableSession(session.id, splitSelectedOrders, splitTargetMesa); setShowSplitDialog(false) } }}
              style={{ ...btnBase, flex: 1, height: 44, fontSize: 14, background: splitSelectedOrders.length > 0 && splitTargetMesa !== null ? '#000' : '#E5E5E5', color: splitSelectedOrders.length > 0 && splitTargetMesa !== null ? '#fff' : '#909090', cursor: splitSelectedOrders.length > 0 && splitTargetMesa !== null ? 'pointer' : 'not-allowed' }}>
              Separar
            </button>
          </div>
        </Overlay>
      )}

      {/* Close confirmation */}
      {showCloseConfirm && (
        <Overlay onClose={() => setShowCloseConfirm(false)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠</div>
            <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.03em', marginBottom: 8 }}>Cerrar mesa {mesa}</div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#666', marginBottom: 20, lineHeight: 1.5 }}>
              {isPaid ? 'La cuenta ya fue pagada. Al cerrar la mesa, el siguiente cliente podrá iniciar una nueva sesión.'
                : tableOrders.length === 0 ? 'Esta mesa no tiene pedidos. Se cerrará la sesión actual.'
                : 'La mesa debe estar pagada antes de poder cerrarla.'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCloseConfirm(false)} style={{ ...btnBase, flex: 1, height: 44, fontSize: 14, background: '#F0F0F0', color: '#333' }}>Cancelar</button>
              <button onClick={handleCloseTable} style={{ ...btnBase, flex: 1, height: 44, fontSize: 14, background: '#991B1B', color: '#fff' }}>Cerrar mesa</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Reopen dialog */}
      {showReopenDialog && closedSession && (
        <Overlay onClose={() => setShowReopenDialog(false)}>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', marginBottom: 4 }}>Reabrir sesión — Mesa {mesa}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#909090', marginBottom: 14, lineHeight: 1.5 }}>Esta acción quedará registrada en el log de auditoría. Indicá el motivo.</div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Motivo (obligatorio)</label>
            <input
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder="Ej: Error en el cobro, cliente volvió..."
              style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid #E5E5E5', padding: '0 12px', fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowReopenDialog(false)} style={{ ...btnBase, flex: 1, height: 44, fontSize: 14, background: '#F0F0F0', color: '#333' }}>Cancelar</button>
            <button
              disabled={!reopenReason.trim()}
              onClick={() => { if (currentUser) { reopenTableSession(closedSession.id, reopenReason.trim(), currentUser.id) } setShowReopenDialog(false) }}
              style={{ ...btnBase, flex: 1, height: 44, fontSize: 14, background: reopenReason.trim() ? '#7C3AED' : '#E5E5E5', color: reopenReason.trim() ? '#fff' : '#909090', cursor: reopenReason.trim() ? 'pointer' : 'not-allowed' }}>
              Confirmar reapertura
            </button>
          </div>
        </Overlay>
      )}
    </div>
  )
}
