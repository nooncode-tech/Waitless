'use client'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'

type ClienteScreen = 'menu' | 'item' | 'cart' | 'status' | 'bill' | 'payment' | 'feedback'

interface ClienteBottomNavProps {
  activeScreen: ClienteScreen
  onMenuClick: () => void
  onStatusClick: () => void
  onBillClick: () => void
  onCallWaiter: () => void
  hasActiveOrders: boolean
  cartCount: number
  hasActiveWaiterCall?: boolean
  hasSession?: boolean
}

export function ClienteBottomNav({
  activeScreen,
  onMenuClick,
  onStatusClick,
  onBillClick,
  onCallWaiter,
  hasActiveOrders,
  hasActiveWaiterCall = false,
  hasSession = false,
}: ClienteBottomNavProps) {
  const navItems = [
    {
      key: 'menu',
      label: 'Menú',
      symbol: '◫',
      onClick: onMenuClick,
      active: activeScreen === 'menu',
      badge: false,
      hidden: false,
    },
    {
      key: 'status',
      label: 'Pedidos',
      symbol: '≡',
      onClick: onStatusClick,
      active: activeScreen === 'status',
      badge: hasActiveOrders,
      hidden: false,
    },
    {
      key: 'bill',
      label: 'Cuenta',
      symbol: '$',
      onClick: onBillClick,
      active: activeScreen === 'bill',
      badge: false,
      hidden: !hasSession,
    },
    {
      key: 'waiter',
      label: 'Mesero',
      symbol: '◈',
      onClick: onCallWaiter,
      active: false,
      badge: hasActiveWaiterCall,
      isAlert: hasActiveWaiterCall,
      hidden: false,
    },
  ]

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #f0f0f0',
        zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)',
        fontFamily: FONT,
      }}
      aria-label="Navegación principal"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {navItems
          .filter(item => !item.hidden)
          .map((item) => {
            const isActive = item.active
            const isAlert = item.isAlert

            return (
              <button
                key={item.key}
                onClick={item.onClick}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '10px 12px', minHeight: 48, background: 'none', border: 'none',
                  cursor: 'pointer', position: 'relative', fontFamily: FONT,
                  color: isActive ? '#000' : isAlert ? '#000' : '#999',
                  transition: 'color 0.15s', flex: 1,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      fontSize: 20, lineHeight: 1,
                      display: 'block',
                      animation: isAlert ? 'pulse 1.5s infinite' : 'none',
                    }}
                    aria-hidden="true"
                  >
                    {item.symbol}
                  </span>
                  {item.badge && (
                    <span style={{
                      position: 'absolute', top: -2, right: -4,
                      width: 7, height: 7, background: MINT,
                      borderRadius: '50%', border: '1.5px solid #000',
                    }} aria-hidden="true" />
                  )}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.01em',
                }}>
                  {item.label}
                </span>
                {isActive && (
                  <span style={{
                    position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 2, background: '#000', borderRadius: 2,
                  }} />
                )}
              </button>
            )
          })}
      </div>
    </nav>
  )
}
