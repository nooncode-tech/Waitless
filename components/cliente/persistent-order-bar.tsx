'use client'

import { ShoppingBag, ClipboardList, Receipt, CheckCircle2 } from 'lucide-react'
import { formatPrice } from '@/lib/store'
import type { TableSession } from '@/lib/store'

interface PersistentOrderBarProps {
  cartCount: number
  cartSubtotal: number
  activeOrderCount: number
  session: TableSession | null | undefined
  canOrder: boolean
  onViewCart: () => void
  onViewStatus: () => void
  onViewBill: () => void
}

export function PersistentOrderBar({
  cartCount,
  cartSubtotal,
  activeOrderCount,
  session,
  canOrder,
  onViewCart,
  onViewStatus,
  onViewBill,
}: PersistentOrderBarProps) {
  const billStatus = session?.billStatus
  const isPaid = billStatus === 'pagada'
  const isBillRequested = session?.paymentStatus === 'pendiente' && activeOrderCount === 0

  // Determine which action to show
  if (isPaid) {
    return (
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 pb-3 z-40 pointer-events-none">
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-success/10 border border-success/30 rounded-2xl pointer-events-auto">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-sm font-semibold text-success">Cuenta pagada — ¡Gracias!</span>
        </div>
      </div>
    )
  }

  if (isBillRequested) {
    return (
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 pb-3 z-40 pointer-events-none">
        <button
          onClick={onViewBill}
          className="w-full flex items-center justify-between py-3 px-4 bg-warning/10 border border-warning/30 rounded-2xl pointer-events-auto"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-warning" />
            <span className="text-sm font-semibold text-warning">Cuenta solicitada</span>
          </div>
          <span className="text-xs text-warning/70">El mesero viene a cobrarte →</span>
        </button>
      </div>
    )
  }

  if (cartCount > 0 && canOrder) {
    return (
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 pb-3 z-40 pointer-events-none">
        <button
          onClick={onViewCart}
          className="w-full flex items-center justify-between py-3 px-5 bg-foreground text-background rounded-2xl shadow-lg pointer-events-auto"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-sm font-semibold">
              {cartCount} item{cartCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">{formatPrice(cartSubtotal)}</span>
            <span className="text-xs opacity-70">Ver pedido →</span>
          </div>
        </button>
      </div>
    )
  }

  if (activeOrderCount > 0) {
    return (
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 pb-3 z-40 pointer-events-none">
        <button
          onClick={onViewStatus}
          className="w-full flex items-center justify-between py-3 px-5 bg-foreground/90 text-background rounded-2xl shadow-md pointer-events-auto"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <span className="text-sm font-semibold">
              {activeOrderCount} pedido{activeOrderCount !== 1 ? 's' : ''} activo{activeOrderCount !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-xs opacity-70">Ver estado →</span>
        </button>
      </div>
    )
  }

  return null
}
