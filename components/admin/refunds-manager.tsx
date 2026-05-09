'use client'

import { useState } from 'react'
import { RotateCcw, Search, Calendar, DollarSign, Package, User } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
import { RefundDialog } from '@/components/shared/refund-dialog'

export function RefundsManager() {
  const { refunds, orders, users, currentUser } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<string | null>(null)
  const canProcessRefund = currentUser?.role === 'admin'

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price)

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const getOrderNumber = (orderId: string) => orders.find(o => o.id === orderId)?.numero || 'N/A'
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.nombre || 'Sistema'

  const filteredRefunds = refunds.filter(refund => {
    if (!searchTerm) return true
    return getOrderNumber(refund.orderId).toString().includes(searchTerm) ||
           refund.motivo.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const sortedRefunds = [...filteredRefunds].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalRefunded = refunds.reduce((sum, r) => sum + r.monto, 0)
  const today = new Date()
  const refundedToday = refunds
    .filter(r => new Date(r.createdAt).toDateString() === today.toDateString())
    .reduce((sum, r) => sum + r.monto, 0)

  const refundableOrders = orders.filter(o =>
    o.status === 'entregado' && !refunds.some(r => r.orderId === o.id && r.tipo === 'total')
  )

  const selectedOrder = selectedOrderForRefund ? orders.find(o => o.id === selectedOrderForRefund) : null

  return (
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: <RotateCcw className="h-4 w-4 text-amber-600" />, bg: 'bg-amber-100', label: 'Total Reembolsos', value: String(refunds.length) },
          { icon: <DollarSign className="h-4 w-4 text-red-600" />, bg: 'bg-red-100', label: 'Monto Total', value: formatPrice(totalRefunded) },
          { icon: <Calendar className="h-4 w-4 text-blue-600" />, bg: 'bg-blue-100', label: 'Hoy', value: formatPrice(refundedToday) },
        ].map(stat => (
          <div key={stat.label} className={`border border-gray-100 rounded-2xl bg-white p-3 ${stat.label === 'Hoy' ? 'col-span-2 sm:col-span-1' : ''}`}>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 ${stat.bg} rounded-xl shrink-0`}>{stat.icon}</div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 truncate">{stat.label}</p>
                <p className="text-base font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!canProcessRefund && (
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-3">
          <p className="text-xs text-amber-700 font-medium">Solo el administrador puede procesar reembolsos.</p>
        </div>
      )}

      {refundableOrders.length > 0 && canProcessRefund && (
        <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-black text-gray-900">Procesar Nuevo Reembolso</p>
          </div>
          <div className="px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {refundableOrders.slice(0, 10).map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderForRefund(order.id)}
                  className="h-8 px-3 rounded-xl border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                >
                  #{order.numero}
                </button>
              ))}
              {refundableOrders.length > 10 && (
                <span className="text-sm text-gray-400 self-center">+{refundableOrders.length - 10} más</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Buscar por número de pedido o motivo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Pedido</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Monto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Motivo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Procesado por</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Inventario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedRefunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">No hay reembolsos registrados</td>
                </tr>
              ) : (
                sortedRefunds.map(refund => (
                  <tr key={refund.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">#{getOrderNumber(refund.orderId)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${refund.tipo === 'total' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        {refund.tipo === 'total' ? 'Total' : 'Parcial'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-red-600">-{formatPrice(refund.monto)}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-gray-700" title={refund.motivo}>{refund.motivo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-700">
                        <User className="h-3 w-3 text-gray-400" />{getUserName(refund.userId)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(refund.createdAt)}</td>
                    <td className="px-4 py-3">
                      {refund.inventarioRevertido ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 text-[#06C167] flex items-center gap-1 w-fit">
                          <Package className="h-3 w-3" />Revertido
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-200 text-amber-600">Pendiente</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <RefundDialog order={selectedOrder} open={!!selectedOrderForRefund} onOpenChange={(open) => !open && setSelectedOrderForRefund(null)} />
      )}
    </div>
  )
}
