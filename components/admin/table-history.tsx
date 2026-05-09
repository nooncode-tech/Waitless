'use client'

import { useState } from 'react'
import { History, ChevronRight, ChevronLeft, Receipt, Clock, CreditCard, Calendar } from 'lucide-react'
import { useApp } from '@/lib/context'
import { formatPrice, formatDateTime, formatTime, type TableSession } from '@/lib/store'

export function TableHistory() {
  const { tableSessions, tables } = useApp()
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null)

  const activeTables = tables.filter(t => t.activa).sort((a, b) => a.numero - b.numero)

  const closedSessions = selectedTable !== null
    ? tableSessions
        .filter(s => s.mesa === selectedTable && !s.activa)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  const sectionStyle = { fontFamily: "'Sora', system-ui, sans-serif" }

  if (selectedSession) {
    return (
      <div className="p-3" style={sectionStyle}>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setSelectedSession(null)} className="h-8 px-3 rounded-xl border border-gray-200 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" />Regresar
          </button>
          <h2 className="text-sm font-black text-gray-900">Mesa {selectedSession.mesa} - Detalle de sesión</h2>
        </div>

        <div className="border border-gray-100 rounded-2xl bg-white p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-400">Inicio</p>
              <p className="font-medium text-gray-900">{formatDateTime(selectedSession.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-400">Cierre</p>
              <p className="font-medium text-gray-900">{selectedSession.paidAt ? formatDateTime(selectedSession.paidAt) : 'Sin pago registrado'}</p>
            </div>
            <div>
              <p className="text-gray-400">Estado</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border w-fit inline-block mt-0.5 ${selectedSession.paymentStatus === 'pagado' ? 'bg-emerald-50 text-[#06C167] border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {selectedSession.paymentStatus === 'pagado' ? 'Pagada' : 'Cerrada sin pago'}
              </span>
            </div>
            <div>
              <p className="text-gray-400">Método de pago</p>
              <p className="font-medium text-gray-900">
                {selectedSession.paymentMethod === 'tarjeta' ? 'Tarjeta' :
                 selectedSession.paymentMethod === 'efectivo' ? 'Efectivo' :
                 selectedSession.paymentMethod === 'transferencia' ? 'Transferencia' :
                 selectedSession.paymentMethod === 'apple_pay' ? 'Apple Pay' : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5" />Pedidos ({selectedSession.orders.length})
        </h3>

        {selectedSession.orders.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl py-6 text-center">
            <p className="text-xs text-gray-400">No hay pedidos registrados para esta sesión</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedSession.orders.map((order) => {
              const orderTotal = order.items.reduce((sum, item) => {
                const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
              }, 0)
              return (
                <div key={order.id} className="border border-gray-100 rounded-2xl bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-900">Pedido #{order.numero}</span>
                    <span className="text-[10px] text-gray-400">{formatTime(order.createdAt)}</span>
                  </div>
                  <ul className="space-y-1 mb-2">
                    {order.items.map((item) => {
                      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                      return (
                        <li key={item.id} className="text-xs">
                          <div className="flex justify-between text-gray-900">
                            <span>{item.cantidad}x {item.menuItem.nombre}</span>
                            <span className="text-gray-400">{formatPrice((item.menuItem.precio + extrasTotal) * item.cantidad)}</span>
                          </div>
                          {item.extras && item.extras.length > 0 && (
                            <div className="ml-3">
                              {item.extras.map((extra) => (
                                <p key={extra.id} className="text-[10px] text-blue-600">+ {extra.nombre} (+{formatPrice(extra.precio)})</p>
                              ))}
                            </div>
                          )}
                          {item.notas && <p className="ml-3 text-[10px] text-gray-400 italic">{item.notas}</p>}
                        </li>
                      )
                    })}
                  </ul>
                  <div className="text-right text-xs font-semibold text-gray-900 border-t border-dashed border-gray-100 pt-1">{formatPrice(orderTotal)}</div>
                </div>
              )
            })}
          </div>
        )}

        <div className="border border-gray-100 rounded-2xl bg-white p-4 mt-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatPrice(selectedSession.subtotal)}</span></div>
            <div className="flex justify-between text-gray-500"><span>IVA</span><span>{formatPrice(selectedSession.impuestos)}</span></div>
            {selectedSession.descuento > 0 && (
              <div className="flex justify-between text-[#06C167]"><span>Descuento {selectedSession.descuentoMotivo ? `(${selectedSession.descuentoMotivo})` : ''}</span><span>-{formatPrice(selectedSession.descuento)}</span></div>
            )}
            {selectedSession.propina > 0 && (
              <div className="flex justify-between text-gray-500"><span>Propina</span><span>{formatPrice(selectedSession.propina)}</span></div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100"><span>Total</span><span>{formatPrice(selectedSession.total)}</span></div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedTable !== null) {
    return (
      <div className="p-3" style={sectionStyle}>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setSelectedTable(null)} className="h-8 px-3 rounded-xl border border-gray-200 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" />Mesas
          </button>
          <h2 className="text-sm font-black text-gray-900">Historial - Mesa {selectedTable}</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500">
            {closedSessions.length} sesión{closedSessions.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {closedSessions.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl py-8 text-center">
            <History className="h-8 w-8 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No hay sesiones pasadas para esta mesa</p>
          </div>
        ) : (
          <div className="space-y-2">
            {closedSessions.map((session) => {
              const orderCount = session.orders.length
              const itemCount = session.orders.reduce((sum, o) => sum + o.items.length, 0)
              return (
                <div
                  key={session.id}
                  className="border border-gray-100 rounded-2xl bg-white p-3 cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-medium text-gray-900">{formatDateTime(session.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span>{orderCount} pedido{orderCount !== 1 ? 's' : ''}</span>
                        <span>{itemCount} ítem{itemCount !== 1 ? 's' : ''}</span>
                        {session.paymentMethod && (
                          <span className="flex items-center gap-0.5">
                            <CreditCard className="h-2.5 w-2.5" />
                            {session.paymentMethod === 'tarjeta' ? 'Tarjeta' : session.paymentMethod === 'efectivo' ? 'Efectivo' : 'Apple Pay'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatPrice(session.total)}</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${session.paymentStatus === 'pagado' ? 'bg-emerald-50 text-[#06C167] border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {session.paymentStatus === 'pagado' ? 'Pagada' : 'Cerrada'}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={sectionStyle}>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-black text-gray-900">Historial por mesa</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">Selecciona una mesa para ver el historial de sesiones pasadas.</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {activeTables.map((table) => {
          const sessionCount = tableSessions.filter(s => s.mesa === table.numero && !s.activa).length
          const totalRevenue = tableSessions
            .filter(s => s.mesa === table.numero && !s.activa && s.paymentStatus === 'pagado')
            .reduce((sum, s) => sum + s.total, 0)
          return (
            <div
              key={table.id}
              className="border border-gray-100 rounded-2xl bg-white p-3 text-center cursor-pointer hover:border-gray-300 transition-colors"
              onClick={() => setSelectedTable(table.numero)}
            >
              <p className="text-lg font-bold text-gray-900">{table.numero}</p>
              <p className="text-[10px] text-gray-400">Mesa</p>
              <div className="mt-2 space-y-0.5">
                <p className="text-[10px] text-gray-400">{sessionCount} sesión{sessionCount !== 1 ? 'es' : ''}</p>
                {totalRevenue > 0 && <p className="text-[10px] font-medium text-[#06C167]">{formatPrice(totalRevenue)}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
