'use client'

import { useEffect, useState } from 'react'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { Clock, Play, Check, LogOut, ListOrdered, ChefHat, CircleCheck, AlertTriangle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { 
  formatTime, 
  getChannelLabel, 
  getTimeDiff, 
  type Order, 
  type KitchenStatus 
} from '@/lib/store'

interface KDSViewProps {
  onBack: () => void
}

type KDSTab = 'queue' | 'preparing' | 'ready'

export function KDSView({ onBack }: KDSViewProps) {
  const { orders, updateKitchenStatus, config } = useApp()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<KDSTab>('queue')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [pacingBlocked, setPacingBlocked] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const kitchenName = 'Cocina'
  const kitchenDesc = 'Estación de preparación'

  const relevantOrders = orders.filter(order => {
    if (order.status === 'entregado' || order.status === 'cancelado') return false
    return true
  })
  
  const sortByArrivalTime = (orders: Order[]) => {
    return [...orders].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }

  // Cola ordenada por prioridad SLA: más urgente primero
  const sortBySLAPriority = (orders: Order[]) => {
    return [...orders].sort((a, b) => {
      const minA = (currentTime.getTime() - new Date(a.createdAt).getTime()) / 60000
      const minB = (currentTime.getTime() - new Date(b.createdAt).getTime()) / 60000
      // Primero los que ya excedieron SLA crítico (≥15min), luego los cerca (≥10), luego FIFO
      const priorityScore = (min: number) => min >= 15 ? 2 : min >= 10 ? 1 : 0
      const diff = priorityScore(minB) - priorityScore(minA)
      if (diff !== 0) return diff
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  const queueOrders = sortBySLAPriority(relevantOrders.filter(o => o.cocinaStatus === 'en_cola'))
  const preparingOrders = sortByArrivalTime(relevantOrders.filter(o => o.cocinaStatus === 'preparando'))
  const readyOrders = sortByArrivalTime(relevantOrders.filter(o => o.cocinaStatus === 'listo'))
  
  const handleStartOrder = (orderId: string) => {
    const maxPrep = config?.pacingMaxPreparando
    if (maxPrep && maxPrep > 0 && preparingOrders.length >= maxPrep) {
      setPacingBlocked(true)
      setTimeout(() => setPacingBlocked(false), 3000)
      return
    }
    updateKitchenStatus(orderId, 'preparando')
  }

  const handleCompleteOrder = (orderId: string) => {
    updateKitchenStatus(orderId, 'listo')
  }

  // Fire all queued orders for a specific mesa at once
  const handleFireTable = (mesa: number) => {
    queueOrders
      .filter(o => o.mesa === mesa)
      .forEach(o => updateKitchenStatus(o.id, 'preparando'))
  }

  // Tables with queued orders (for fire-by-table pacing)
  const tablesWithQueue = Array.from(
    new Set(queueOrders.filter(o => o.mesa != null).map(o => o.mesa as number))
  ).sort((a, b) => a - b)
  
  const getOrderItems = (order: Order) => order.items
  
  const getTimeColor = (createdAt: Date) => {
    const minutes = Math.floor((currentTime.getTime() - new Date(createdAt).getTime()) / 1000 / 60)
    if (minutes >= 15) return 'text-destructive'
    if (minutes >= 10) return 'text-amber-500'
    return 'text-muted-foreground'
  }

  const getTimeBgColor = (createdAt: Date) => {
    const minutes = Math.floor((currentTime.getTime() - new Date(createdAt).getTime()) / 1000 / 60)
    if (minutes >= 15) return 'bg-destructive/10 border-destructive'
    if (minutes >= 10) return 'bg-amber-500/10 border-amber-500'
    return ''
  }

  const getActiveOrders = () => {
    switch (activeTab) {
      case 'queue': return queueOrders
      case 'preparing': return preparingOrders
      case 'ready': return readyOrders
    }
  }

  const navItems = [
    { 
      id: 'queue' as const, 
      label: 'En Cola', 
      icon: <ListOrdered className="h-5 w-5" />,
      count: queueOrders.length,
      bgColor: 'bg-muted',
      activeColor: 'bg-muted-foreground'
    },
    { 
      id: 'preparing' as const, 
      label: 'Preparando', 
      icon: <ChefHat className="h-5 w-5" />, 
      count: preparingOrders.length,
      bgColor: 'bg-primary/10',
      activeColor: 'bg-primary'
    },
    { 
      id: 'ready' as const, 
      label: 'Listos', 
      icon: <CircleCheck className="h-5 w-5" />,
      count: readyOrders.length,
      bgColor: 'bg-success/10',
      activeColor: 'bg-success'
    },
  ]
  
  return (
    <>
    <div className="min-h-screen bg-background flex flex-col md:hidden">
      {/* Mobile Header */}
      <header className="bg-foreground text-background px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-background/70 hover:text-background hover:bg-background/10"
              onClick={onBack}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Salir
            </Button>
            <div className="border-l border-background/20 pl-2 flex items-center gap-1.5 min-w-0">
              <WaitlessLogo size={22} color="light" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
              <div className="min-w-0">
                <h1 className="text-xs font-bold truncate">{kitchenName}</h1>
                <p className="text-background/70 text-[10px] truncate">{kitchenDesc}</p>
              </div>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-mono font-bold">
              {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </header>

      {/* Mobile Pacing Bar */}
      {config?.pacingMaxPreparando != null && config.pacingMaxPreparando > 0 && (
        <div className={cn(
          "px-3 py-1.5 flex items-center justify-between text-xs font-medium",
          preparingOrders.length >= config.pacingMaxPreparando
            ? 'bg-warning/10 text-warning border-b border-warning/30'
            : 'bg-success/10 text-success border-b border-success/30'
        )}>
          <span>En preparación: {preparingOrders.length} / {config.pacingMaxPreparando}</span>
          {pacingBlocked && (
            <span className="text-destructive font-semibold animate-pulse">⚠ Límite de pacing alcanzado</span>
          )}
        </div>
      )}

      {/* Mobile Tabs */}
      <div className="bg-background border-b border-border p-2">
        <div className="flex gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-colors",
                activeTab === item.id
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-foreground'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-[10px] h-5 min-w-5 px-1.5",
                  activeTab === item.id 
                    ? 'bg-background/20 text-background' 
                    : item.count > 0 ? item.bgColor : ''
                )}
              >
                {item.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Content */}
      <main className="flex-1 p-3 overflow-y-auto">
        {/* Fire-by-table panel (queue only) */}
        {activeTab === 'queue' && tablesWithQueue.length > 0 && (
          <div className="mb-3 p-2.5 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-[10px] font-semibold text-warning mb-1.5 uppercase tracking-wide">Fuego por mesa</p>
            <div className="flex flex-wrap gap-1.5">
              {tablesWithQueue.map(mesa => (
                <Button
                  key={mesa}
                  size="sm"
                  className="h-8 text-xs bg-warning hover:bg-warning/90 text-background font-bold"
                  onClick={() => handleFireTable(mesa)}
                >
                  🔥 Mesa {mesa}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {getActiveOrders().map((order, index) => (
            <OrderCard
              key={order.id}
              order={order}
              items={getOrderItems(order)}
              status={activeTab === 'queue' ? 'en_cola' : activeTab === 'preparing' ? 'preparando' : 'listo'}
              timeColor={getTimeColor(order.createdAt)}
              timeBgColor={getTimeBgColor(order.createdAt)}
              onStart={activeTab === 'queue' ? () => handleStartOrder(order.id) : undefined}
              onComplete={activeTab === 'preparing' ? () => handleCompleteOrder(order.id) : undefined}
              priorityIndex={activeTab === 'queue' ? index : undefined}
              now={currentTime.getTime()}
              large
            />
          ))}
          
          {getActiveOrders().length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center mb-4">
                {activeTab === 'queue' && <ListOrdered className="h-8 w-8 text-muted-foreground" />}
                {activeTab === 'preparing' && <ChefHat className="h-8 w-8 text-muted-foreground" />}
                {activeTab === 'ready' && <CircleCheck className="h-8 w-8 text-muted-foreground" />}
              </div>
              <p className="text-base text-muted-foreground font-medium">
                {activeTab === 'queue' && 'Sin órdenes en cola'}
                {activeTab === 'preparing' && 'Nada preparándose'}
                {activeTab === 'ready' && 'Sin órdenes listas'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
    <TooltipProvider delayDuration={0}>
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex h-full flex-col border-r border-border bg-foreground text-background transition-all duration-300",
            sidebarCollapsed ? "w-20" : "w-64"
          )}
        >
          {/* Logo / Brand */}
          <div className="flex h-20 items-center border-b border-background/10 px-4">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-3 flex-1">
                <WaitlessLogo size={36} color="light" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold leading-tight truncate tracking-tight">{config.restaurantName ?? ''}</span>
                  <span className="text-sm text-background/60 truncate">{kitchenName}</span>
                </div>
              </div>
            ) : (
              <div className="flex w-full justify-center">
                <WaitlessLogo size={32} color="light" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
              </div>
            )}
          </div>

          {/* Time Display */}
          <div className={cn(
            "py-4 border-b border-background/10",
            sidebarCollapsed ? "px-2" : "px-4"
          )}>
            <div className={cn(
              "text-center",
              sidebarCollapsed ? "" : "text-left"
            )}>
              <p className="text-2xl font-mono font-bold">
                {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {!sidebarCollapsed && (
                <p className="text-xs text-background/60 mt-1">
                  {relevantOrders.length} orden{relevantOrders.length !== 1 ? 'es' : ''} pendiente{relevantOrders.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = activeTab === item.id
                const button = (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-14 transition-colors text-background/70 hover:text-background hover:bg-background/10",
                      sidebarCollapsed && "justify-center px-0",
                      isActive && "bg-background/15 text-background"
                    )}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                        <Badge
                          className={cn(
                            "h-6 min-w-6 px-2 text-sm",
                            isActive ? "bg-background text-foreground" : "bg-background/20 text-background"
                          )}
                        >
                          {item.count}
                        </Badge>
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
                          {item.count > 0 && (
                            <span className={cn(
                              "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium bg-background text-foreground"
                            )}>
                              {item.count}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        <Badge>{item.count}</Badge>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return button
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-background/10 p-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-10 text-background/60 hover:text-destructive hover:bg-destructive/20",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                  onClick={onBack}
                >
                  <LogOut className="h-4 w-4" />
                  {!sidebarCollapsed && <span className="text-sm">Salir</span>}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right">Salir</TooltipContent>
              )}
            </Tooltip>
          </div>
        </aside>

        {/* Main Content - Order Cards Grid */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Stats Bar */}
          <div className="shrink-0 border-b border-border bg-card px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cola: <strong className="text-foreground">{queueOrders.length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-muted-foreground">Preparando: <strong className="text-primary">{preparingOrders.length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-success" />
                  <span className="text-sm text-muted-foreground">Listos: <strong className="text-success">{readyOrders.length}</strong></span>
                </div>
                {config?.pacingMaxPreparando != null && config.pacingMaxPreparando > 0 && (
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border",
                    preparingOrders.length >= config.pacingMaxPreparando
                      ? 'bg-warning/10 text-warning border-warning/30'
                      : 'bg-success/10 text-success border-success/30'
                  )}>
                    <span>En preparación: {preparingOrders.length} / {config.pacingMaxPreparando}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {pacingBlocked && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 px-3 py-1 rounded-full animate-pulse">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Límite de pacing alcanzado</span>
                  </div>
                )}
                {queueOrders.some(o => {
                  const minutes = Math.floor((currentTime.getTime() - new Date(o.createdAt).getTime()) / 1000 / 60)
                  return minutes >= 10
                }) && (
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Órdenes con espera larga</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Orders Grid */}
          <div className="flex-1 overflow-auto p-6">
            {/* Fire-by-table panel (queue only, desktop) */}
            {activeTab === 'queue' && tablesWithQueue.length > 0 && (
              <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-xl flex items-center gap-3">
                <p className="text-xs font-semibold text-warning uppercase tracking-wide whitespace-nowrap">Fuego por mesa</p>
                <div className="flex flex-wrap gap-2">
                  {tablesWithQueue.map(mesa => (
                    <Button
                      key={mesa}
                      size="sm"
                      className="h-8 text-xs bg-warning hover:bg-warning/90 text-background font-bold"
                      onClick={() => handleFireTable(mesa)}
                    >
                      🔥 Mesa {mesa}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {getActiveOrders().length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-secondary flex items-center justify-center mb-4">
                    {activeTab === 'queue' && <ListOrdered className="h-10 w-10 text-muted-foreground" />}
                    {activeTab === 'preparing' && <ChefHat className="h-10 w-10 text-muted-foreground" />}
                    {activeTab === 'ready' && <CircleCheck className="h-10 w-10 text-muted-foreground" />}
                  </div>
                  <p className="text-lg text-muted-foreground font-medium">
                    {activeTab === 'queue' && 'Sin ordenes en cola'}
                    {activeTab === 'preparing' && 'Nada preparandose'}
                    {activeTab === 'ready' && 'Sin ordenes listas'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {getActiveOrders().map((order, index) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    items={getOrderItems(order)}
                    status={activeTab === 'queue' ? 'en_cola' : activeTab === 'preparing' ? 'preparando' : 'listo'}
                    timeColor={getTimeColor(order.createdAt)}
                    timeBgColor={getTimeBgColor(order.createdAt)}
                    onStart={activeTab === 'queue' ? () => handleStartOrder(order.id) : undefined}
                    onComplete={activeTab === 'preparing' ? () => handleCompleteOrder(order.id) : undefined}
                    priorityIndex={activeTab === 'queue' ? index : undefined}
                    now={currentTime.getTime()}
                    large
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
    </>
  )
}

interface OrderCardProps {
  order: Order
  items: Order['items']
  status: KitchenStatus
  timeColor: string
  timeBgColor?: string
  onStart?: () => void
  onComplete?: () => void
  priorityIndex?: number
  large?: boolean
  now: number
}

function OrderCard({ order, items, status, timeColor, timeBgColor, onStart, onComplete, priorityIndex, large, now }: OrderCardProps) {
  const elapsedMin = Math.floor((now - new Date(order.createdAt).getTime()) / 1000 / 60)
  const SLA_WARN = 10
  const SLA_CRITICAL = 15
  const slaProgress = Math.min((elapsedMin / SLA_CRITICAL) * 100, 100)
  const slaColor = elapsedMin >= SLA_CRITICAL
    ? '#DC2626'
    : elapsedMin >= SLA_WARN
    ? '#D97706'
    : '#16A34A'

  return (
    <Card className={cn(
      "border-2 transition-all overflow-hidden",
      status === 'preparando' && "border-warning bg-kds-preparing",
      status === 'listo' && "border-success bg-success/10",
      status === 'en_cola' && elapsedMin >= SLA_CRITICAL && "border-destructive bg-destructive/10",
      status === 'en_cola' && elapsedMin >= SLA_WARN && elapsedMin < SLA_CRITICAL && "border-warning bg-kds-preparing",
      status === 'en_cola' && elapsedMin < SLA_WARN && "border-border bg-background"
    )}>
      {/* SLA progress bar */}
      {status !== 'listo' && (
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${slaProgress}%`, backgroundColor: slaColor }}
          />
        </div>
      )}
      {status === 'listo' && (
        <div className="h-1 w-full bg-success" />
      )}

      <CardHeader className={cn("pb-2", large ? "p-4" : "p-2.5")}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {priorityIndex !== undefined && status === 'en_cola' && (
                <span className={cn(
                  "font-bold px-2 py-1 rounded text-white",
                  large ? "text-sm" : "text-[10px]",
                  priorityIndex === 0 ? 'bg-destructive' :
                  priorityIndex < 3 ? 'bg-warning' :
                  'bg-accent'
                )}>
                  #{priorityIndex + 1}
                </span>
              )}
              <CardTitle className={cn(large ? "text-2xl" : "text-base", "font-bold")}>
                #{order.numero}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={cn(large ? "text-xs h-5" : "text-[9px] h-3.5", "px-1.5")}>
                {getChannelLabel(order.canal)}
              </Badge>
              {order.mesa && (
                <span className={cn(large ? "text-xs" : "text-[9px]", "text-muted-foreground")}>
                  Mesa {order.mesa}
                </span>
              )}
              {order.seatNumber && (
                <span className="text-[10px] text-muted-foreground ml-1">· Asiento {order.seatNumber}</span>
              )}
            </div>
          </div>
          {/* SLA timer */}
          <div className={cn(
            "flex flex-col items-end gap-0.5"
          )}>
            <div className={cn(
              "flex items-center gap-1 font-bold rounded px-2 py-1",
              large ? "text-sm" : "text-[10px]",
            )} style={{ color: slaColor }}>
              <Clock className={cn(large ? "h-4 w-4" : "h-2.5 w-2.5")} />
              {getTimeDiff(order.createdAt)}
            </div>
            {large && status === 'en_cola' && elapsedMin >= SLA_WARN && (
              <span className="text-[9px] font-semibold" style={{ color: slaColor }}>
                {elapsedMin >= SLA_CRITICAL ? '⚠ SLA excedido' : '⏱ Cerca del SLA'}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(large ? "p-4 pt-0" : "p-2.5 pt-0")}>
        {/* Items */}
        <ul className={cn("space-y-2", large ? "mb-4" : "mb-2")}>
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className={cn(
                "bg-foreground text-background font-bold rounded flex-shrink-0 flex items-center justify-center",
                large ? "text-sm px-2 py-1 min-w-8" : "text-[9px] px-1 py-0.5"
              )}>
                {item.cantidad}x
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-foreground", large ? "text-base" : "text-xs")}>
                  {item.menuItem.nombre}
                </p>
                {item.notas && (
                  <p className={cn("text-foreground font-medium italic", large ? "text-sm mt-0.5" : "text-[9px]")}>
                    ↳ {item.notas}
                  </p>
                )}
                {item.extras && item.extras.length > 0 && (
                  <p className={cn("text-muted-foreground", large ? "text-sm" : "text-[9px]")}>
                    + {item.extras.map(e => e.nombre).join(', ')}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Action Buttons */}
        {status === 'en_cola' && onStart && (
          <Button
            className={cn(
              "w-full font-bold bg-foreground hover:bg-foreground/90 text-background",
              large ? "h-12 text-base" : "h-8 text-xs"
            )}
            onClick={onStart}
          >
            <Play className={cn(large ? "h-5 w-5 mr-2" : "h-3 w-3 mr-1")} />
            INICIAR
          </Button>
        )}

        {status === 'preparando' && onComplete && (
          <Button
            className={cn(
              "w-full font-bold bg-success hover:bg-success/90 text-background",
              large ? "h-12 text-base" : "h-8 text-xs"
            )}
            onClick={onComplete}
          >
            <Check className={cn(large ? "h-5 w-5 mr-2" : "h-3 w-3 mr-1")} />
            LISTO
          </Button>
        )}
        
        {status === 'listo' && (
          <div className={cn(
            "bg-success/20 text-success text-center rounded font-medium",
            large ? "py-3 text-sm" : "py-1.5 text-[10px]"
          )}>
            Esperando entrega
          </div>
        )}
      </CardContent>
    </Card>
  )
}
