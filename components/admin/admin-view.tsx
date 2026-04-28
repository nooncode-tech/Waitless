'use client'

import React from 'react'
import { useState } from 'react'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import {
  Package,
  Archive,
  Users,
  Settings,
  TrendingUp,
  QrCode,
  Truck,
  RotateCcw,
  Receipt,
  UtensilsCrossed,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Cog,
  LayoutGrid,
  ShieldCheck,
  UserCircle2,
  ChevronDown,
  Menu as MenuIcon,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { MenuManager } from './menu-manager'
import { OrdersManager } from './orders-manager'
import { InventoryManager } from './inventory-manager'
import { UsersManager } from './users-manager'
import { ConfigManager } from './config-manager'
import { ReportsManager } from './reports-manager'
import { QRManager } from './qr-manager'
import { RefundsManager } from './refunds-manager'
import { DailyClosing } from './daily-closing'
import { TableHistory } from './table-history'
import { ExpoView } from './expo-view'
import { TablesManager } from './tables-manager'
import { AuditLogViewer } from './audit-log-viewer'
import { FeedbackManager } from './feedback-manager'
import { HealthPanel } from './health-panel'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { MessageSquare, HeartPulse, ClipboardList, DatabaseBackup, BarChart2 } from 'lucide-react'
import { WaitlistManager } from './waitlist-manager'
import { BackupManager } from './backup-manager'
import { AnalyticsDashboard } from './analytics-dashboard'
import { PushSubscribeButton } from '@/components/shared/push-subscribe-button'

type AdminScreen = 'reports' | 'menu' | 'orders' | 'inventory' | 'users' | 'config' | 'qr' | 'refunds' | 'closing' | 'history' | 'expo' | 'tables' | 'audit' | 'feedback' | 'health' | 'waitlist' | 'backup' | 'analytics'

interface AdminViewProps {
  onBack: () => void
}

interface NavItem {
  id: AdminScreen
  label: string
  icon: React.ReactNode
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export function AdminView({ onBack }: AdminViewProps) {
  const [screen, setScreen] = useState<AdminScreen>('reports')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const { orders, refunds, waitlist, currentUser, config, hasPlanFeature } = useApp()
  const role = currentUser?.role

  // Calculate badges
  const pendingOrdersCount = orders.filter(o =>
    o.status !== 'entregado' && o.status !== 'cancelado'
  ).length
  const pendingRefundsCount = refunds.filter(r => r.status === 'pendiente').length
  const waitingCount = waitlist.filter(e => e.estado === 'esperando').length
  
  const allNavGroups: NavGroup[] = [
    {
      title: 'Operación',
      items: [
        { id: 'reports', label: 'Dashboard', icon: <TrendingUp className="h-5 w-5" /> },
        { id: 'tables', label: 'Mesas', icon: <LayoutGrid className="h-5 w-5" /> },
        { id: 'orders', label: 'Pedidos', icon: <Package className="h-5 w-5" />, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
        { id: 'closing', label: 'Turno & Caja', icon: <Receipt className="h-5 w-5" /> },
        ...(canDo(role, 'hacer_refund') && hasPlanFeature('refunds') ? [{ id: 'refunds' as AdminScreen, label: 'Reembolsos', icon: <RotateCcw className="h-5 w-5" />, badge: pendingRefundsCount > 0 ? pendingRefundsCount : undefined }] : []),
        ...(hasPlanFeature('waitlist') ? [{ id: 'waitlist' as AdminScreen, label: 'Lista de espera', icon: <ClipboardList className="h-5 w-5" />, badge: waitingCount > 0 ? waitingCount : undefined }] : []),
        { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="h-5 w-5" /> },
        ...(hasPlanFeature('analytics') ? [{ id: 'analytics' as AdminScreen, label: 'Analítica', icon: <BarChart2 className="h-5 w-5" /> }] : []),
      ]
    },
    {
      title: 'Catálogo',
      items: [
        { id: 'menu', label: 'Menú', icon: <UtensilsCrossed className="h-5 w-5" /> },
        { id: 'inventory', label: 'Inventario', icon: <Archive className="h-5 w-5" /> },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'expo', label: 'Expo / Entrega', icon: <Truck className="h-5 w-5" /> },
        ...(canDo(role, 'gestionar_usuarios') ? [{ id: 'qr' as AdminScreen, label: 'Códigos QR', icon: <QrCode className="h-5 w-5" /> }] : []),
        { id: 'history', label: 'Historial de Mesas', icon: <History className="h-5 w-5" /> },
        ...(canDo(role, 'editar_config') ? [
          { id: 'backup' as AdminScreen, label: 'Backup y Recuperación', icon: <DatabaseBackup className="h-5 w-5" /> },
        ] : []),
      ]
    },
  ]
  const navGroups = allNavGroups.map(g => ({ ...g, items: g.items.filter(i => i.id) }))

  const getScreenTitle = () => {
    const allItems = navGroups.flatMap(g => g.items)
    const item = allItems.find(i => i.id === screen)
    return item?.label || 'Admin'
  }

  return (
    <>
      {/* Mobile layout */}
      <div className="min-h-screen bg-background flex flex-col md:hidden">

        {/* Mobile Header */}
        <header className="sticky top-0 z-50 bg-black">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2.5">
              <WaitlessLogo size={28} color="light" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-tight">{config.restaurantName ?? 'WAITLESS'}</span>
                <span className="text-[10px] text-white/40">Panel Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {canDo(role, 'editar_config') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setScreen('config')}
                >
                  <Cog className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setMobileDrawerOpen(true)}
              >
                <MenuIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Content */}
        <main className="flex-1 overflow-auto pb-20">
          <div className="bg-card min-h-full p-3">
            {screen === 'reports' && <ReportsManager />}
            {screen === 'tables' && <TablesManager />}
            {screen === 'closing' && <DailyClosing />}
            {screen === 'orders' && <OrdersManager />}
            {screen === 'menu' && <MenuManager />}
            {screen === 'inventory' && <InventoryManager />}
            {screen === 'refunds' && <RefundsManager />}
            {screen === 'expo' && <ExpoView />}
            {screen === 'qr' && <QRManager />}
            {screen === 'history' && <TableHistory />}
            {screen === 'audit' && <AuditLogViewer />}
            {screen === 'users' && <UsersManager />}
            {screen === 'config' && <ConfigManager />}
            {screen === 'waitlist' && <WaitlistManager />}
            {screen === 'feedback' && <FeedbackManager />}
            {screen === 'analytics' && <AnalyticsDashboard />}
            {screen === 'health' && <HealthPanel />}
            {screen === 'backup' && <BackupManager />}
          </div>
        </main>

        {/* Mobile Bottom Nav — 5 accesos principales */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border flex md:hidden">
          {[
            { id: 'reports' as AdminScreen,  label: 'Dashboard', icon: <TrendingUp className="h-5 w-5" /> },
            { id: 'tables'  as AdminScreen,  label: 'Mesas',     icon: <LayoutGrid className="h-5 w-5" /> },
            { id: 'orders'  as AdminScreen,  label: 'Pedidos',   icon: <Package className="h-5 w-5" />, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
            { id: 'closing' as AdminScreen,  label: 'Caja',      icon: <Receipt className="h-5 w-5" /> },
            { id: 'menu'    as AdminScreen,  label: 'Menú',      icon: <UtensilsCrossed className="h-5 w-5" /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors',
                screen === item.id ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black text-white text-[9px] font-bold px-0.5">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {screen === item.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-black rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Mobile Drawer — resto de secciones */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileDrawerOpen(false)}
            />
            {/* Panel */}
            <div className="absolute right-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white text-xs font-bold">
                    {currentUser?.nombre?.charAt(0).toUpperCase() ?? 'A'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">{currentUser?.nombre ?? 'Admin'}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{currentUser?.role ?? 'admin'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Drawer Nav — all sections grouped */}
              <div className="flex-1 overflow-y-auto py-3">
                {navGroups.map(group => (
                  <div key={group.title} className="mb-1">
                    <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </p>
                    {group.items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => { setScreen(item.id); setMobileDrawerOpen(false) }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                          screen === item.id
                            ? 'bg-black text-white font-semibold'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge !== undefined && (
                          <Badge className="h-5 min-w-5 px-1.5 text-xs bg-black text-white">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                ))}

                {/* Extra: Auditoría + Usuarios + Salud */}
                <div className="mb-1">
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Administración
                  </p>
                  {canDo(role, 'gestionar_usuarios') && (
                    <button
                      onClick={() => { setScreen('users'); setMobileDrawerOpen(false) }}
                      className={cn('w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors', screen === 'users' ? 'bg-black text-white font-semibold' : 'text-foreground hover:bg-muted')}
                    >
                      <Users className="h-5 w-5 shrink-0" />
                      Usuarios
                    </button>
                  )}
                  {canDo(role, 'gestionar_usuarios') && (
                    <button
                      onClick={() => { setScreen('audit'); setMobileDrawerOpen(false) }}
                      className={cn('w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors', screen === 'audit' ? 'bg-black text-white font-semibold' : 'text-foreground hover:bg-muted')}
                    >
                      <ShieldCheck className="h-5 w-5 shrink-0" />
                      Auditoría
                    </button>
                  )}
                  <button
                    onClick={() => { setScreen('health'); setMobileDrawerOpen(false) }}
                    className={cn('w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors', screen === 'health' ? 'bg-black text-white font-semibold' : 'text-foreground hover:bg-muted')}
                  >
                    <HeartPulse className="h-5 w-5 shrink-0" />
                    Salud del sistema
                  </button>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-border p-3">
                <PushSubscribeButton collapsed={false} />
                <button
                  onClick={onBack}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop layout with sidebar */}
      <TooltipProvider delayDuration={0}>
        <div className="hidden md:flex h-screen w-full overflow-hidden bg-secondary">
          {/* Sidebar */}
          <aside
            className={cn(
              "flex h-full flex-col border-r border-border bg-card transition-all duration-300",
              sidebarCollapsed ? "w-16" : "w-64"
            )}
          >
            {/* Logo / Brand — misma altura que el header del contenido (h-16) */}
            <div className="flex h-16 shrink-0 items-center border-b border-border px-3">
              {!sidebarCollapsed ? (
                <button
                  onClick={() => setScreen('reports')}
                  className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-70 transition-opacity"
                >
                  <WaitlessLogo size={32} color="dark" imageUrl={config.logoUrl} imageAlt="Logo" />
                  <span className="text-xs text-muted-foreground">Admin</span>
                </button>
              ) : (
                <button onClick={() => setScreen('reports')} className="flex w-full justify-center hover:opacity-70 transition-opacity">
                  <WaitlessLogo size={28} color="dark" imageUrl={config.logoUrl} imageAlt="Logo" />
                </button>
              )}
            </div>

            {/* Navigation — scroll independiente */}
            <div className="flex-1 overflow-y-auto py-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent">
              <nav className="flex flex-col gap-1 px-2">
                {navGroups.map((group, groupIndex) => (
                  <React.Fragment key={group.title}>
                    {!sidebarCollapsed && (
                      <div className="px-3 py-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.title}
                        </span>
                      </div>
                    )}
                    {sidebarCollapsed && groupIndex > 0 && (
                      <Separator className="my-2" />
                    )}
                    {group.items.map((item) => {
                      const isActive = screen === item.id
                      const button = (
                        <Button
                          key={item.id}
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3 h-11 transition-colors",
                            sidebarCollapsed && "justify-center px-0",
                            isActive && "bg-black text-white hover:bg-black/90 hover:text-white"
                          )}
                          onClick={() => setScreen(item.id)}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          {!sidebarCollapsed && (
                            <>
                              <span className="flex-1 text-left text-sm">{item.label}</span>
                              {item.badge !== undefined && (
                                <Badge className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground">
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
                                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium bg-primary text-primary-foreground">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="flex items-center gap-2">
                              {item.label}
                              {item.badge !== undefined && (
                                <Badge className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground">
                                  {item.badge}
                                </Badge>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )
                      }

                      return button
                    })}
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Footer */}
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
                    <span className="text-sm">Contraer</span>
                  </>
                )}
              </Button>

              {/* Push notifications toggle */}
              <PushSubscribeButton collapsed={sidebarCollapsed} />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Top Header — misma altura que el logo del sidebar (h-16) */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-lg font-semibold text-foreground">{getScreenTitle()}</h1>
              </div>
              <div className="flex items-center gap-2">
                {/* Quick action: Config — admin only */}
                {canDo(role, 'editar_config') && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setScreen('config')}
                      >
                        <Cog className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Configuración</TooltipContent>
                  </Tooltip>
                )}

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white text-xs font-bold shrink-0">
                        {currentUser?.nombre?.charAt(0).toUpperCase() ?? <UserCircle2 className="h-4 w-4" />}
                      </div>
                      <span className="hidden sm:inline max-w-[120px] truncate">
                        {currentUser?.nombre ?? currentUser?.username ?? 'Admin'}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm text-foreground">
                          {currentUser?.nombre ?? 'Administrador'}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {currentUser?.role ?? 'admin'}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {canDo(role, 'gestionar_usuarios') && (
                      <DropdownMenuItem onClick={() => setScreen('users')}>
                        <Users className="h-4 w-4 mr-2" />
                        Usuarios
                      </DropdownMenuItem>
                    )}
                    {canDo(role, 'gestionar_usuarios') && (
                      <DropdownMenuItem onClick={() => setScreen('audit')}>
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Auditoría
                      </DropdownMenuItem>
                    )}
                    {canDo(role, 'editar_config') && (
                      <DropdownMenuItem onClick={() => setScreen('health')}>
                        <HeartPulse className="h-4 w-4 mr-2" />
                        Salud del sistema
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onBack}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Content - White bg for content area */}
            <div className="flex-1 overflow-auto p-4 bg-card rounded-tl-xl">
              {screen === 'reports' && <ReportsManager />}
              {screen === 'tables' && <TablesManager />}
              {screen === 'closing' && <DailyClosing />}
              {screen === 'orders' && <OrdersManager />}
              {screen === 'menu' && <MenuManager />}
              {screen === 'inventory' && <InventoryManager />}
              {screen === 'refunds' && <RefundsManager />}
              {screen === 'expo' && <ExpoView />}
              {screen === 'qr' && <QRManager />}
              {screen === 'history' && <TableHistory />}
              {screen === 'audit' && <AuditLogViewer />}
              {screen === 'users' && <UsersManager />}
              {screen === 'config' && <ConfigManager />}
              {screen === 'waitlist' && <WaitlistManager />}
              {screen === 'feedback' && <FeedbackManager />}
              {screen === 'analytics' && <AnalyticsDashboard />}
              {screen === 'health' && <HealthPanel />}
              {screen === 'backup' && <BackupManager />}
            </div>
          </main>
        </div>
      </TooltipProvider>
    </>
  )
}
