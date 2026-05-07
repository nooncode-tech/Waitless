'use client'

import { useState } from 'react'
import { Plus, Phone, MapPin, Clock, Package, Check, Truck, ShoppingBag, AlertCircle, X, Edit3, MoreVertical, History } from 'lucide-react'
import { useApp } from '@/lib/context'
import { CancelOrderDialog } from '@/components/shared/cancel-order-dialog'
import { EditOrderDialog } from '@/components/shared/edit-order-dialog'
import { OrdersHistory } from './orders-history'
import { 
  formatPrice, 
  formatTime, 
  getStatusLabel,
  getTimeDiff,
  type Channel,
  type OrderStatus
} from '@/lib/store'
import { CreateOrderDialog } from './create-order-dialog'

export function OrdersManager() {
  const { orders, updateOrderStatus, tableSessions } = useApp()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createChannel, setCreateChannel] = useState<Channel>('para_llevar')
  const [activeTab, setActiveTab] = useState<'table' | 'takeout' | 'delivery' | 'history'>('table')
  const handleSetTab = (tab: 'table' | 'takeout' | 'delivery' | 'history') => { setActiveTab(tab); setPage(1) }
  
  // Categorize orders
  const tableOrders = orders.filter(o => o.canal === 'mesa' && o.mesa)
  const deliveryOrders = orders.filter(o => o.canal === 'delivery')
  const takeoutOrders = orders.filter(o => o.canal === 'para_llevar')
  
  const activeTable = tableOrders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
  const activeDelivery = deliveryOrders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
  const activeTakeout = takeoutOrders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
  
  const handleCreateOrder = (channel: Channel) => {
    setCreateChannel(channel)
    setShowCreateDialog(true)
  }

  // Determine which orders to show based on tab
  const getCurrentOrders = () => {
    switch (activeTab) {
      case 'table': return tableOrders
      case 'takeout': return takeoutOrders
      case 'delivery': return deliveryOrders
      default: return tableOrders
    }
  }
  
  const getActiveCount = () => {
    switch (activeTab) {
      case 'table': return activeTable.length
      case 'takeout': return activeTakeout.length
      case 'delivery': return activeDelivery.length
      default: return 0
    }
  }

  const currentOrders = getCurrentOrders()
  const activeCount = getActiveCount()
  const PAGE_SIZE = 30
  const [page, setPage] = useState(1)
  const paginatedOrders = currentOrders.slice(0, page * PAGE_SIZE)
  const hasMore = currentOrders.length > page * PAGE_SIZE
  
  // Get table info for table orders
  const getTableInfo = (mesa: number) => {
    const session = tableSessions.find(s => s.mesa === mesa && s.activa)
    return session
  }
  
  const tabs = [
    { id: 'table' as const, label: 'Mesas', icon: <Package className="h-3.5 w-3.5" />, badge: activeTable.length },
    { id: 'takeout' as const, label: 'Para llevar', icon: <ShoppingBag className="h-3.5 w-3.5" />, badge: activeTakeout.length },
    { id: 'delivery' as const, label: 'Delivery', icon: <Truck className="h-3.5 w-3.5" />, badge: activeDelivery.length },
    { id: 'history' as const, label: 'Historial', icon: <History className="h-3.5 w-3.5" />, badge: 0 },
  ]

  return (
    <div style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => handleSetTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-black text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200'
            }`}>
            {tab.icon}
            {tab.label}
            {tab.badge > 0 && (
              <span className={`min-w-[18px] px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${
                activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-gray-400 font-semibold">
                {activeCount} pedido{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}
              </p>
            </div>
            {activeTab !== 'table' && (
              <button onClick={() => handleCreateOrder(activeTab === 'takeout' ? 'para_llevar' : 'delivery')}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-900 transition-colors">
                <Plus className="h-3.5 w-3.5" />Nuevo
              </button>
            )}
          </div>

          {activeTab === 'table' ? (
            <TableOrdersList orders={paginatedOrders} getTableInfo={getTableInfo} onUpdateStatus={updateOrderStatus} />
          ) : (
            <OrdersList orders={paginatedOrders} channel={activeTab === 'takeout' ? 'para_llevar' : 'delivery'} onUpdateStatus={updateOrderStatus} />
          )}
          {hasMore && (
            <div className="flex justify-center mt-4">
              <button onClick={() => setPage(p => p + 1)}
                className="h-9 px-5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cargar más ({currentOrders.length - page * PAGE_SIZE} restantes)
              </button>
            </div>
          )}
        </>
      )}

      {showCreateDialog && (
        <CreateOrderDialog
          channel={createChannel}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  )
}

