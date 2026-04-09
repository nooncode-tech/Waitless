'use client'

import React, { useEffect, useRef } from "react"
import { useState } from 'react'
import { LayoutGrid, Package, Bell, LogOut, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import { useApp } from '@/lib/context'
import { toast } from 'sonner'
import { TablesGrid } from './tables-grid'
import { TableSession } from './table-session'
import { DeliveryBoard } from './delivery-board'
import { WaiterCallsPanel } from './waiter-calls-panel'
import { WaitlistManager } from '@/components/admin/waitlist-manager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { cn } from '@/lib/utils'
import { PushSubscribeButton } from '@/components/shared/push-subscribe-button'

type MeseroScreen = 'tables' | 'session' | 'deliveries' | 'calls' | 'waitlist'

interface MeseroViewProps {
  onBack: () => void
}

export function MeseroView({ onBack }: MeseroViewProps) {
  const { getPendingCalls, orders, waitlist, config } = useApp()
  const [screen, setScreen] = useState<MeseroScreen>('tables')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const pendingCallsCount = getPendingCalls().length
  const waitingCount = waitlist.filter(e => e.estado === 'esperando').length

  // Count ready orders for delivery badge
  const readyDeliveryCount = orders.filter(o =>
    o.status === 'listo' &&
    (o.canal === 'mesa' || o.canal === 'para_llevar' || o.canal === 'delivery' || o.canal === 'mesero')
  ).length

  // Signal ready-to-deliver: play beep + toast when new orders become ready
  const prevReadyRef = useRef(readyDeliveryCount)
  useEffect(() => {
    if (readyDeliveryCount > prevReadyRef.current) {
      // Web Audio beep — no external file needed
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } catch { /* AudioContext not available */ }
      toast.success('¡Pedido listo para entregar!', {
        description: `${readyDeliveryCount} pedido${readyDeliveryCount > 1 ? 's' : ''} esperando entrega`,
        duration: 6000,
      })
    }
    prevReadyRef.current = readyDeliveryCount
  }, [readyDeliveryCount])

  const handleSelectTable = (mesa: number) => {
    setSelectedTable(mesa)
    setScreen('session')
  }
  
  const handleBackFromSession = () => {
    setSelectedTable(null)
    setScreen('tables')
  }
  
  const navItems = [
    { 
      id: 'tables' as const, 
      label: 'Mesas', 
      icon: <LayoutGrid className="h-5 w-5" />,
      badge: undefined
    },
    { 
      id: 'calls' as const, 
      label: 'Llamadas', 
      icon: <Bell className="h-5 w-5" />, 
      badge: pendingCallsCount > 0 ? pendingCallsCount : undefined,
      badgeVariant: 'destructive' as const
    },
    {
      id: 'deliveries' as const,
      label: 'Entregas',
      icon: <Package className="h-5 w-5" />,
      badge: readyDeliveryCount > 0 ? readyDeliveryCount : undefined,
      badgeVariant: 'warning' as const
    },
    {
      id: 'waitlist' as const,
      label: 'Espera',
      icon: <ClipboardList className="h-5 w-5" />,
      badge: waitingCount > 0 ? waitingCount : undefined,
      badgeVariant: 'default' as const
    },
  ]
  
  const activeNavId = screen === 'session' ? 'tables' : screen
  
  return (
    <>
      {/* Mobile layout for waiter view */}
      <div className="min-h-screen bg-black flex flex-col md:hidden">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 bg-black border-b border-white/10 shadow-sm">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-white/70 hover:text-white hover:bg-white/10"
                onClick={onBack}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Salir
              </Button>
              <div className="border-l border-white/20 pl-2 flex items-center gap-2">
                <WaitlessLogo size={22} color="light" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
                <h1 className="text-xs font-bold text-white tracking-wide">
                  Sala
                </h1>
              </div>
            </div>

            {/* Navigation Tabs - Scrollable on mobile */}
            <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-none pb-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setScreen(item.id)
                    if (item.id === 'tables') {
                      setSelectedTable(null)
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors relative",
                    activeNavId === item.id
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  )}
                >
                  {item.icon}
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <Badge className={cn(
                      "h-4 min-w-4 px-1 text-[10px] ml-1",
                      activeNavId === item.id
                        ? "bg-black text-white"
                        : item.badgeVariant === 'destructive' ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-white"
                    )}>
                      {item.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Mobile Content - White card background */}
        <main className="flex-1 overflow-auto p-3">
          <div className="bg-card rounded-lg shadow-sm min-h-full">
            {screen === 'session' && selectedTable ? (
              <TableSession mesa={selectedTable} onBack={handleBackFromSession} />
            ) : screen === 'deliveries' ? (
              <DeliveryBoard />
            ) : screen === 'calls' ? (
              <WaiterCallsPanel />
            ) : screen === 'waitlist' ? (
              <div className="p-3"><WaitlistManager /></div>
            ) : (
              <TablesGrid onSelectTable={handleSelectTable} />
            )}
          </div>
        </main>
      </div>
    <TooltipProvider delayDuration={0}>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-secondary">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex h-full flex-col border-r border-border bg-card transition-all duration-300",
            sidebarCollapsed ? "w-16" : "w-56"
          )}
        >
          {/* Logo / Brand */}
          <div className="flex h-16 items-center border-b border-border px-3">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-3 flex-1">
                <WaitlessLogo size={32} color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-foreground leading-tight tracking-tight">{config.restaurantName ?? ''}</span>
                  <span className="text-xs text-muted-foreground">Sala & Mesas</span>
                </div>
              </div>
            ) : (
              <div className="flex w-full justify-center">
                <WaitlessLogo size={28} color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
              </div>
            )}
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2 py-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = activeNavId === item.id
                const button = (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-11 transition-colors",
                      sidebarCollapsed && "justify-center px-0",
                      isActive && "bg-black/8 text-black font-semibold"
                    )}
                    onClick={() => {
                      setScreen(item.id)
                      if (item.id === 'tables') {
                        setSelectedTable(null)
                      }
                    }}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left text-sm">{item.label}</span>
                        {item.badge !== undefined && (
                          <Badge
                            className={cn(
                              "h-5 min-w-5 px-1.5 text-xs",
                              item.badgeVariant === 'destructive' && "bg-destructive text-destructive-foreground animate-pulse",
                              item.badgeVariant === 'warning' && "bg-amber-500 text-white"
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                )

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          {button}
                          {item.badge !== undefined && (
                            <span className={cn(
                              "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium",
                              item.badgeVariant === 'destructive' && "bg-destructive text-destructive-foreground animate-pulse",
                              item.badgeVariant === 'warning' && "bg-amber-500 text-white"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {item.badge !== undefined && (
                          <Badge className={cn(
                            "h-5 min-w-5 px-1.5 text-xs",
                            item.badgeVariant === 'destructive' && "bg-destructive text-destructive-foreground",
                            item.badgeVariant === 'warning' && "bg-amber-500 text-white"
                          )}>
                            {item.badge}
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return button
              })}
            </nav>
          </ScrollArea>

          {/* Footer with collapse toggle and logout */}
          <div className="border-t border-border p-2 space-y-1">
            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start gap-3 h-9 text-muted-foreground",
                sidebarCollapsed && "justify-center px-0"
              )}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-sm">Colapsar</span>
                </>
              )}
            </Button>
            
            {/* Push notifications toggle */}
            <PushSubscribeButton collapsed={sidebarCollapsed} />

            {/* Logout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                  onClick={onBack}
                >
                  <LogOut className="h-4 w-4" />
                  {!sidebarCollapsed && <span className="text-sm">Cerrar Sesion</span>}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right">Cerrar Sesion</TooltipContent>
              )}
            </Tooltip>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar with alerts */}
          {pendingCallsCount > 0 && screen !== 'calls' && (
            <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 rounded-tl-xl">
              <button 
                onClick={() => setScreen('calls')}
                className="flex items-center gap-2 text-sm text-destructive hover:underline"
              >
                <Bell className="h-4 w-4 animate-pulse" />
                <span className="font-medium">
                  {pendingCallsCount} llamada{pendingCallsCount !== 1 ? 's' : ''} pendiente{pendingCallsCount !== 1 ? 's' : ''}
                </span>
              </button>
            </div>
          )}

          {/* Content - White bg for content area */}
          <div className={cn(
            "flex-1 overflow-auto bg-card",
            !(pendingCallsCount > 0 && screen !== 'calls') && "rounded-tl-xl"
          )}>
            {screen === 'session' && selectedTable ? (
              <TableSession mesa={selectedTable} onBack={handleBackFromSession} />
            ) : screen === 'deliveries' ? (
              <DeliveryBoard />
            ) : screen === 'calls' ? (
              <WaiterCallsPanel />
            ) : screen === 'waitlist' ? (
              <div className="p-6"><WaitlistManager /></div>
            ) : (
              <TablesGrid onSelectTable={handleSelectTable} />
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
    </>
  )
}
