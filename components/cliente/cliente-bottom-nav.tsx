'use client'

import { ClipboardList, Bell, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ClienteScreen = 'menu' | 'item' | 'cart' | 'status' | 'feedback'

interface ClienteBottomNavProps {
  activeScreen: ClienteScreen
  onMenuClick: () => void
  onStatusClick: () => void
  onCallWaiter: () => void
  hasActiveOrders: boolean
  cartCount: number
  hasActiveWaiterCall?: boolean
}

export function ClienteBottomNav({
  activeScreen,
  onMenuClick,
  onStatusClick,
  onCallWaiter,
  hasActiveOrders,
  hasActiveWaiterCall = false,
}: ClienteBottomNavProps) {
  const navItems = [
    {
      key: 'menu',
      label: 'Menu',
      icon: null as LucideIcon | null,
      isLogo: true,
      onClick: onMenuClick,
      active: activeScreen === 'menu',
    },
    {
      key: 'status',
      label: 'Pedidos',
      icon: ClipboardList as LucideIcon | null,
      isLogo: false,
      onClick: onStatusClick,
      active: activeScreen === 'status',
      badge: hasActiveOrders,
    },
    {
      key: 'waiter',
      label: 'Mesero',
      icon: Bell as LucideIcon | null,
      isLogo: false,
      onClick: onCallWaiter,
      active: false,
      isWaiterCall: true,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 max-w-md mx-auto">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          // El boton de mesero solo es naranja si hay una llamada activa
          const isWaiterActive = item.isWaiterCall && hasActiveWaiterCall
          
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors relative ${
                item.active
                  ? 'text-primary'
                  : isWaiterActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                {item.isLogo ? (
                  <UtensilsCrossed className="h-5 w-5" />
                ) : Icon ? (
                  <Icon className={`h-5 w-5 ${isWaiterActive ? 'animate-pulse' : ''}`} />
                ) : null}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
                {isWaiterActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isWaiterActive ? 'text-primary' : ''}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  )
}
