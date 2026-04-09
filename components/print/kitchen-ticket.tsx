'use client'

import { forwardRef } from 'react'
import { type Order, formatTime, getChannelLabel } from '@/lib/store'

interface KitchenTicketProps {
  order: Order
  kitchen?: 'a' | 'b' | 'all'
}

export const KitchenTicket = forwardRef<HTMLDivElement, KitchenTicketProps>(
  ({ order, kitchen = 'all' }, ref) => {
    const kitchenKey = kitchen === 'a' ? 'cocina_a' : kitchen === 'b' ? 'cocina_b' : null
    
    const items = kitchen === 'all' 
      ? order.items 
      : order.items.filter(item => 
          item.menuItem.cocina === kitchenKey || item.menuItem.cocina === 'ambas'
        )
    
    if (items.length === 0) return null
    
    return (
      <div 
        ref={ref}
        className="bg-white text-black font-mono p-4 w-[80mm] text-sm print:p-2"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black border-dashed pb-2 mb-2">
          <h1 className="text-2xl font-bold">COMANDA</h1>
          {kitchen !== 'all' && (
            <p className="text-lg font-bold">
              {kitchen === 'a' ? 'COCINA A - Tacos' : 'COCINA B - Antojitos'}
            </p>
          )}
        </div>
        
        {/* Order Info */}
        <div className="border-b border-black border-dashed pb-2 mb-2">
          <div className="flex justify-between text-lg font-bold">
            <span>#{order.numero}</span>
            <span>{formatTime(order.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{getChannelLabel(order.canal).toUpperCase()}</span>
            {order.mesa && <span>Mesa: {order.mesa}</span>}
          </div>
          {order.nombreCliente && (
            <p className="font-bold mt-1">{order.nombreCliente}</p>
          )}
        </div>
        
        {/* Items */}
        <div className="space-y-2 mb-3">
          {items.map((item, index) => (
            <div key={item.id} className="border-b border-gray-300 pb-1">
              <div className="flex gap-2">
                <span className="text-xl font-bold w-8">{item.cantidad}x</span>
                <div className="flex-1">
                  <p className="font-bold text-base uppercase">{item.menuItem.nombre}</p>
                  {item.extras && item.extras.length > 0 && (
                    <p className="text-xs pl-2">+ {item.extras.map(e => e.nombre).join(', ')}</p>
                  )}
                  {item.notas && (
                    <p className="text-xs pl-2 font-bold">*** {item.notas} ***</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Total Items */}
        <div className="text-center border-t-2 border-black border-dashed pt-2">
          <p className="text-lg">
            Total items: <span className="font-bold">{items.reduce((sum, i) => sum + i.cantidad, 0)}</span>
          </p>
          {order.canal === 'delivery' && order.direccion && (
            <p className="text-xs mt-2 border p-1">
              DELIVERY: {order.direccion}
            </p>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-3 text-center text-xs text-gray-500">
          <p>Impreso: {new Date().toLocaleString('es-MX')}</p>
        </div>
      </div>
    )
  }
)

KitchenTicket.displayName = 'KitchenTicket'
