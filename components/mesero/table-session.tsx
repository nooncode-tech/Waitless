'use client'

import { useState } from 'react'
import { Plus, Check, Clock, Receipt, CreditCard, Edit3, XCircle, DoorOpen, AlertTriangle, ArrowLeftRight, Merge, Scissors, RefreshCw } from 'lucide-react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPrice, formatTime, getStatusLabel, type Order } from '@/lib/store'
import { AddOrderDialog } from './add-order-dialog'
import { BillDialog } from './bill-dialog'
import { EditOrderDialog } from '@/components/shared/edit-order-dialog'
import { CancelOrderDialog } from '@/components/shared/cancel-order-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TableSessionProps {
  mesa: number
  onBack: () => void
}

export function TableSession({ mesa, onBack }: TableSessionProps) {
  const { orders, tableSessions, updateOrderStatus, menuItems, markOrderDelivered, closeTableSession, moveTableSession, mergeTableSessions, splitTableSession, canEditOrder, canCancelOrder, getActiveTables, reopenTableSession, currentUser } = useApp()
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
  
  const activeOrders = tableOrders.filter(
    o => o.status !== 'entregado' && o.status !== 'cancelado'
  )
  const deliveredOrders = tableOrders.filter(o => o.status === 'entregado')
  
  const total = tableOrders.reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => {
      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
      return itemSum + (item.menuItem.precio + extrasTotal) * item.cantidad
    }, 0)
  }, 0)
  
  const handleMarkDelivered = (orderId: string) => {
    markOrderDelivered(orderId)
  }
  
  // Session state checks
  const isPaid = session?.billStatus === 'pagada'
  const allDelivered = tableOrders.length > 0 && activeOrders.length === 0
  const paymentRequested = session?.paymentStatus === 'pendiente' || session?.paymentStatus === 'parcial'
  const canReopen = canDo(currentUser?.role, 'reabrir_mesa')

  // Find the most recent closed session for this table (for reopen)
  const closedSession = !session
    ? tableSessions
        .filter(s => s.mesa === mesa && !s.activa)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null
  
  // Can only bill when every order is either delivered or cancelled
  const canBill = allDelivered

  // Can close table: paid and all delivered, OR no orders at all
  // Cannot close table if there are unpaid orders
  const canCloseTable = session && (
    (isPaid && allDelivered) || 
    (tableOrders.length === 0)
  )

  const handleCloseTable = () => {
    if (session) {
      closeTableSession(session.id)
      onBack()
    }
  }
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Mesa {mesa}</h2>
              {isPaid && (
                <Badge className="bg-[#16A34A] text-white">
                  Pagada
                </Badge>
              )}
              {paymentRequested && !isPaid && (
                <Badge className="bg-[#D97706] text-white animate-pulse">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Cuenta solicitada
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeOrders.length} pedido{activeOrders.length !== 1 ? 's' : ''} activo{activeOrders.length !== 1 ? 's' : ''}
              {deliveredOrders.length > 0 && ` / ${deliveredOrders.length} entregado${deliveredOrders.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {session && !isPaid && (
            <Button
              variant="outline"
              className="h-8 text-xs bg-transparent"
              onClick={() => setShowMoveDialog(true)}
            >
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
              Mover
            </Button>
          )}
          {session && !isPaid && (
            <Button
              variant="outline"
              className="h-8 text-xs bg-transparent"
              onClick={() => setShowMergeDialog(true)}
            >
              <Merge className="h-3.5 w-3.5 mr-1.5" />
              Unir
            </Button>
          )}
          {session && !isPaid && activeOrders.length > 1 && (
            <Button
              variant="outline"
              className="h-8 text-xs bg-transparent"
              onClick={() => { setSplitSelectedOrders([]); setSplitTargetMesa(null); setShowSplitDialog(true) }}
            >
              <Scissors className="h-3.5 w-3.5 mr-1.5" />
              Separar
            </Button>
          )}
          {canCloseTable && (
            <Button
              variant="outline"
              className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
              onClick={() => setShowCloseConfirm(true)}
            >
              <DoorOpen className="h-3.5 w-3.5 mr-1.5" />
              Cerrar mesa
            </Button>
          )}
          {session && tableOrders.length > 0 && !isPaid && (
            <Button 
              variant="outline"
              className="h-8 text-xs border-amber-500 text-amber-600 hover:bg-amber-50 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowBillDialog(true)}
              disabled={!canBill}
              title={!canBill ? 'Todos los pedidos deben estar entregados para cobrar' : undefined}
            >
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Cobrar
            </Button>
          )}
          {isPaid && session && (
            <Button 
              variant="outline"
              className="h-8 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 bg-transparent"
              onClick={() => setShowBillDialog(true)}
            >
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Ver cuenta
            </Button>
          )}
          {!isPaid && (
            <Button
              className="bg-primary text-primary-foreground h-8 text-xs"
              onClick={() => setShowAddOrder(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Agregar pedido
            </Button>
          )}
          {/* Reopen session — manager o admin */}
          {canReopen && closedSession && (
            <Button
              variant="outline"
              className="h-8 text-xs border-purple-400 text-purple-600 hover:bg-purple-50 bg-transparent"
              onClick={() => { setReopenReason(''); setShowReopenDialog(true) }}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reabrir sesión
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Active Orders */}
        <div>
          <h3 className="font-medium text-sm text-foreground mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pedidos activos
          </h3>
          
          {activeOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Sin pedidos activos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeOrders.map((order) => (
                <Card key={order.id} className="border border-border">
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-1.5">
                        Pedido #{order.numero}
                        {order.seatNumber && <Badge variant="outline" className="text-[10px] h-5">Asiento {order.seatNumber}</Badge>}
                      </CardTitle>
                      <Badge variant="outline" className={`text-[10px] h-5 ${
                        order.status === 'listo' ? 'bg-[#16A34A] text-white border-[#16A34A]' :
                        order.status === 'preparando' ? 'bg-[#FFFBEB] text-[#D97706] border-[#D97706]/30' : ''
                      }`}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatTime(order.createdAt)}
                    </p>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <ul className="space-y-1.5 mb-3">
                      {order.items.map((item) => {
                        const extrasTotal = item.extras?.reduce((sum, ex) => sum + ex.precio, 0) || 0
                        const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                        
                        return (
                          <li key={item.id} className="text-xs">
                            <div className="flex justify-between text-foreground">
                              <span className="font-medium">{item.cantidad}x {item.menuItem.nombre}</span>
                              <span className="text-muted-foreground">
                                {formatPrice(itemTotal)}
                              </span>
                            </div>
                            {item.extras && item.extras.length > 0 && (
                              <div className="ml-3 mt-0.5">
                                {item.extras.map((extra) => (
                                  <p key={extra.id} className="text-[10px] text-[#6B6B6B]">
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
                          </li>
                        )
                      })}
                    </ul>
                    
                    {/* Kitchen Status */}
                    <div className="flex gap-1.5 text-[10px] mb-3">
                      <span className={`px-1.5 py-0.5 rounded ${
                        order.cocinaStatus === 'listo' ? 'bg-[#F0FDF4] text-[#16A34A]' :
                        order.cocinaStatus === 'preparando' ? 'bg-[#FFFBEB] text-[#D97706]' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        Cocina: {order.cocinaStatus === 'listo' ? 'Listo' :
                                 order.cocinaStatus === 'preparando' ? 'Prep.' : 'Cola'}
                      </span>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {canEditOrder(order.id) && (
                        <Button
                          variant="outline"
                          className="flex-1 h-8 text-xs bg-transparent"
                          onClick={() => setEditingOrder(order)}
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                          Editar
                        </Button>
                      )}
                      {canCancelOrder(order.id) && (
                        <Button
                          variant="outline"
                          className="flex-1 h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => setCancellingOrder(order)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Cancelar
                        </Button>
                      )}
                      {order.status === 'listo' && (
                        <Button
                          className="flex-1 bg-[#16A34A] hover:bg-[#16A34A]/90 text-white h-8 text-xs"
                          onClick={() => handleMarkDelivered(order.id)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Entregado
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Account Summary */}
        <div>
          <h3 className="font-medium text-sm text-foreground mb-3 flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Cuenta de la mesa
          </h3>
          
          <Card className="border border-border">
            <CardContent className="p-3">
              {tableOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">Sin consumos</p>
              ) : (
                <>
                  <div className="space-y-2 mb-3">
                    {tableOrders.map((order) => (
                      <div key={order.id} className="border-b border-border pb-2 last:border-0">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-medium text-foreground">Pedido #{order.numero}</span>
                          <Badge variant="outline" className={`text-[10px] h-4 ${
                            order.status === 'entregado' ? 'bg-[#F0FDF4] text-[#16A34A] border-[#16A34A]/30' :
                            order.status === 'cancelado' ? 'bg-red-50 text-red-500 border-red-200' : ''
                          }`}>
                            {order.status === 'entregado' ? 'Entregado' : 
                             order.status === 'cancelado' ? 'Cancelado' : 'Pendiente'}
                          </Badge>
                        </div>
                        {order.items.map((item) => {
                          const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                          const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                          return (
                            <div key={item.id} className="text-xs">
                              <div className="flex justify-between text-muted-foreground">
                                <span>{item.cantidad}x {item.menuItem.nombre}</span>
                                <span>{formatPrice(itemTotal)}</span>
                              </div>
                              {item.extras && item.extras.length > 0 && (
                                <div className="ml-3">
                                  {item.extras.map((extra) => (
                                    <p key={extra.id} className="text-[10px] text-[#6B6B6B]">
                                      + {extra.nombre}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {item.notas && (
                                <p className="ml-3 text-[10px] text-amber-600 italic">
                                  {item.notas}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                  
                  {session && (
                    <div className="border-t border-border pt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatPrice(session.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>IVA</span>
                        <span>{formatPrice(session.impuestos)}</span>
                      </div>
                      {session.descuento > 0 && (
                        <div className="flex justify-between text-xs text-[#16A34A]">
                          <span>Descuento</span>
                          <span>-{formatPrice(session.descuento)}</span>
                        </div>
                      )}
                      {session.propina > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Propina</span>
                          <span>{formatPrice(session.propina)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-dashed">
                        <span>Total</span>
                        <span>{formatPrice(session.total)}</span>
                      </div>
                      {isPaid && (
                        <div className="mt-2 text-center text-xs font-medium text-[#16A34A] bg-[#F0FDF4] rounded-lg py-2">
                          Cuenta pagada
                          {session.paymentMethod && (
                            <span className="text-muted-foreground ml-1">
                              ({session.paymentMethod === 'apple_pay' ? 'Apple Pay' :
                                session.paymentMethod === 'tarjeta' ? 'Tarjeta' :
                                session.paymentMethod === 'transferencia' ? 'Transferencia' : 'Efectivo'})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!session && (
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between text-sm font-bold text-foreground">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Action Buttons */}
                  {!isPaid && session && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        className="w-full bg-black hover:bg-black/90 text-white h-9 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setShowBillDialog(true)}
                        disabled={!canBill}
                        title={!canBill ? 'Todos los pedidos deben estar entregados para cobrar' : undefined}
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        {canBill ? 'Procesar cobro' : 'Pedidos pendientes'}
                      </Button>
                    </div>
                  )}

                  {canCloseTable && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        className="w-full h-9 text-xs border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
                        onClick={() => setShowCloseConfirm(true)}
                      >
                        <DoorOpen className="h-3.5 w-3.5 mr-1.5" />
                        Cerrar mesa
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {showAddOrder && (
        <AddOrderDialog
          mesa={mesa}
          menuItems={menuItems}
          onClose={() => setShowAddOrder(false)}
        />
      )}
      
      {showBillDialog && session && (
        <BillDialog
          sessionId={session.id}
          onClose={() => setShowBillDialog(false)}
        />
      )}

      {/* Edit Order Dialog */}
      <EditOrderDialog
        order={editingOrder}
        open={!!editingOrder}
        onOpenChange={(open) => { if (!open) setEditingOrder(null) }}
        onUpdated={() => setEditingOrder(null)}
      />

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        order={cancellingOrder}
        open={!!cancellingOrder}
        onOpenChange={(open) => { if (!open) setCancellingOrder(null) }}
      />

      {/* Move Table Dialog */}
      {showMoveDialog && session && (
        <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Mover Mesa {mesa}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-3">Selecciona la mesa destino (solo mesas libres)</p>
            <div className="grid grid-cols-4 gap-2">
              {getActiveTables()
                .filter(t => t.numero !== mesa && !tableSessions.some(s => s.mesa === t.numero && s.activa))
                .map(t => (
                  <Button
                    key={t.numero}
                    variant="outline"
                    className="h-10 font-semibold"
                    onClick={() => {
                      moveTableSession(session.id, t.numero)
                      setShowMoveDialog(false)
                      onBack()
                    }}
                  >
                    {t.numero}
                  </Button>
                ))}
            </div>
            {getActiveTables().filter(t => t.numero !== mesa && !tableSessions.some(s => s.mesa === t.numero && s.activa)).length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">No hay mesas libres disponibles</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Merge Table Dialog */}
      {showMergeDialog && session && (
        <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Unir con Mesa {mesa}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-3">
              Selecciona una mesa activa para traer sus pedidos a esta mesa.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {tableSessions
                .filter(s => s.activa && s.mesa !== mesa)
                .map(s => (
                  <Button
                    key={s.id}
                    variant="outline"
                    className="h-10 font-semibold"
                    onClick={() => {
                      mergeTableSessions(session.id, s.id)
                      setShowMergeDialog(false)
                    }}
                  >
                    {s.mesa}
                  </Button>
                ))}
            </div>
            {tableSessions.filter(s => s.activa && s.mesa !== mesa).length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">No hay otras mesas activas</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Split Orders Dialog */}
      {showSplitDialog && session && (
        <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Separar pedidos — Mesa {mesa}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-2">
              Selecciona los pedidos a mover y la mesa destino (debe estar libre).
            </p>
            {/* Order checkboxes */}
            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
              {activeOrders.map(order => (
                <label key={order.id} className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={splitSelectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => {
                      setSplitSelectedOrders(prev =>
                        checked
                          ? [...prev, order.id]
                          : prev.filter(id => id !== order.id)
                      )
                    }}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <p className="font-medium">Pedido #{order.numero}</p>
                    <p className="text-muted-foreground">
                      {order.items.map(i => `${i.cantidad}x ${i.menuItem.nombre}`).join(', ')}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {/* Free table selector */}
            <p className="text-xs font-medium mb-2">Mesa destino:</p>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {getActiveTables()
                .filter(t => t.numero !== mesa && !tableSessions.some(s => s.mesa === t.numero && s.activa))
                .map(t => (
                  <Button
                    key={t.numero}
                    variant={splitTargetMesa === t.numero ? 'default' : 'outline'}
                    className="h-9 text-xs font-semibold"
                    onClick={() => setSplitTargetMesa(t.numero)}
                  >
                    {t.numero}
                  </Button>
                ))}
              {getActiveTables().filter(t => t.numero !== mesa && !tableSessions.some(s => s.mesa === t.numero && s.activa)).length === 0 && (
                <p className="col-span-5 text-xs text-center text-muted-foreground py-2">No hay mesas libres</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowSplitDialog(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary"
                disabled={splitSelectedOrders.length === 0 || splitTargetMesa === null}
                onClick={() => {
                  if (splitTargetMesa !== null) {
                    splitTableSession(session.id, splitSelectedOrders, splitTargetMesa)
                    setShowSplitDialog(false)
                  }
                }}
              >
                Separar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Close Table Confirmation */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-1">Cerrar mesa {mesa}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isPaid 
                  ? 'La cuenta ya fue pagada. Al cerrar la mesa, el siguiente cliente podra iniciar una nueva sesion.'
                  : tableOrders.length === 0 
                  ? 'Esta mesa no tiene pedidos. Se cerrara la sesion actual.'
                  : 'La mesa debe estar pagada antes de poder cerrarla.'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleCloseTable}
                >
                  Cerrar mesa
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reopen Session Dialog — admin only */}
      {showReopenDialog && closedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-foreground">Reabrir sesión — Mesa {mesa}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Esta acción quedará registrada en el log de auditoría. Indicá el motivo.
              </p>
              <div className="mb-4">
                <Label className="text-xs">Motivo (obligatorio)</Label>
                <Input
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Ej: Error en el cobro, cliente volvió..."
                  className="h-9 text-sm mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setShowReopenDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={!reopenReason.trim()}
                  onClick={() => {
                    if (currentUser) {
                      reopenTableSession(closedSession.id, reopenReason.trim(), currentUser.id)
                    }
                    setShowReopenDialog(false)
                  }}
                >
                  Confirmar reapertura
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
