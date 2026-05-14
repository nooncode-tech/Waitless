'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { CancelOrderDialog } from '@/components/shared/cancel-order-dialog'
import { EditOrderDialog } from '@/components/shared/edit-order-dialog'
import { OrdersHistory } from './orders-history'
import {
  formatPrice,
  formatTime,
  getTimeDiff,
  type Channel,
  type OrderStatus,
} from '@/lib/store'
import { CreateOrderDialog } from './create-order-dialog'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

function getChip(status: string) {
  switch (status) {
    case 'recibido':   return { bg: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.55)', label: 'Pendiente' }
    case 'preparando': return { bg: '#FEF3C7',           color: '#92400E',          label: 'En cocina' }
    case 'listo':      return { bg: '#BEEBBE',           color: '#0a3a0a',          label: 'Listo'     }
    case 'en_camino':  return { bg: '#DBEAFE',           color: '#1d4ed8',          label: 'En camino' }
    case 'entregado':  return { bg: '#000',              color: '#fff',             label: 'Entregado' }
    case 'cancelado':  return { bg: '#FEE2E2',           color: '#991B1B',          label: 'Cancelado' }
    default:           return { bg: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.55)', label: status      }
  }
}

const PHASE_LABELS: Record<string, string> = {
  recibido: 'Recibido', preparando: 'En cocina', listo: 'Listo',
  en_camino: 'En camino', entregado: 'Entregado',
}

