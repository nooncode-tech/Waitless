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
  Lock,
  LayoutGrid,
  ShieldCheck,
  UserCircle2,
  Menu as MenuIcon,
  X,
  Bell,
  ChevronDown,
  ChevronRight,
  Cog,
} from 'lucide-react'
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
import { BillingManager } from './billing-manager'
import { PaymentMethodsManager } from './payment-methods-manager'
import { PaymentsReviewManager } from './payments-review-manager'
import { SalesNotesManager } from './sales-notes-manager'
import { CreditCard, Banknote, FileText } from 'lucide-react'

type AdminScreen = 'reports' | 'menu' | 'orders' | 'inventory' | 'users' | 'config' | 'qr' | 'refunds' | 'closing' | 'history' | 'expo' | 'tables' | 'audit' | 'feedback' | 'health' | 'waitlist' | 'backup' | 'analytics' | 'billing' | 'payment-methods' | 'payments-review' | 'sales-notes'

interface AdminViewProps {
  onBack: () => void
  onLockProfile?: () => void
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

export function AdminView({ onBack, onLockProfile }: AdminViewProps) {
  const [screen, setScreen] = useState<AdminScreen>('reports')
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { orders, refunds, waitlist, currentUser, config, hasPlanFeature } = useApp()
  const role = currentUser?.role

  const pendingOrdersCount = orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado').length
  const pendingRefundsCount = refunds.filter(r => r.status === 'pendiente').length
  const waitingCount = waitlist.filter(e => e.estado === 'esperando').length

  const allNavGroups: NavGroup[] = [
    {
      title: 'Operación',
      items: [
        { id: 'reports', label: 'Dashboard', icon: <TrendingUp className="h-[18px] w-[18px]" /> },
        { id: 'tables', label: 'Mesas', icon: <LayoutGrid className="h-[18px] w-[18px]" /> },
        { id: 'orders', label: 'Pedidos', icon: <Package className="h-[18px] w-[18px]" />, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
        { id: 'closing', label: 'Turno & Caja', icon: <Receipt className="h-[18px] w-[18px]" /> },
        ...(canDo(role, 'validar_pago') ? [
          { id: 'payments-review' as AdminScreen, label: 'Pagos pendientes', icon: <Banknote className="h-[18px] w-[18px]" /> },
          { id: 'sales-notes' as AdminScreen, label: 'Notas de venta', icon: <FileText className="h-[18px] w-[18px]" /> },
        ] : []),
        ...(canDo(role, 'hacer_refund') && hasPlanFeature('refunds') ? [{ id: 'refunds' as AdminScreen, label: 'Reembolsos', icon: <RotateCcw className="h-[18px] w-[18px]" />, badge: pendingRefundsCount > 0 ? pendingRefundsCount : undefined }] : []),
        ...(hasPlanFeature('waitlist') ? [{ id: 'waitlist' as AdminScreen, label: 'Lista de espera', icon: <ClipboardList className="h-[18px] w-[18px]" />, badge: waitingCount > 0 ? waitingCount : undefined }] : []),
        { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="h-[18px] w-[18px]" /> },
        ...(hasPlanFeature('analytics') ? [{ id: 'analytics' as AdminScreen, label: 'Analítica', icon: <BarChart2 className="h-[18px] w-[18px]" /> }] : []),
      ]
    },
    {
      title: 'Catálogo',
      items: [
        { id: 'menu', label: 'Menú', icon: <UtensilsCrossed className="h-[18px] w-[18px]" /> },
        { id: 'inventory', label: 'Inventario', icon: <Archive className="h-[18px] w-[18px]" /> },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'expo', label: 'Expo / Entrega', icon: <Truck className="h-[18px] w-[18px]" /> },
        ...(canDo(role, 'gestionar_usuarios') ? [{ id: 'qr' as AdminScreen, label: 'Códigos QR', icon: <QrCode className="h-[18px] w-[18px]" /> }] : []),
        { id: 'history', label: 'Historial de Mesas', icon: <History className="h-[18px] w-[18px]" /> },
        ...(canDo(role, 'editar_config') ? [
          { id: 'payment-methods' as AdminScreen, label: 'Métodos de pago', icon: <CreditCard className="h-[18px] w-[18px]" /> },
          { id: 'backup' as AdminScreen, label: 'Backup y Recuperación', icon: <DatabaseBackup className="h-[18px] w-[18px]" /> },
          { id: 'billing' as AdminScreen, label: 'Plan & Facturación', icon: <CreditCard className="h-[18px] w-[18px]" /> },
        ] : []),
      ]
    },
  ]

  const navGroups = allNavGroups.map(g => ({ ...g, items: g.items.filter(i => i.id) }))

  const getScreenTitle = () => {
    const item = navGroups.flatMap(g => g.items).find(i => i.id === screen)
    return item?.label ?? 'Admin'
  }

  const navigate = (id: AdminScreen) => {
    setScreen(id)
    setMobileDrawerOpen(false)
  }

  const renderContent = () => (
    <>
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
      {screen === 'billing' && <BillingManager />}
      {screen === 'payment-methods' && <PaymentMethodsManager />}
      {screen === 'payments-review' && <PaymentsReviewManager />}
      {screen === 'sales-notes' && <SalesNotesManager />}
    </>
  )

  // ─── Sidebar nav item ─────────────────────────────────────────────────────────
  const SidebarItem = ({ item }: { item: NavItem }) => {
    const active = screen === item.id
    return (
      <button
        onClick={() => navigate(item.id)}
        className={cn(
          'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
          active
            ? 'bg-white text-black shadow-sm'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        )}
      >
        <span className={cn('shrink-0 transition-colors', active ? 'text-black' : 'text-white/50 group-hover:text-white')}>
          {item.icon}
        </span>
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.badge !== undefined && (
          <span className={cn(
            'shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center',
            active ? 'bg-black text-white' : 'bg-white/20 text-white'
          )}>
            {item.badge}
          </span>
        )}
      </button>
    )
  }

