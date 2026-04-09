'use client'

import { useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { type Order, type TableSession } from '@/lib/store'
import { KitchenTicket } from './kitchen-ticket'
import { CustomerReceipt } from './customer-receipt'
import { useApp } from '@/lib/context'

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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'kitchen' ? 'Comanda de Cocina' : 'Recibo del Cliente'}
          </DialogTitle>
          <DialogDescription>
            Vista previa del ticket. Haz clic en imprimir para enviar a la impresora.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center py-4 bg-gray-100 rounded-lg max-h-[60vh] overflow-y-auto">
          <div className="transform scale-90 origin-top">
            {type === 'kitchen' && order && (
              <KitchenTicket ref={printRef} order={order} kitchen={kitchen} />
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
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