// Table Orders List Component
interface TableOrdersListProps {
  orders: ReturnType<typeof useApp>['orders']
  getTableInfo: (mesa: number) => ReturnType<typeof useApp>['tableSessions'][0] | undefined
  onUpdateStatus: (orderId: string, status: OrderStatus) => void
}

function TableOrdersList({ orders, getTableInfo, onUpdateStatus }: TableOrdersListProps) {
  const activeOrders = orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
  const completedOrders = orders.filter(o => o.status === 'entregado')

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
        <Package className="h-8 w-8 mx-auto text-gray-200 mb-3" />
        <p className="text-sm font-semibold text-gray-400">No hay pedidos de mesas</p>
        <p className="text-xs text-gray-300 mt-1">Los pedidos aparecen cuando los clientes ordenan desde sus mesas</p>
      </div>
    )
  }

  const ordersByTable = activeOrders.reduce((acc, order) => {
    const mesa = order.mesa || 0
    if (!acc[mesa]) acc[mesa] = []
    acc[mesa].push(order)
    return acc
  }, {} as Record<number, typeof activeOrders>)

  return (
    <div className="space-y-3">
      {Object.keys(ordersByTable).length > 0 && (
        <div className="space-y-3">
          {Object.entries(ordersByTable).sort(([a], [b]) => Number(a) - Number(b)).map(([mesa, tableOrders]) => {
            const session = getTableInfo(Number(mesa))
            return (
              <div key={mesa} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-black text-white px-2.5 py-1 rounded-lg text-xs font-black">Mesa {mesa}</span>
                    <span className="text-xs text-gray-400 font-medium">{tableOrders.length} pedido{tableOrders.length > 1 ? 's' : ''}</span>
                  </div>
                  {session && (
                    <span className="text-xs font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>${session.total.toFixed(2)}</span>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  {tableOrders.map(order => <TableOrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {completedOrders.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Completados hoy</p>
          <div className="space-y-1.5">
            {completedOrders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 opacity-60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">Mesa {order.mesa}</span>
                  <span className="text-[10px] text-gray-400">#{order.numero}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F9F1] text-[#06C167]">Entregado</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact Table Order Card
interface TableOrderCardProps {
  order: ReturnType<typeof useApp>['orders'][0]
  onUpdateStatus: (orderId: string, status: OrderStatus) => void
}

function TableOrderCard({ order, onUpdateStatus }: TableOrderCardProps) {
  const { canEditOrder, canCancelOrder } = useApp()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const canEdit = canEditOrder(order.id)
  const canCancel = canCancelOrder(order.id)
  const allKitchensReady = order.cocinaStatus === 'listo'

  const statusBg = order.status === 'listo' ? 'bg-emerald-50 border-[#06C167]/30' : order.status === 'preparando' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
  const kitchenBadge = order.cocinaStatus === 'listo' ? 'bg-[#E8F9F1] text-[#06C167]' : order.cocinaStatus === 'preparando' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'
  const kitchenLabel = order.cocinaStatus === 'listo' ? 'Cocina: Listo' : order.cocinaStatus === 'preparando' ? 'Cocina: Prep.' : 'Cocina: Cola'

  return (
    <>
      <div className={`p-3 rounded-xl border ${statusBg}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-gray-900">#{order.numero}</span>
              <span className="text-[10px] text-gray-400">{formatTime(order.createdAt)} · {getTimeDiff(order.createdAt)}</span>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              {order.items.slice(0, 4).map(i => `${i.cantidad}× ${i.menuItem.nombre}`).join(', ')}
              {order.items.length > 4 && ` +${order.items.length - 4} más`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {order.status !== 'listo' && order.status !== 'entregado' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kitchenBadge}`}>{kitchenLabel}</span>
            )}
            {(canEdit || canCancel) && order.status !== 'entregado' && order.status !== 'cancelado' && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/10 text-gray-500"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-7 z-10 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[130px]">
                    {canEdit && (
                      <button
                        onClick={() => { setShowEditDialog(true); setShowMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Edit3 className="h-3 w-3" />Editar
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => { setShowCancelDialog(true); setShowMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {order.status === 'listo' && allKitchensReady && (
          <button onClick={() => onUpdateStatus(order.id, 'entregado')}
            className="mt-2.5 w-full h-8 rounded-xl bg-[#06C167] hover:bg-[#05a857] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
            <Check className="h-3 w-3" />Marcar entregado
          </button>
        )}
      </div>
      <CancelOrderDialog order={order} open={showCancelDialog} onOpenChange={setShowCancelDialog} />
      <EditOrderDialog order={order} open={showEditDialog} onOpenChange={setShowEditDialog} />
    </>
  )
}

interface OrdersListProps {
  orders: ReturnType<typeof useApp>['orders']
  channel: Channel
  onUpdateStatus: (orderId: string, status: OrderStatus) => void
}

function OrdersList({ orders, channel, onUpdateStatus }: OrdersListProps) {
  const activeOrders = orders.filter(o => o.status !== 'entregado')
  const completedOrders = orders.filter(o => o.status === 'entregado')

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
        <Package className="h-8 w-8 mx-auto text-gray-200 mb-3" />
        <p className="text-sm font-semibold text-gray-400">Sin pedidos</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeOrders.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Activos</p>
          <div className="space-y-2">
            {activeOrders.map(order => <OrderCard key={order.id} order={order} channel={channel} onUpdateStatus={onUpdateStatus} />)}
          </div>
        </div>
      )}
      {completedOrders.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Completados</p>
          <div className="space-y-2">
            {completedOrders.slice(0, 4).map(order => <OrderCard key={order.id} order={order} channel={channel} onUpdateStatus={onUpdateStatus} />)}
          </div>
        </div>
      )}
    </div>
  )
}

interface OrderCardProps {
  order: ReturnType<typeof useApp>['orders'][0]
  channel: Channel
  onUpdateStatus: (orderId: string, status: OrderStatus) => void
}

function OrderCard({ order, channel, onUpdateStatus }: OrderCardProps) {
  const { canEditOrder, canCancelOrder } = useApp()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const canEdit = canEditOrder(order.id)
  const canCancel = canCancelOrder(order.id)
  const total = order.items.reduce((sum, item) => {
    const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
    return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
  }, 0)

  const isFinished = order.status === 'entregado' || order.status === 'cancelado'

  const phases: OrderStatus[] = channel === 'delivery'
    ? ['recibido', 'preparando', 'listo', 'en_camino', 'entregado']
    : ['recibido', 'preparando', 'listo', 'entregado']

  const PHASE_LABELS: Record<string, string> = {
    recibido: 'Recibido', preparando: 'Preparando', listo: 'Listo',
    en_camino: 'En camino', entregado: 'Entregado',
  }

  const currentIdx = phases.indexOf(order.status as OrderStatus)
  const nextStatus = !isFinished && currentIdx >= 0 && currentIdx < phases.length - 1
    ? phases[currentIdx + 1]
    : null

  const cardBg =
    isFinished                            ? 'bg-gray-50 opacity-60 border-gray-100' :
    order.status === 'listo'              ? 'bg-emerald-50 border-[#06C167]/30' :
    order.status === 'preparando'         ? 'bg-amber-50 border-amber-200' :
    order.status === 'en_camino'          ? 'bg-gray-50 border-gray-200' :
    'bg-white border-gray-100'

  const dotColor: Record<string, string> = {
    recibido: 'bg-blue-400', preparando: 'bg-amber-400',
    listo: 'bg-[#06C167]', en_camino: 'bg-gray-900', entregado: 'bg-gray-400',
  }

  const nextBtnStyle: Record<string, string> = {
    preparando: 'bg-amber-500 hover:bg-amber-600 text-white',
    listo:      'bg-[#06C167] hover:bg-[#05a856] text-white',
    en_camino:  'bg-gray-900 hover:bg-black text-white',
    entregado:  'bg-[#06C167] hover:bg-[#05a856] text-white',
  }

  return (
    <div className="relative">
      <div className={`rounded-2xl border p-3 transition-all ${cardBg}`}>

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="text-xs font-black text-gray-900">#{order.numero}</span>
            <p className="text-[9px] text-gray-400 flex items-center gap-0.5 mt-0.5">
              <Clock className="h-2 w-2" />
              {formatTime(order.createdAt)} ({getTimeDiff(order.createdAt)})
            </p>
          </div>
          {(canEdit || canCancel) && !isFinished && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/10 text-gray-500"
              >
                <MoreVertical className="h-3 w-3" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-7 z-10 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[140px]">
                  {canEdit && (
                    <button
                      onClick={() => { setShowEditDialog(true); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Edit3 className="h-3 w-3" />Editar pedido
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => { setShowCancelDialog(true); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                    >
                      <X className="h-3 w-3" />Cancelar pedido
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phase stepper */}
        {!isFinished && (
          <div className="mb-3">
            <div className="flex items-center">
              {phases.map((phase, i) => {
                const done    = i < currentIdx
                const current = i === currentIdx
                return (
                  <div key={phase} className="flex items-center flex-1 last:flex-none">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                      done    ? 'bg-gray-300' :
                      current ? dotColor[phase] :
                      'bg-gray-200'
                    } ${current ? 'ring-2 ring-offset-1 ring-current/40' : ''}`} />
                    {i < phases.length - 1 && (
                      <div className={`flex-1 h-px mx-0.5 ${done ? 'bg-gray-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-1 px-px">
              {phases.map((phase, i) => (
                <span key={phase} className={`text-[8px] leading-none ${
                  i === currentIdx ? 'font-bold text-gray-900' : 'text-gray-400'
                } ${i === phases.length - 1 ? 'text-right' : ''}`}>
                  {PHASE_LABELS[phase]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Customer info */}
        {order.nombreCliente && (
          <div className="mb-2 p-2 bg-white/70 rounded-xl text-[10px]">
            <p className="font-bold text-gray-900">{order.nombreCliente}</p>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
              {order.telefono && (
                <p className="text-gray-500 flex items-center gap-0.5">
                  <Phone className="h-2 w-2" />{order.telefono}
                </p>
              )}
              {order.direccion && (
                <p className="text-gray-500 flex items-center gap-0.5">
                  <MapPin className="h-2 w-2" />
                  <span className="truncate max-w-[120px]">{order.direccion}</span>
                </p>
              )}
              {order.zonaReparto && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-gray-100 text-gray-600">{order.zonaReparto}</span>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <ul className="space-y-0.5 mb-1.5">
          {order.items.slice(0, 3).map((item) => (
            <li key={item.id} className="text-[10px] flex justify-between text-gray-700">
              <span className="truncate">{item.cantidad}x {item.menuItem.nombre}</span>
            </li>
          ))}
          {order.items.length > 3 && (
            <li className="text-[9px] text-gray-400">+{order.items.length - 3} más…</li>
          )}
        </ul>

        {/* Kitchen status chip */}
        {!isFinished && order.status !== 'en_camino' && (
          <div className="flex gap-1 text-[9px] mb-2">
            <span className={`px-1.5 py-0.5 rounded-lg ${
              order.cocinaStatus === 'listo'      ? 'bg-emerald-50 text-[#06C167]' :
              order.cocinaStatus === 'preparando' ? 'bg-amber-50 text-amber-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              Cocina: {order.cocinaStatus === 'listo' ? 'Listo' :
                       order.cocinaStatus === 'preparando' ? 'Prep.' : 'En cola'}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div>
            <span className="text-[9px] text-gray-400">Total</span>
            <span className="font-black text-xs text-gray-900 ml-1">{formatPrice(total)}</span>
          </div>
          {nextStatus && (
            <button
              className={`h-7 text-[10px] px-3 rounded-xl font-semibold flex items-center gap-1 ${nextBtnStyle[nextStatus] ?? 'bg-gray-900 text-white'}`}
              onClick={() => onUpdateStatus(order.id, nextStatus)}
            >
              {nextStatus === 'en_camino' && <Truck className="h-2.5 w-2.5" />}
              {nextStatus === 'entregado' && <Check className="h-2.5 w-2.5" />}
              {PHASE_LABELS[nextStatus]}
            </button>
          )}
        </div>
      </div>

      <CancelOrderDialog order={order} open={showCancelDialog} onOpenChange={setShowCancelDialog} />
      <EditOrderDialog   order={order} open={showEditDialog}   onOpenChange={setShowEditDialog} />
    </div>
  )
}