  // ─── Sidebar content ──────────────────────────────────────────────────────────
  const SidebarContent = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div className={cn('flex flex-col h-full', inDrawer ? 'bg-[#111]' : '')}>
      {/* Brand */}
      <div className="px-4 py-5 shrink-0">
        <button
          onClick={() => navigate('reports')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full"
        >
          <WaitlessLogo size={32} color="light" imageUrl={config.logoUrl} imageAlt="Logo" />
          <div className="text-left min-w-0">
            <p className="text-white text-sm font-bold leading-tight truncate">
              {config.restaurantName ?? 'WAITLESS'}
            </p>
            <p className="text-white/40 text-[11px]">Panel Admin</p>
          </div>
        </button>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-5 [&::-webkit-scrollbar]:w-0">
        {navGroups.map(group => (
          <div key={group.title}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/25">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => <SidebarItem key={item.id} item={item} />)}
            </div>
          </div>
        ))}

        {/* Admin items */}
        {(canDo(role, 'gestionar_usuarios') || canDo(role, 'editar_config')) && (
          <div>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/25">
              Administración
            </p>
            <div className="space-y-0.5">
              {canDo(role, 'gestionar_usuarios') && (
                <>
                  <SidebarItem item={{ id: 'users', label: 'Usuarios', icon: <Users className="h-[18px] w-[18px]" /> }} />
                  <SidebarItem item={{ id: 'audit', label: 'Auditoría', icon: <ShieldCheck className="h-[18px] w-[18px]" /> }} />
                </>
              )}
              <SidebarItem item={{ id: 'health', label: 'Salud del sistema', icon: <HeartPulse className="h-[18px] w-[18px]" /> }} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 pb-4 pt-3 border-t border-white/10 space-y-1">
        <PushSubscribeButton collapsed={false} />
        {canDo(role, 'editar_config') && (
          <button
            onClick={() => navigate('config')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              screen === 'config' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
            )}
          >
            <Cog className="h-[18px] w-[18px] shrink-0" />
            Configuración
          </button>
        )}
        {onLockProfile && (
          <button
            onClick={onLockProfile}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Lock className="h-[18px] w-[18px] shrink-0" />
            Cerrar perfil
          </button>
        )}
        <button
          onClick={onBack}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/* ── DESKTOP layout ─────────────────────────────────────────────────── */}
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-[#F6F6F6]">

        {/* Sidebar */}
        <aside className="w-60 shrink-0 h-full bg-[#111] flex flex-col">
          <SidebarContent />
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top header */}
          <header className="h-16 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-6">
            <div>
              <h1 className="text-base font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                {getScreenTitle()}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2.5 h-9 pl-3 pr-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white text-[11px] font-black shrink-0">
                    {currentUser?.nombre?.charAt(0).toUpperCase() ?? 'A'}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 max-w-[120px] truncate">
                    {currentUser?.nombre ?? 'Admin'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1.5">
                      <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                        <p className="text-sm font-bold text-gray-900">{currentUser?.nombre ?? 'Administrador'}</p>
                        <p className="text-xs text-gray-400 capitalize">{currentUser?.role ?? 'admin'}</p>
                      </div>
                      {canDo(role, 'gestionar_usuarios') && (
                        <button onClick={() => { navigate('users'); setUserMenuOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Users className="h-4 w-4 text-gray-400" /> Usuarios
                        </button>
                      )}
                      {canDo(role, 'gestionar_usuarios') && (
                        <button onClick={() => { navigate('audit'); setUserMenuOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <ShieldCheck className="h-4 w-4 text-gray-400" /> Auditoría
                        </button>
                      )}
                      <button onClick={() => { navigate('health'); setUserMenuOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <HeartPulse className="h-4 w-4 text-gray-400" /> Salud del sistema
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      {onLockProfile && (
                        <button onClick={() => { onLockProfile(); setUserMenuOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Lock className="h-4 w-4 text-gray-400" /> Cerrar perfil
                        </button>
                      )}
                      <button onClick={onBack}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut className="h-4 w-4" /> Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-5">
            <div className="bg-white rounded-2xl min-h-full p-4 shadow-sm border border-gray-100">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* ── MOBILE layout ──────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-[#F6F6F6] flex flex-col md:hidden">

        {/* Mobile Header */}
        <header className="sticky top-0 z-50 bg-[#111] px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('reports')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <WaitlessLogo size={26} color="light" imageUrl={config.logoUrl} imageAlt="Logo" />
            <span className="text-white text-sm font-bold">{config.restaurantName ?? 'WAITLESS'}</span>
          </button>

          <div className="flex items-center gap-1">
            {pendingOrdersCount > 0 && (
              <button
                onClick={() => navigate('orders')}
                className="relative w-9 h-9 flex items-center justify-center"
              >
                <Bell className="h-5 w-5 text-white/70" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#06C167] rounded-full text-white text-[10px] font-black flex items-center justify-center">
                  {pendingOrdersCount}
                </span>
              </button>
            )}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Mobile Content */}
        <main className="flex-1 overflow-auto pb-20 p-3">
          <div className="bg-white rounded-2xl min-h-full p-3 shadow-sm border border-gray-100">
            {renderContent()}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {[
            { id: 'reports' as AdminScreen, label: 'Dashboard', icon: <TrendingUp className="h-5 w-5" /> },
            { id: 'tables' as AdminScreen, label: 'Mesas', icon: <LayoutGrid className="h-5 w-5" /> },
            { id: 'orders' as AdminScreen, label: 'Pedidos', icon: <Package className="h-5 w-5" />, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
            { id: 'closing' as AdminScreen, label: 'Caja', icon: <Receipt className="h-5 w-5" /> },
            { id: 'menu' as AdminScreen, label: 'Menú', icon: <UtensilsCrossed className="h-5 w-5" /> },
          ].map(item => {
            const active = screen === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2.5 min-h-[52px] gap-1 relative transition-colors',
                  active ? 'text-black' : 'text-gray-400'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-black rounded-full" />
                )}
                <div className="relative">
                  {item.icon}
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-[#06C167] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={cn('text-[10px] font-semibold', active ? 'text-black' : 'text-gray-400')}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Mobile Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[calc(100vw-3rem)] bg-[#111] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-black">
                    {currentUser?.nombre?.charAt(0).toUpperCase() ?? 'A'}
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold leading-tight">{currentUser?.nombre ?? 'Admin'}</p>
                    <p className="text-white/40 text-[10px] capitalize">{currentUser?.role ?? 'admin'}</p>
                  </div>
                </div>
                <button onClick={() => setMobileDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarContent inDrawer />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
