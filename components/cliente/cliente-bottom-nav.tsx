'use client'

import { ClipboardList, Bell, UtensilsCrossed, Receipt } from 'lucide-react'

type ClienteScreen = 'menu' | 'item' | 'cart' | 'status' | 'bill' | 'feedback'

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
      icon: UtensilsCrossed,
      onClick: onMenuClick,
      active: activeScreen === 'menu',
      badge: false,
    },
    {
      key: 'status',
      label: 'Pedidos',
      icon: ClipboardList,
      onClick: onStatusClick,
      active: activeScreen === 'status',
      badge: hasActiveOrders,
    },
    {
      key: 'bill',
      label: 'Cuenta',
      icon: Receipt,
      onClick: onBillClick,
      active: activeScreen === 'bill',
      badge: false,
      hidden: !hasSession,
    },
    {
      key: 'waiter',
      label: 'Mesero',
      icon: Bell,
      onClick: onCallWaiter,
      active: false,
      badge: hasActiveWaiterCall,
      isAlert: hasActiveWaiterCall,
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 max-w-md mx-auto"
      aria-label="Navegación principal"
    >
      <div className="flex items-center justify-around py-2">
        {navItems
          .filter(item => !item.hidden)
          .map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.key}
                onClick={item.onClick}
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors relative ${
                  item.active
                    ? 'text-primary'
                    : item.isAlert
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${item.isAlert ? 'animate-pulse' : ''}`} aria-hidden="true" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" aria-hidden="true" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
      </div>
      {/* iOS safe area */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  )
}