export function OrdersManager() {
  const { orders, updateOrderStatus, tableSessions } = useApp()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createChannel, setCreateChannel] = useState<Channel>('para_llevar')
  const [activeTab, setActiveTab] = useState<'table' | 'takeout' | 'delivery' | 'history'>('table')
  const [page, setPage] = useState(1)

  const handleSetTab = (tab: 'table' | 'takeout' | 'delivery' | 'history') => {
    setActiveTab(tab)
    setPage(1)
  }

  const tableOrders   = orders.filter(o => o.canal === 'mesa' && o.mesa)
  const deliveryOrders = orders.filter(o => o.canal === 'delivery')
  const takeoutOrders  = orders.filter(o => o.canal === 'para_llevar')

  const activeTable    = tableOrders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
  const activeDelivery = deliveryOrders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
  const activeTakeout  = takeoutOrders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')

  const handleCreateOrder = (channel: Channel) => {
    setCreateChannel(channel)
    setShowCreateDialog(true)
  }

  const getCurrentOrders = () => {
    switch (activeTab) {
      case 'table':    return tableOrders
      case 'takeout':  return takeoutOrders
      case 'delivery': return deliveryOrders
      default:         return tableOrders
    }
  }

  const getActiveCount = () => {
    switch (activeTab) {
      case 'table':    return activeTable.length
      case 'takeout':  return activeTakeout.length
      case 'delivery': return activeDelivery.length
      default:         return 0
    }
  }

  const currentOrders   = getCurrentOrders()
  const activeCount     = getActiveCount()
  const PAGE_SIZE       = 30
  const paginatedOrders = currentOrders.slice(0, page * PAGE_SIZE)
  const hasMore         = currentOrders.length > page * PAGE_SIZE

  const getTableSession = (mesa: number) =>
    tableSessions.find(s => s.mesa === mesa && s.activa)

  const tabs = [
    { id: 'table'    as const, label: 'Mesas',      badge: activeTable.length    },
    { id: 'takeout'  as const, label: 'Para llevar', badge: activeTakeout.length  },
    { id: 'delivery' as const, label: 'Delivery',    badge: activeDelivery.length },
    { id: 'history'  as const, label: 'Historial',   badge: 0                    },
  ]

  const channelLabel =
    activeTab === 'table'    ? 'Mesas' :
    activeTab === 'takeout'  ? 'Para llevar' : 'Delivery'

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`.adm-om-row:hover{background:#FAFAFA!important}`}</style>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleSetTab(tab.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 30, borderRadius: 999,
              fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.01em',
              background: activeTab === tab.id ? '#000' : '#fff',
              color: activeTab === tab.id ? '#fff' : '#000',
              border: `1px solid ${activeTab === tab.id ? '#000' : '#E5E5E5'}`,
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FONT,
            }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                fontFamily: MONO, fontSize: 9.5, fontWeight: 700,
                padding: '1px 6px', borderRadius: 999,
                background: activeTab === tab.id ? '#BEEBBE' : 'rgba(0,0,0,0.08)',
                color: activeTab === tab.id ? '#0a3a0a' : 'rgba(0,0,0,0.55)',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'history' ? (
        <OrdersHistory />
      ) : (
        <>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#909090', fontWeight: 700 }}>
                {channelLabel}
              </div>
              <h2 style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.04em', fontSize: 24, margin: '4px 0 0' }}>
                Pedidos activos · {activeCount}
              </h2>
            </div>
            {activeTab !== 'table' && (
              <button
                onClick={() => handleCreateOrder(activeTab === 'takeout' ? 'para_llevar' : 'delivery')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  height: 36, padding: '0 16px', borderRadius: 999,
                  background: '#000', color: '#fff',
                  fontWeight: 700, fontSize: 12.5, border: 'none',
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >
                ＋ Nuevo pedido
              </button>
            )}
          </div>

          {/* Empty state */}
          {paginatedOrders.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.06em', fontSize: 64, color: 'rgba(0,0,0,0.08)', lineHeight: 1 }}>Ø</div>
              <div style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 20, marginTop: 14 }}>Sin pedidos</div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#909090', marginTop: 6 }}>
                {activeTab === 'table'
                  ? 'Los pedidos aparecen cuando los clientes ordenan desde sus mesas.'
                  : 'No hay pedidos activos en este canal.'}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {(['Mesa/Pedido', 'Items', 'Estado', 'Tiempo', 'Monto', ''] as const).map((col, i) => (
                      <th key={i} style={{
                        textAlign: i === 5 ? 'right' : 'left',
                        padding: '12px 14px',
                        fontFamily: MONO, fontSize: 10,
                        textTransform: 'uppercase', letterSpacing: '0.18em',
                        color: '#909090', fontWeight: 700,
                        borderBottom: '1px solid #E5E5E5',
                      }}>
                        {i === 0 ? (activeTab === 'table' ? 'Mesa' : 'Pedido') : col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(order => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      isTableChannel={activeTab === 'table'}
                      channel={
                        activeTab === 'delivery' ? 'delivery' :
                        activeTab === 'takeout'  ? 'para_llevar' : 'mesa'
                      }
                      session={order.mesa ? getTableSession(order.mesa) : undefined}
                      onUpdateStatus={updateOrderStatus}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
              <button
                onClick={() => setPage(p => p + 1)}
                style={{
                  height: 36, padding: '0 20px', borderRadius: 999,
                  border: '1px solid #E5E5E5', fontSize: 12.5,
                  fontWeight: 700, color: '#000', background: '#fff',
                  fontFamily: FONT, cursor: 'pointer',
                }}
              >
                Cargar más ({currentOrders.length - page * PAGE_SIZE} restantes)
              </button>
            </div>
          )}
        </>
      )}

      {showCreateDialog && (
        <CreateOrderDialog channel={createChannel} onClose={() => setShowCreateDialog(false)} />
      )}
    </div>
  )
}

interface OrderRowProps {
  order:          ReturnType<typeof useApp>['orders'][0]
  isTableChannel: boolean
  channel:        Channel
  session?:       ReturnType<typeof useApp>['tableSessions'][0]
  onUpdateStatus: (orderId: string, status: OrderStatus) => void
}

