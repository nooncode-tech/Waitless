'use client'

import { useState, useEffect } from 'react'
import { AppProvider, useApp } from '@/lib/context'
import { Toaster } from '@/components/ui/sonner'
import { LoginScreen } from '@/components/auth/login-screen'
import { LandingPage } from '@/components/landing/landing-page'
import { ClienteView } from '@/components/cliente/cliente-view'
import { ClienteAuthScreen } from '@/components/cliente/cliente-auth-screen'
import { MeseroView } from '@/components/mesero/mesero-view'
import { KDSView } from '@/components/kds/kds-view'
import { AdminView } from '@/components/admin/admin-view'
import type { UserRole } from '@/lib/store'
import type { TenantBranding } from '@/lib/tenant-server'
import type { ClienteUser } from '@/lib/cliente-auth'

type AppView = 'landing' | 'login' | 'cliente-auth' | 'cliente' | 'admin' | 'mesero' | 'cocina_a' | 'cocina_b'

interface AppContentProps {
  initialBranding: TenantBranding
}

function AppContent({ initialBranding }: AppContentProps) {
  const { currentUser, setCurrentTable, logout, validateTableQR } = useApp()
  const [view, setView] = useState<AppView>('landing')
  const [clienteMesa, setClienteMesa] = useState<number | null>(null)
  const [clienteUser, setClienteUser] = useState<ClienteUser | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initializing mounted flag after hydration, standard SSR pattern
    setMounted(true)
  }, [])

  // Acceso por QR: requiere ?mesa=N&token=XXX — token validado contra Supabase (P0-6)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mesa = params.get('mesa')
    const token = params.get('token')
    if (!mesa) return

    const mesaNum = parseInt(mesa)
    if (isNaN(mesaNum) || mesaNum <= 0) return

    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- setting error state from async QR validation inside effect, intentional
      setQrError('Acceso denegado: token QR requerido. Escaneá el código QR de tu mesa.')
      return
    }

    // Validar token contra Supabase
    validateTableQR(token).then(({ valid, mesa: mesaValidada }) => {
      if (!valid || mesaValidada !== mesaNum) {
        setQrError('QR inválido o expirado. Pedí al mozo que genere un nuevo código.')
        return
      }
      setQrError(null)
      setClienteMesa(mesaNum)
      setCurrentTable(mesaNum)
      setView('cliente-auth')
    })
  }, [setCurrentTable, validateTableQR])

  // Mapeo de rol a vista
  const roleToView = (role: UserRole): AppView => {
    if (role === 'admin' || role === 'manager') return 'admin'
    return role as AppView
  }

  // Auto-redirect cuando hay sesión Supabase activa
  useEffect(() => {
    if (currentUser && (view === 'login' || view === 'landing')) {
      setView(roleToView(currentUser.role)) // eslint-disable-line react-hooks/set-state-in-effect -- intentional reactive navigation on auth state change
    }
  }, [currentUser, view])

  const handleLoginSuccess = (role: UserRole) => {
    setView(roleToView(role))
  }

  const handleLogout = async () => {
    setView('landing')
    setClienteMesa(null)
    window.history.replaceState({}, '', window.location.pathname)
    await logout()
  }

  const handleClienteAuthSuccess = (user: ClienteUser | null) => {
    setClienteUser(user)
    setView('cliente')
  }

  const handleClienteExit = () => {
    setClienteMesa(null)
    setClienteUser(null)
    setCurrentTable(null)
    setView('landing')
    window.history.replaceState({}, '', window.location.pathname)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  // QR inválido o expirado
  if (qrError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="font-semibold text-foreground mb-1">Acceso denegado</p>
          <p className="text-sm text-muted-foreground">{qrError}</p>
        </div>
      </div>
    )
  }

  // Pantalla de auth para clientes (luego de validar QR)
  if (view === 'cliente-auth' && clienteMesa) {
    return (
      <ClienteAuthScreen
        onSuccess={handleClienteAuthSuccess}
        initialBranding={initialBranding}
      />
    )
  }

  // Vista cliente (acceso por QR — con o sin cuenta registrada)
  if (view === 'cliente' && clienteMesa) {
    return <ClienteView mesa={clienteMesa} onBack={handleClienteExit} clienteUser={clienteUser} />
  }

  // Landing pública
  if (view === 'landing') {
    return <LandingPage onLogin={() => setView('login')} />
  }

  // Pantalla de login — recibe branding server-side para renderizar sin flash
  if (view === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} initialBranding={initialBranding} />
  }

  // Estado transitorio: view ya cambió a rol pero currentUser del contexto aún no propagó
  // (race entre setState del provider y setView del componente hijo en React 18)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  // Vistas autenticadas por rol
  switch (view) {
    case 'admin':
      // FIX P0.5: admin Y manager usan la vista admin (manager tiene permisos acotados dentro)
      if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        setView('login')
        return null
      }
      return <AdminView onBack={handleLogout} />

    case 'mesero':
      if (currentUser.role !== 'mesero') {
        setView('login')
        return null
      }
      return <MeseroView onBack={handleLogout} />

    case 'cocina_a':
      if (currentUser.role !== 'cocina_a') {
        setView('login')
        return null
      }
      return <KDSView kitchen="a" onBack={handleLogout} />

    case 'cocina_b':
      if (currentUser.role !== 'cocina_b') {
        setView('login')
        return null
      }
      return <KDSView kitchen="b" onBack={handleLogout} />

    default:
      return <LandingPage onLogin={() => setView('login')} />
  }
}

interface AppClientRootProps {
  initialBranding: TenantBranding
}

export function AppClientRoot({ initialBranding }: AppClientRootProps) {
  return (
    <AppProvider>
      <AppContent initialBranding={initialBranding} />
      <Toaster position="top-center" richColors />
    </AppProvider>
  )
}
