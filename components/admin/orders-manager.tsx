'use client'

import { useState } from 'react'
import { Plus, Phone, MapPin, Clock, Package, Check, Truck, ShoppingBag, AlertCircle, X, Edit3, MoreVertical } from 'lucide-react'
import { useApp } from '@/lib/context'
import { CancelOrderDialog } from '@/components/shared/cancel-order-dialog'
import { EditOrderDialog } from '@/components/shared/edit-order-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  const [activeTab, setActiveTab] = useState<'table' | 'takeout' | 'delivery'>('table')
  const handleSetTab = (tab: 'table' | 'takeout' | 'delivery') => { setActiveTab(tab); setPage(1) }
  
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
  
  return (
    <div>
      {/* Tabs - Only show tabs if there are orders in multiple channels */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        <button
          onClick={() => handleSetTab('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'table'
              ? 'bg-foreground text-background'
              : 'bg-secondary text-foreground'
          }`}
        >
          <Package className="h-3 w-3" />
          Mesas
          {activeTable.length > 0 && (
            <Badge 
              variant="secondary" 
              className={`text-[9px] h-3.5 px-1 ${
                activeTab === 'table' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
              }`}
            >
              {activeTable.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => handleSetTab('takeout')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'takeout'
              ? 'bg-foreground text-background'
              : 'bg-secondary text-foreground'
          }`}
        >
          <ShoppingBag className="h-3 w-3" />
          Para llevar
          {activeTakeout.length > 0 && (
            <Badge 
              variant="secondary" 
              className={`text-[9px] h-3.5 px-1 ${
                activeTab === 'takeout' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
              }`}
            >
              {activeTakeout.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => handleSetTab('delivery')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'delivery'
              ? 'bg-foreground text-background'
              : 'bg-secondary text-foreground'
          }`}
        >
          <Truck className="h-3 w-3" />
          Delivery
          {activeDelivery.length > 0 && (
            <Badge 
              variant="secondary" 
              className={`text-[9px] h-3.5 px-1 ${
                activeTab === 'delivery' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
              }`}
            >
              {activeDelivery.length}
            </Badge>
          )}
        </button>
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold text-foreground">
            {activeTab === 'table' ? 'Pedidos de mesas' : 
             activeTab === 'takeout' ? 'Pedidos para llevar' : 'Pedidos delivery'}
          </h2>
          <p className="text-[10px] text-muted-foreground">
            {activeCount} pedido{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}
          </p>
        </div>
        {activeTab !== 'table' && (
          <Button 
            size="xs"
            onClick={() => handleCreateOrder(activeTab === 'takeout' ? 'para_llevar' : 'delivery')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Nuevo
          </Button>
        )}
      </div>
      
      {activeTab === 'table' ? (
        <TableOrdersList
          orders={paginatedOrders}
          getTableInfo={getTableInfo}
          onUpdateStatus={updateOrderStatus}
        />
      ) : (
        <OrdersList
          orders={paginatedOrders}
          channel={activeTab === 'takeout' ? 'para_llevar' : 'delivery'}
          onUpdateStatus={updateOrderStatus}
        />
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setPage(p => p + 1)}>
            Cargar más ({currentOrders.length - page * PAGE_SIZE} restantes)
          </Button>
        </div>
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
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Package className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No hay pedidos de mesas</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Los pedidos aparecen cuando los clientes ordenan desde sus mesas
          </p>
        </CardContent>
      </Card>
    )
  }
  
  // Group orders by table
  const ordersByTable = activeOrders.reduce((acc, order) => {
    const mesa = order.mesa || 0
    if (!acc[mesa]) acc[mesa] = []
    acc[mesa].push(order)
    return acc
  }, {} as Record<number, typeof activeOrders>)
  
  return (
    <div className="space-y-3">
      {Object.keys(ordersByTable).length > 0 && (
        <div className="space-y-2">
          {Object.entries(ordersByTable)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([mesa, tableOrders]) => {
              const session = getTableInfo(Number(mesa))
              return (
                <Card key={mesa} className="border">
                  <CardHeader className="p-2 pb-1 border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold">
                          Mesa {mesa}
                        </span>
                        <span className="text-muted-foreground font-normal">
                          {tableOrders.length} pedido{tableOrders.length > 1 ? 's' : ''}
                        </span>
                      </CardTitle>
                      {session && (
                        <span className="text-[9px] text-muted-foreground">
                          Total sesion: ${session.total.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1.5">
                    {tableOrders.map((order) => (
                      <TableOrderCard 
                        key={order.id} 
                        order={order}
                        onUpdateStatus={onUpdateStatus}
                      />
                    ))}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
      
      {completedOrders.length > 0 && (
        <div>
          <h3 className="font-medium text-[10px] text-muted-foreground mb-1.5">Completados hoy</h3>
          <div className="grid gap-1.5">
            {completedOrders.slice(0, 5).map((order) => (
              <Card key={order.id} className="border opacity-60">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium">Mesa {order.mesa}</span>
                      <span className="text-[9px] text-muted-foreground">#{order.numero}</span>
                    </div>
                    <Badge className="text-[9px] h-4 bg-muted text-muted-foreground">
                      Entregado
                    </Badge>
                  </div>
                </CardContent>
              </Card>
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
  
  const canEdit = canEditOrder(order.id)
  const canCancel = canCancelOrder(order.id)
  
  const allKitchensReady = order.cocinaStatus === 'listo'
  
  return (
    <>
      <div className={`p-2 rounded-md border ${
        order.status === 'listo' ? 'border-success bg-green-50' :
        order.status === 'preparando' ? 'border-warning/50 bg-kds-preparing' :
        'border-border bg-card'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-medium text-foreground">Pedido #{order.numero}</span>
              <span className="text-[9px] text-muted-foreground">
                {formatTime(order.createdAt)} ({getTimeDiff(order.createdAt)})
              </span>
            </div>
            <div className="flex flex-wrap gap-1 text-[9px]">
              {order.items.slice(0, 4).map((item, idx) => (
                <span key={item.id} className="text-muted-foreground">
                  {item.cantidad}x {item.menuItem.nombre}{idx < Math.min(order.items.length, 4) - 1 ? ',' : ''}
                </span>
              ))}
              {order.items.length > 4 && (
                <span className="text-muted-foreground">+{order.items.length - 4} mas</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Kitchen Status Badges */}
            {order.status !== 'listo' && order.status !== 'entregado' && (
              <span className={`text-[8px] px-1 py-0.5 rounded ${
                order.cocinaStatus === 'listo' ? 'bg-green-50 text-success' :
                order.cocinaStatus === 'preparando' ? 'bg-kds-preparing text-warning' :
                'bg-muted text-muted-foreground'
              }`}>
                {order.cocinaStatus === 'listo' ? 'Listo' : order.cocinaStatus === 'preparando' ? 'Prep.' : 'Cola'}
              </span>
            )}
            
            <Badge className={`text-[9px] h-4 px-1.5 ${
              order.status === 'listo' ? 'bg-success text-white' :
              order.status === 'preparando' ? 'bg-kds-preparing text-warning' :
              'bg-secondary text-secondary-foreground'
            }`}>
              {getStatusLabel(order.status)}
            </Badge>
            
            {(canEdit || canCancel) && order.status !== 'entregado' && order.status !== 'cancelado' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                      <Edit3 className="h-3 w-3 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      {canEdit && <DropdownMenuSeparator />}
                      <DropdownMenuItem 
                        onClick={() => setShowCancelDialog(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="h-3 w-3 mr-2" />
                        Cancelar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {/* Action button for ready orders */}
        {order.status === 'listo' && allKitchensReady && (
          <div className="mt-2 pt-2 border-t border-border">
            <Button
              size="sm"
              className="w-full h-6 text-[10px] bg-success hover:bg-success/90 text-white"
              onClick={() => onUpdateStatus(order.id, 'entregado')}
            >
              <Check className="h-2.5 w-2.5 mr-1" />
              Marcar entregado
            </Button>
          </div>
        )}
      </div>
      
      <CancelOrderDialog
        order={order}
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
      />
      
      <EditOrderDialog
        order={order}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
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
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Package className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Sin pedidos</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-3">
      {activeOrders.length > 0 && (
        <div>
          <h3 className="font-medium text-[10px] text-foreground mb-1.5">Activos</h3>
          <div className="grid gap-1.5">
            {activeOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                channel={channel}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        </div>
      )}
      
      {completedOrders.length > 0 && (
        <div>
          <h3 className="font-medium text-[10px] text-muted-foreground mb-1.5">Completados</h3>
          <div className="grid gap-1.5">
            {completedOrders.slice(0, 4).map((order) => (
              <OrderCard 
                key={order.id} 
                order={order}
                channel={channel}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
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
  
  const canEdit = canEditOrder(order.id)
  const canCancel = canCancelOrder(order.id)
  const total = order.items.reduce((sum, item) => {
    const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
    return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
  }, 0)
  
  const allKitchensReady = order.cocinaStatus === 'listo'
  
  const getNextAction = () => {
    if (order.status === 'entregado') return null
    
    if (order.status === 'listo') {
      if (channel === 'delivery') {
        return { label: 'En camino', status: 'en_camino' as OrderStatus }
      }
      return { label: 'Entregado', status: 'entregado' as OrderStatus }
    }
    
    if (order.status === 'en_camino') {
      return { label: 'Entregado', status: 'entregado' as OrderStatus }
    }
    
    return null
  }
  
  const nextAction = getNextAction()
  
  return (
    <div>
      <Card className={`border transition-all ${
        order.status === 'entregado' ? 'opacity-50' : ''
      } ${order.status === 'listo' ? 'border-success bg-green-50' : ''} ${
        order.status === 'en_camino' ? 'border-accent bg-muted' : ''
      }`}>
        <CardContent className="p-2">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs">#{order.numero}</CardTitle>
              <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2 w-2" />
                {formatTime(order.createdAt)} ({getTimeDiff(order.createdAt)})
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              {(canEdit || canCancel) && order.status !== 'entregado' && order.status !== 'cancelado' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Edit3 className="h-3 w-3 mr-2" />
                        Editar pedido
                      </DropdownMenuItem>
                    )}
                    {canCancel && (
                      <>
                        {canEdit && <DropdownMenuSeparator />}
                        <DropdownMenuItem 
                          onClick={() => setShowCancelDialog(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <X className="h-3 w-3 mr-2" />
                          Cancelar pedido
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Badge className={`text-[9px] h-4 px-1.5 ${
                order.status === 'listo' ? 'bg-success text-white' :
                order.status === 'preparando' ? 'bg-kds-preparing text-warning' :
                order.status === 'entregado' ? 'bg-muted text-muted-foreground' :
                order.status === 'en_camino' ? 'bg-black text-white' :
                'bg-muted text-muted-foreground'
              }`}>
                {order.status === 'en_camino' ? 'En camino' : getStatusLabel(order.status)}
              </Badge>
            </div>
          </div>
          
          {/* Customer Info */}
          {order.nombreCliente && (
            <div className="mb-1.5 p-1.5 bg-secondary rounded text-[10px]">
              <p className="font-medium text-foreground">{order.nombreCliente}</p>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                {order.telefono && (
                  <p className="text-muted-foreground flex items-center gap-0.5">
                    <Phone className="h-2 w-2" />
                    {order.telefono}
                  </p>
                )}
                {order.direccion && (
                  <p className="text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="h-2 w-2" />
                    <span className="truncate max-w-[120px]">{order.direccion}</span>
                  </p>
                )}
                {order.zonaReparto && (
                  <Badge variant="outline" className="text-[8px] h-3.5">
                    {order.zonaReparto}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Items */}
          <ul className="space-y-0.5 mb-1.5">
            {order.items.slice(0, 3).map((item) => (
              <li key={item.id} className="text-[10px] flex justify-between text-foreground">
                <span className="truncate">{item.cantidad}x {item.menuItem.nombre}</span>
              </li>
            ))}
            {order.items.length > 3 && (
              <li className="text-[9px] text-muted-foreground">
                +{order.items.length - 3} mas...
              </li>
            )}
          </ul>
          
          {/* Kitchen Status */}
          {order.status !== 'entregado' && order.status !== 'en_camino' && (
            <div className="flex gap-1 text-[9px] mb-2">
              <span className={`px-1.5 py-0.5 rounded ${
                order.cocinaStatus === 'listo' ? 'bg-green-50 text-success' :
                order.cocinaStatus === 'preparando' ? 'bg-kds-preparing text-warning' :
                'bg-muted text-muted-foreground'
              }`}>
                Cocina: {order.cocinaStatus === 'listo' ? 'Listo' :
                         order.cocinaStatus === 'preparando' ? 'Prep.' : 'Cola'}
              </span>
              {!allKitchensReady && (
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Esperando cocina
                </span>
              )}
            </div>
          )}
          
          <div className="flex justify-between items-center pt-1.5 border-t border-border">
            <div>
              <span className="text-[9px] text-muted-foreground">Total</span>
              <span className="font-semibold text-xs text-foreground ml-1">{formatPrice(total)}</span>
            </div>
            
            {nextAction && allKitchensReady && (
              <Button
                size="sm"
                className={`h-6 text-[10px] px-2 ${
                  nextAction.status === 'entregado' ? 'bg-success hover:bg-success/90 text-white' :
                  nextAction.status === 'en_camino' ? 'bg-black hover:bg-black/90 text-white' :
                  'bg-black text-white'
                }`}
                onClick={() => onUpdateStatus(order.id, nextAction.status)}
              >
                {nextAction.status === 'en_camino' && <Truck className="h-2.5 w-2.5 mr-1" />}
                {nextAction.status === 'entregado' && <Check className="h-2.5 w-2.5 mr-1" />}
                {nextAction.label}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      <CancelOrderDialog
        order={order}
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
      />
      
      <EditOrderDialog
        order={order}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </div>
  )
}
