'use client'

import { useState } from 'react'
import { RotateCcw, Search, Calendar, DollarSign, Package, User, FileText } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefundDialog } from '@/components/shared/refund-dialog'

export function RefundsManager() {
  const { refunds, orders, users, currentUser } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<string | null>(null)
  const canProcessRefund = currentUser?.role === 'admin'
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price)
  }
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  const getOrderNumber = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    return order?.numero || 'N/A'
  }
  
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.nombre || 'Sistema'
  }
  
  const filteredRefunds = refunds.filter(refund => {
    if (!searchTerm) return true
    const orderNumber = getOrderNumber(refund.orderId)
    return orderNumber.toString().includes(searchTerm) || 
           refund.motivo.toLowerCase().includes(searchTerm.toLowerCase())
  })
  
  const sortedRefunds = [...filteredRefunds].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  // Stats
  const totalRefunded = refunds.reduce((sum, r) => sum + r.monto, 0)
  const refundsToday = refunds.filter(r => {
    const today = new Date()
    const refundDate = new Date(r.createdAt)
    return refundDate.toDateString() === today.toDateString()
  })
  const refundedToday = refundsToday.reduce((sum, r) => sum + r.monto, 0)
  
  // Find orders that can be refunded (delivered orders)
  const refundableOrders = orders.filter(o =>
    o.status === 'entregado' &&
    !refunds.some(r => r.orderId === o.id && r.tipo === 'total')
  )
  
  const selectedOrder = selectedOrderForRefund 
    ? orders.find(o => o.id === selectedOrderForRefund) 
    : null
  
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <RotateCcw className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Reembolsos</p>
                <p className="text-lg font-bold">{refunds.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monto Total</p>
                <p className="text-lg font-bold">{formatPrice(totalRefunded)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hoy</p>
                <p className="text-lg font-bold">{formatPrice(refundedToday)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Refund Section */}
      {!canProcessRefund && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3">
            <p className="text-xs text-amber-700 font-medium">Solo el administrador puede procesar reembolsos.</p>
          </CardContent>
        </Card>
      )}
      {refundableOrders.length > 0 && canProcessRefund && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Procesar Nuevo Reembolso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {refundableOrders.slice(0, 10).map(order => (
                <Button
                  key={order.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrderForRefund(order.id)}
                >
                  #{order.numero}
                </Button>
              ))}
              {refundableOrders.length > 10 && (
                <span className="text-sm text-muted-foreground self-center">
                  +{refundableOrders.length - 10} mas
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por numero de pedido o motivo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {/* Refunds Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Procesado por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Inventario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRefunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay reembolsos registrados
                  </TableCell>
                </TableRow>
              ) : (
                sortedRefunds.map(refund => (
                  <TableRow key={refund.id}>
                    <TableCell>
                      <span className="font-medium">#{getOrderNumber(refund.orderId)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={refund.tipo === 'total' ? 'destructive' : 'secondary'}>
                        {refund.tipo === 'total' ? 'Total' : 'Parcial'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      -{formatPrice(refund.monto)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm" title={refund.motivo}>
                        {refund.motivo}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {getUserName(refund.userId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(refund.createdAt)}
                    </TableCell>
                    <TableCell>
                      {refund.inventarioRevertido ? (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <Package className="h-3 w-3 mr-1" />
                          Revertido
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Refund Dialog */}
      {selectedOrder && (
        <RefundDialog
          order={selectedOrder}
          open={!!selectedOrderForRefund}
          onOpenChange={(open) => !open && setSelectedOrderForRefund(null)}
        />
      )}
    </div>
  )
}