function OrderRow({ order, isTableChannel, channel, session, onUpdateStatus }: OrderRowProps) {
  const { canEditOrder, canCancelOrder } = useApp()
  const [showMenu, setShowMenu]               = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showEditDialog, setShowEditDialog]     = useState(false)

  const canEdit   = canEditOrder(order.id)
  const canCancel = canCancelOrder(order.id)
  const isFinished = order.status === 'entregado' || order.status === 'cancelado'
  const chip       = getChip(order.status)

  const phases: OrderStatus[] = channel === 'delivery'
    ? ['recibido', 'preparando', 'listo', 'en_camino', 'entregado']
    : ['recibido', 'preparando', 'listo', 'entregado']

  const currentIdx = phases.indexOf(order.status as OrderStatus)
  const nextStatus = !isFinished && currentIdx >= 0 && currentIdx < phases.length - 1
    ? phases[currentIdx + 1]
    : null

  const total = order.items.reduce((sum, item) => {
    const ext = item.extras?.reduce((e, ex) => e + ex.precio, 0) ?? 0
    return sum + (item.menuItem.precio + ext) * item.cantidad
  }, 0)

  const itemsSummary =
    order.items.slice(0, 3).map(i => `${i.cantidad}× ${i.menuItem.nombre}`).join(' · ') +
    (order.items.length > 3 ? ` +${order.items.length - 3}` : '')

  const identifier = isTableChannel
    ? `Mesa ${String(order.mesa ?? '').padStart(2, '0')}`
    : (order.nombreCliente ?? `#${order.numero}`)

  const monto = isTableChannel && session ? formatPrice(session.total) : formatPrice(total)

  const td: React.CSSProperties = {
    padding: '14px',
    fontSize: 13.5,
    letterSpacing: '-0.01em',
    borderBottom: '1px solid #EFEFEF',
  }

  return (
    <>
      <tr className="adm-om-row" style={{ opacity: isFinished ? 0.65 : 1 }}>
        <td style={{ ...td, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {identifier}
          {!isTableChannel && order.direccion && (
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090', fontWeight: 400, marginTop: 2 }}>
              {order.direccion.slice(0, 32)}
            </div>
          )}
        </td>

        <td style={{ ...td, maxWidth: 280, color: '#000' }}>
          {itemsSummary}
        </td>

        <td style={td}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 8px', borderRadius: 999,
            fontFamily: MONO, fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            background: chip.bg, color: chip.color,
          }}>
            {chip.label}
          </span>
        </td>

        <td style={{ ...td, fontFamily: MONO, fontWeight: 700, fontSize: 12 }}>
          {getTimeDiff(order.createdAt)}
        </td>

        <td style={{ ...td, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 14 }}>
          {monto}
        </td>

        <td style={{ ...td, textAlign: 'right', position: 'relative' }}>
          {order.status === 'cancelado' && (
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#991B1B' }}>Reembolso</span>
          )}
          {order.status === 'entregado' && (
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#909090' }}>Detalle</span>
          )}
          {!isFinished && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                onClick={() => setShowMenu(v => !v)}
                style={{
                  fontFamily: MONO, fontSize: 11, color: '#909090',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                }}
              >
                Cambiar ▾
              </button>
              {showMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: 28, zIndex: 20,
                  background: '#fff', borderRadius: 12,
                  boxShadow: '0 8px 24px -8px rgba(0,0,0,0.18)',
                  border: '1px solid #E5E5E5', overflow: 'hidden', minWidth: 160,
                }}>
                  {nextStatus && (
                    <button
                      onClick={() => { onUpdateStatus(order.id, nextStatus); setShowMenu(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', fontSize: 12.5, fontWeight: 700,
                        color: '#000', background: 'none', border: 'none',
                        cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
                      }}
                    >
                      <span style={{
                        display: 'inline-block', width: 6, height: 6, borderRadius: 999,
                        background: getChip(nextStatus).color,
                      }} />
                      {PHASE_LABELS[nextStatus] ?? nextStatus}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => { setShowEditDialog(true); setShowMenu(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        padding: '10px 14px', fontSize: 12.5, fontWeight: 700,
                        color: '#000', background: 'none',
                        border: 'none', borderTop: '1px solid #EFEFEF',
                        cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
                      }}
                    >
                      Editar pedido
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => { setShowCancelDialog(true); setShowMenu(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        padding: '10px 14px', fontSize: 12.5, fontWeight: 700,
                        color: '#991B1B', background: 'none',
                        border: 'none', borderTop: '1px solid #EFEFEF',
                        cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
                      }}
                    >
                      Cancelar pedido
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </td>
      </tr>
      <CancelOrderDialog order={order} open={showCancelDialog} onOpenChange={setShowCancelDialog} />
      <EditOrderDialog   order={order} open={showEditDialog}   onOpenChange={setShowEditDialog} />
    </>
  )
}
