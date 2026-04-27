'use client'

import { useState } from 'react'
import { History, ChevronRight, ChevronLeft, Receipt, Clock, CreditCard, Calendar } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice, formatDateTime, formatTime, type TableSession } from '@/lib/store'

export function TableHistory() {
  const { tableSessions, tables } = useApp()
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null)

  const activeTables = tables.filter(t => t.activa).sort((a, b) => a.numero - b.numero)

  // Get closed sessions for the selected table, sorted newest first
  const closedSessions = selectedTable !== null
    ? tableSessions
        .filter(s => s.mesa === selectedTable && !s.activa)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  if (selectedSession) {
    return (
      <div className="p-3">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-transparent"
            onClick={() => setSelectedSession(null)}
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Regresar
          </Button>
          <h2 className="text-sm font-bold text-foreground">
            Mesa {selectedSession.mesa} - Detalle de sesion
          </h2>
        </div>

        {/* Session Info */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Inicio</p>
                <p className="font-medium text-foreground">{formatDateTime(selectedSession.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cierre</p>
                <p className="font-medium text-foreground">
                  {selectedSession.paidAt ? formatDateTime(selectedSession.paidAt) : 'Sin pago registrado'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <Badge variant="outline" className={`text-[10px] ${
                  selectedSession.paymentStatus === 'pagado'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {selectedSession.paymentStatus === 'pagado' ? 'Pagada' : 'Cerrada sin pago'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Metodo de pago</p>
                <p className="font-medium text-foreground">
                  {selectedSession.paymentMethod === 'tarjeta' ? 'Tarjeta' :
                   selectedSession.paymentMethod === 'efectivo' ? 'Efectivo' :
                   selectedSession.paymentMethod === 'transferencia' ? 'Transferencia' :
                   selectedSession.paymentMethod === 'apple_pay' ? 'Apple Pay' : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders in this session */}
        <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5" />
          Pedidos ({selectedSession.orders.length})
        </h3>

        {selectedSession.orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <p className="text-xs text-muted-foreground">No hay pedidos registrados para esta sesion</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {selectedSession.orders.map((order) => {
              const orderTotal = order.items.reduce((sum, item) => {
                const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
              }, 0)

              return (
                <Card key={order.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground">Pedido #{order.numero}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(order.createdAt)}</span>
                    </div>
                    <ul className="space-y-1 mb-2">
                      {order.items.map((item) => {
                        const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                        const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                        return (
                          <li key={item.id} className="text-xs">
                            <div className="flex justify-between text-foreground">
                              <span>{item.cantidad}x {item.menuItem.nombre}</span>
                              <span className="text-muted-foreground">{formatPrice(itemTotal)}</span>
                            </div>
                            {item.extras && item.extras.length > 0 && (
                              <div className="ml-3">
                                {item.extras.map((extra) => (
                                  <p key={extra.id} className="text-[10px] text-primary">
                                    + {extra.nombre} (+{formatPrice(extra.precio)})
                                  </p>
                                ))}
                              </div>
                            )}
                            {item.notas && (
                              <p className="ml-3 text-[10px] text-muted-foreground italic">{item.notas}</p>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    <div className="text-right text-xs font-semibold text-foreground border-t border-dashed border-border pt-1">
                      {formatPrice(orderTotal)}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Totals */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(selectedSession.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>IVA</span>
                <span>{formatPrice(selectedSession.impuestos)}</span>
              </div>
              {selectedSession.descuento > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento {selectedSession.descuentoMotivo ? `(${selectedSession.descuentoMotivo})` : ''}</span>
                  <span>-{formatPrice(selectedSession.descuento)}</span>
                </div>
              )}
              {selectedSession.propina > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Propina</span>
                  <span>{formatPrice(selectedSession.propina)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatPrice(selectedSession.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (selectedTable !== null) {
    return (
      <div className="p-3">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-transparent"
            onClick={() => setSelectedTable(null)}
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Mesas
          </Button>
          <h2 className="text-sm font-bold text-foreground">
            Historial - Mesa {selectedTable}
          </h2>
          <Badge variant="outline" className="text-[10px]">
            {closedSessions.length} sesion{closedSessions.length !== 1 ? 'es' : ''}
          </Badge>
        </div>

        {closedSessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <History className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay sesiones pasadas para esta mesa
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {closedSessions.map((session) => {
              const orderCount = session.orders.length
              const itemCount = session.orders.reduce((sum, o) => sum + o.items.length, 0)

              return (
                <Card
                  key={session.id}
                  className="border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedSession(session)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">
                            {formatDateTime(session.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{orderCount} pedido{orderCount !== 1 ? 's' : ''}</span>
                          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                          {session.paymentMethod && (
                            <span className="flex items-center gap-0.5">
                              <CreditCard className="h-2.5 w-2.5" />
                              {session.paymentMethod === 'tarjeta' ? 'Tarjeta' :
                               session.paymentMethod === 'efectivo' ? 'Efectivo' : 'Apple Pay'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{formatPrice(session.total)}</p>
                          <Badge variant="outline" className={`text-[9px] ${
                            session.paymentStatus === 'pagado'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {session.paymentStatus === 'pagado' ? 'Pagada' : 'Cerrada'}
                          </Badge>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Table selection view
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Historial por mesa</h2>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Selecciona una mesa para ver el historial de sesiones pasadas.
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {activeTables.map((table) => {
          const sessionCount = tableSessions.filter(
            s => s.mesa === table.numero && !s.activa
          ).length
          const totalRevenue = tableSessions
            .filter(s => s.mesa === table.numero && !s.activa && s.paymentStatus === 'pagado')
            .reduce((sum, s) => sum + s.total, 0)

          return (
            <Card
              key={table.id}
              className="border cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedTable(table.numero)}
            >
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-foreground">{table.numero}</p>
                <p className="text-[10px] text-muted-foreground">Mesa</p>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">
                    {sessionCount} sesion{sessionCount !== 1 ? 'es' : ''}
                  </p>
                  {totalRevenue > 0 && (
                    <p className="text-[10px] font-medium text-emerald-600">
                      {formatPrice(totalRevenue)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
