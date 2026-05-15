'use client'

import { useRef, useCallback } from 'react'
import { type Order, type TableSession } from '@/lib/store'
import { KitchenTicket } from './kitchen-ticket'
import { CustomerReceipt } from './customer-receipt'
import { useApp } from '@/lib/context'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

interface PrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'kitchen' | 'receipt'
  order?: Order
  session?: TableSession
  kitchen?: 'a' | 'b' | 'all'
}

export function PrintDialog({ open, onOpenChange, type, order, session, kitchen = 'all' }: PrintDialogProps) {
  const { config } = useApp()
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useCallback(() => {
    if (!printRef.current) return

    const printContents = printRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'width=400,height=600')

    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${type === 'kitchen' ? `Comanda-${order?.numero}` : `Recibo-${session?.orders[0]?.numero || order?.numero}`}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; }
              .ticket { width: 280px; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .text-lg { font-size: 14px; }
              .text-xl { font-size: 16px; }
              .text-xs { font-size: 10px; }
              .border-b { border-bottom: 1px dashed #000; }
              .border-t { border-top: 1px dashed #000; }
              .py-2 { padding-top: 8px; padding-bottom: 8px; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-1 { margin-bottom: 4px; }
              .mt-2 { margin-top: 8px; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .gap-1 { gap: 4px; }
              .uppercase { text-transform: uppercase; }
              @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            ${printContents}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }, [type, order, session])

  if (!open) return null

  return (
    <div
      onClick={() => onOpenChange(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          fontFamily: FONT,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0' }}>
          <h2 style={{
            fontSize: 17, fontWeight: 700, color: '#000',
            letterSpacing: '-0.02em', margin: 0,
          }}>
            {type === 'kitchen' ? 'Comanda de Cocina' : 'Recibo del Cliente'}
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
            Vista previa del ticket. Haz clic en imprimir para enviar a la impresora.
          </p>
        </div>

        {/* Ticket preview */}
        <div style={{
          margin: '16px 24px',
          background: '#F5F5F5',
          borderRadius: 10,
          maxHeight: '60vh',
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: '16px 0',
        }}>
          <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
            {type === 'kitchen' && order && (
              <KitchenTicket ref={printRef} order={order} />
            )}
            {type === 'receipt' && (
              <CustomerReceipt
                ref={printRef}
                order={order}
                session={session}
                restaurantName={config.restaurantName}
                logoUrl={config.logoUrl}
                poweredByWaitless={config.poweredByWaitless === true}
              />
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{
          display: 'flex', gap: 10, padding: '0 24px 20px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              height: 40, padding: '0 18px',
              background: '#fff', color: '#000',
              border: '1px solid #E5E5E5', borderRadius: 10,
              fontSize: 14, fontWeight: 600, fontFamily: FONT,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            style={{
              height: 40, padding: '0 18px',
              background: '#000', color: '#fff',
              border: '1px solid #000', borderRadius: 10,
              fontSize: 14, fontWeight: 600, fontFamily: FONT,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>⎙</span>
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
