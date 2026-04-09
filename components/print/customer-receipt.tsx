'use client'

import { forwardRef } from 'react'
import { type Order, type TableSession, formatPrice, formatDateTime, getChannelLabel, getPaymentMethodLabel } from '@/lib/store'

interface CustomerReceiptProps {
  order?: Order
  session?: TableSession
  restaurantName?: string
  restaurantAddress?: string
  restaurantPhone?: string
  logoUrl?: string
  poweredByWaitless?: boolean
}

export const CustomerReceipt = forwardRef<HTMLDivElement, CustomerReceiptProps>(
  ({ order, session, restaurantName = '', restaurantAddress = '', restaurantPhone = '', logoUrl, poweredByWaitless = false }, ref) => {
    
    // Calculate totals from session or order
    const items = session ? session.orders.flatMap(o => o.items) : order?.items || []
    const subtotal = session ? session.subtotal : items.reduce((sum, item) => {
      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
      return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
    }, 0)
    const impuestos = session ? session.impuestos : subtotal * 0.16
    const propina = session?.propina || 0
    const descuento = session?.descuento || 0
    const total = session ? session.total : subtotal + impuestos
    
    const orderDate = session ? session.createdAt : order?.createdAt || new Date()
    const orderNumber = session ? session.orders[0]?.numero : order?.numero
    const mesa = session?.mesa || order?.mesa
    
    return (
      <div 
        ref={ref}
        className="bg-white text-black font-mono p-4 w-[80mm] text-sm print:p-2"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-3 mb-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={restaurantName || 'Logo'} className="mx-auto mb-2 h-12 w-auto object-contain" />
          )}
          {restaurantName && <h1 className="text-xl font-bold">{restaurantName}</h1>}
          {restaurantAddress && <p className="text-xs">{restaurantAddress}</p>}
          {restaurantPhone && <p className="text-xs">Tel: {restaurantPhone}</p>}
        </div>
        
        {/* Receipt Info */}
        <div className="border-b border-black border-dashed pb-2 mb-2">
          <div className="flex justify-between">
            <span>Folio:</span>
            <span className="font-bold">#{orderNumber || '---'}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{formatDateTime(orderDate)}</span>
          </div>
          {mesa && (
            <div className="flex justify-between">
              <span>Mesa:</span>
              <span>{mesa}</span>
            </div>
          )}
          {order && (
            <div className="flex justify-between">
              <span>Tipo:</span>
              <span>{getChannelLabel(order.canal)}</span>
            </div>
          )}
        </div>
        
        {/* Items */}
        <div className="border-b border-black border-dashed pb-2 mb-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1">Cant</th>
                <th className="text-left py-1">Descripcion</th>
                <th className="text-right py-1">Precio</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
                const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
                return (
                  <tr key={`${item.id}-${index}`} className="border-b border-gray-200">
                    <td className="py-1">{item.cantidad}</td>
                    <td className="py-1">
                      {item.menuItem.nombre}
                      {item.extras && item.extras.length > 0 && (
                        <span className="text-[10px] block">+ {item.extras.map(e => e.nombre).join(', ')}</span>
                      )}
                    </td>
                    <td className="text-right py-1">{formatPrice(itemTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (16%):</span>
            <span>{formatPrice(impuestos)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Descuento:</span>
              <span>-{formatPrice(descuento)}</span>
            </div>
          )}
          {propina > 0 && (
            <div className="flex justify-between">
              <span>Propina:</span>
              <span>{formatPrice(propina)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-black pt-1">
            <span>TOTAL:</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
        
        {/* Payment Info */}
        {session?.paymentMethod && (
          <div className="mt-2 pt-2 border-t border-dashed text-xs">
            <div className="flex justify-between">
              <span>Metodo de pago:</span>
              <span>{getPaymentMethodLabel(session.paymentMethod)}</span>
            </div>
            {session.paidAt && (
              <div className="flex justify-between">
                <span>Pagado:</span>
                <span>{formatDateTime(session.paidAt)}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-4 text-center text-xs">
          <p className="border-t border-dashed pt-2">-----------------------------</p>
          <p className="font-bold">Gracias por su visita!</p>
          <p>Vuelva pronto</p>
          <p className="mt-2 text-[10px] text-gray-500">
            Este no es un comprobante fiscal
          </p>
          {poweredByWaitless && (
            <p className="mt-2 text-[9px] text-gray-400">Powered by WAITLESS</p>
          )}
        </div>

        {/* Print timestamp */}
        <div className="mt-2 text-center text-[10px] text-gray-400">
          <p>Impreso: {new Date().toLocaleString('es-MX')}</p>
        </div>
      </div>
    )
  }
)

CustomerReceipt.displayName = 'CustomerReceipt'
