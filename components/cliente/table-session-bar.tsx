'use client'

import { Receipt, ChefHat, CheckCircle2, Clock } from 'lucide-react'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import type { TableSession } from '@/lib/store'

interface TableSessionBarProps {
  mesa: number
  restaurantName?: string | null
  logoUrl?: string | null
  session: TableSession | null | undefined
  activeOrderCount: number
  cartCount: number
  onViewBill?: () => void
}

export function TableSessionBar({
  mesa,
  restaurantName,
  logoUrl,
  session,
  activeOrderCount,
  cartCount,
  onViewBill,
}: TableSessionBarProps) {
  const billStatus = session?.billStatus
  const isPaid = billStatus === 'pagada'
  const isBillRequested = session?.paymentStatus === 'pendiente' && activeOrderCount === 0
  const hasActivity = activeOrderCount > 0 || cartCount > 0

  const statusLabel = () => {
    if (isPaid) return { text: 'Cuenta pagada', icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-success' }
    if (isBillRequested) return { text: 'Cuenta solicitada', icon: <Clock className="h-3 w-3 animate-pulse" />, color: 'text-warning' }
    if (activeOrderCount > 0) return { text: `${activeOrderCount} pedido${activeOrderCount !== 1 ? 's' : ''} activo${activeOrderCount !== 1 ? 's' : ''}`, icon: <ChefHat className="h-3 w-3" />, color: 'text-foreground' }
    if (cartCount > 0) return { text: `${cartCount} item${cartCount !== 1 ? 's' : ''} en carrito`, icon: null, color: 'text-muted-foreground' }
    return null
  }

  const status = statusLabel()

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary/60 border-b border-border">
      {/* Identity */}
      <div className="flex items-center gap-2 min-w-0">
        <WaitlessLogo size={20} color="dark" imageUrl={logoUrl} imageAlt={restaurantName ?? 'Logo'} />
        <div className="min-w-0">
          {restaurantName && (
            <p className="text-[11px] font-semibold text-foreground truncate leading-none">{restaurantName}</p>
          )}
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Mesa {mesa}</p>
        </div>
      </div>

      {/* Status + bill action */}
      <div className="flex items-center gap-2 shrink-0">
        {status && (
          <div className={`flex items-center gap-1 text-[10px] font-medium ${status.color}`}>
            {status.icon}
            <span>{status.text}</span>
          </div>
        )}
        {!isPaid && hasActivity && onViewBill && (
          <button
            onClick={onViewBill}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-foreground text-background text-[10px] font-semibold"
          >
            <Receipt className="h-3 w-3" />
            Cuenta
          </button>
        )}
      </div>
    </div>
  )
}
