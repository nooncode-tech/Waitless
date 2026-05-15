'use client'

import { WaitlessLogo } from '@/components/ui/waitless-logo'
import type { TableSession } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'

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

  const statusLabel = (): { text: string; symbol: string; color: string } | null => {
    if (isPaid) return { text: 'Cuenta pagada', symbol: '✓', color: '#166534' }
    if (isBillRequested) return { text: 'Cuenta solicitada', symbol: '⏱', color: '#b45309' }
    if (activeOrderCount > 0) return { text: `${activeOrderCount} pedido${activeOrderCount !== 1 ? 's' : ''} activo${activeOrderCount !== 1 ? 's' : ''}`, symbol: '≡', color: '#000' }
    if (cartCount > 0) return { text: `${cartCount} item${cartCount !== 1 ? 's' : ''} en carrito`, symbol: '⊞', color: '#888' }
    return null
  }

  const status = statusLabel()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', background: '#f7f7f7', borderBottom: '1px solid #eee',
      fontFamily: FONT,
    }}>
      {/* Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <WaitlessLogo size={20} color="dark" imageUrl={logoUrl ?? undefined} imageAlt={restaurantName ?? 'Logo'} />
        <div style={{ minWidth: 0 }}>
          {restaurantName && (
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#000', margin: 0,
              lineHeight: 1.1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>{restaurantName}</p>
          )}
          <p style={{ fontSize: 10, color: '#999', margin: 0, lineHeight: 1.2, marginTop: 1 }}>
            Mesa {mesa}
          </p>
        </div>
      </div>

      {/* Status + bill action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, color: status.color }}>
            <span>{status.symbol}</span>
            <span>{status.text}</span>
          </div>
        )}
        {!isPaid && hasActivity && onViewBill && (
          <button
            onClick={onViewBill}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 8,
              background: '#000', color: '#fff',
              fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: FONT,
            }}
          >
            $ Cuenta
          </button>
        )}
      </div>
    </div>
  )
}
