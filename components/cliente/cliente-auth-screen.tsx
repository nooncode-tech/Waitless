'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, UserPlus, LogIn, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { useApp } from '@/lib/context'
import { clienteLogin, clienteRegister } from '@/lib/cliente-auth'
import type { ClienteUser } from '@/lib/cliente-auth'
import type { TenantBranding } from '@/lib/tenant-server'

type Screen = 'landing' | 'login' | 'register'

interface ClienteAuthScreenProps {
  /** Llamado cuando el cliente se autentica (user) o elige continuar sin cuenta (null) */
  onSuccess: (user: ClienteUser | null) => void
  initialBranding?: TenantBranding
}

export function ClienteAuthScreen({ onSuccess, initialBranding }: ClienteAuthScreenProps) {
  const { config } = useApp()

  const logoUrl = config.logoUrl ?? initialBranding?.logoUrl
  const restaurantName = config.restaurantName ?? initialBranding?.restaurantName
  const primaryColor = config.primaryColor ?? initialBranding?.primaryColor ?? '#000000'
  const fontFamily = config.fontFamily ?? initialBranding?.fontFamily ?? "'Helvetica Neue', Helvetica, Arial, sans-serif"

  const [screen, setScreen] = useState<Screen>('landing')

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <WaitlessLogo size={48} variant="full" color="dark" imageUrl={logoUrl} imageAlt={restaurantName ?? 'Logo'} />
        </div>

        {screen === 'landing' && (
          <LandingScreen
            restaurantName={restaurantName}
            primaryColor={primaryColor}
            fontFamily={fontFamily}
            onLogin={() => setScreen('login')}
            onRegister={() => setScreen('register')}
            onGuest={() => onSuccess(null)}
          />
        )}

        {screen === 'login' && (
          <LoginForm
            primaryColor={primaryColor}
            fontFamily={fontFamily}
            onSuccess={onSuccess}
            onBack={() => setScreen('landing')}
          />
        )}

        {screen === 'register' && (
          <RegisterForm
            primaryColor={primaryColor}
            fontFamily={fontFamily}
            onSuccess={onSuccess}
            onBack={() => setScreen('landing')}
          />
        )}
      </div>
    </div>
  )
}

/* ============================================================
   LANDING
============================================================ */
interface LandingProps {
  restaurantName?: string
  primaryColor: string
  fontFamily: string
  onLogin: () => void
  onRegister: () => void
  onGuest: () => void
}

function LandingScreen({ restaurantName, primaryColor, fontFamily, onLogin, onRegister, onGuest }: LandingProps) {
  return (
    <div className="space-y-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-black" style={{ fontFamily, letterSpacing: '-0.02em' }}>
          ¡Bienvenido{restaurantName ? ` a ${restaurantName}` : ''}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          ¿Cómo querés continuar?
        </p>
      </div>

      {/* Ya tengo cuenta */}
      <button
        onClick={onLogin}
        className="w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 border-border hover:border-black transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${primaryColor}18` }}
          >
            <LogIn className="h-4 w-4" style={{ color: primaryColor }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-black">Ya tengo cuenta</p>
            <p className="text-xs text-muted-foreground">Ingresá con tu email y contraseña</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-black transition-colors" />
      </button>

      {/* Soy nuevo */}
      <button
        onClick={onRegister}
        className="w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 hover:border-black transition-colors group"
        style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <UserPlus className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-black">Soy nuevo</p>
            <p className="text-xs text-muted-foreground">Creá tu cuenta en segundos</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-black transition-colors" />
      </button>

      {/* Continuar sin cuenta */}
      <div className="pt-2 text-center">
        <button
          onClick={onGuest}
          className="text-sm text-muted-foreground hover:text-black underline underline-offset-2 transition-colors"
        >
          Continuar sin cuenta
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   LOGIN FORM
============================================================ */
interface LoginFormProps {
  primaryColor: string
  fontFamily: string
  onSuccess: (user: ClienteUser) => void
  onBack: () => void
}

function LoginForm({ primaryColor, fontFamily, onSuccess, onBack }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const user = await clienteLogin(email.trim().toLowerCase(), password)
      if (user) {
        onSuccess(user)
      } else {
        setError('Email o contraseña incorrectos')
      }
    } catch {
      setError('Error de conexión. Verificá tu red e intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-black mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-black" style={{ fontFamily, letterSpacing: '-0.02em' }}>
          Ingresá a tu cuenta
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Usá el email con el que te registraste</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="cl-email" className="text-xs font-semibold text-black uppercase tracking-wide">
            Email
          </label>
          <Input
            id="cl-email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-border focus:border-black focus:ring-black rounded"
            autoComplete="email"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cl-password" className="text-xs font-semibold text-black uppercase tracking-wide">
            Contraseña
          </label>
          <div className="relative">
            <Input
              id="cl-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-10 border-border focus:border-black focus:ring-black rounded"
              autoComplete="current-password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-xs bg-red-50 border border-red-200 p-3 rounded">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 text-white rounded font-semibold text-sm tracking-wide"
          style={{ backgroundColor: primaryColor }}
          disabled={isLoading || !email.trim() || !password}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verificando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Ingresar
            </span>
          )}
        </Button>
      </form>
    </div>
  )
}

/* ============================================================
   REGISTER FORM
============================================================ */
interface RegisterFormProps {
  primaryColor: string
  fontFamily: string
  onSuccess: (user: ClienteUser) => void
  onBack: () => void
}

function RegisterForm({ primaryColor, fontFamily, onSuccess, onBack }: RegisterFormProps) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const user = await clienteRegister(
        email.trim().toLowerCase(),
        password,
        nombre.trim(),
        telefono.trim() || undefined,
      )
      onSuccess(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-black mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-black" style={{ fontFamily, letterSpacing: '-0.02em' }}>
          Crear cuenta
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Tus pedidos quedan guardados para la próxima</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reg-nombre" className="text-xs font-semibold text-black uppercase tracking-wide">
            Nombre
          </label>
          <Input
            id="reg-nombre"
            type="text"
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="h-11 border-border focus:border-black focus:ring-black rounded"
            autoComplete="given-name"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="text-xs font-semibold text-black uppercase tracking-wide">
            Email
          </label>
          <Input
            id="reg-email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-border focus:border-black focus:ring-black rounded"
            autoComplete="email"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-tel" className="text-xs font-semibold text-black uppercase tracking-wide">
            Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Input
            id="reg-tel"
            type="tel"
            placeholder="+54 9 11 1234-5678"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="h-11 border-border focus:border-black focus:ring-black rounded"
            autoComplete="tel"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="text-xs font-semibold text-black uppercase tracking-wide">
            Contraseña
          </label>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-10 border-border focus:border-black focus:ring-black rounded"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-xs bg-red-50 border border-red-200 p-3 rounded">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 text-white rounded font-semibold text-sm tracking-wide"
          style={{ backgroundColor: primaryColor }}
          disabled={isLoading || !nombre.trim() || !email.trim() || !password}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creando cuenta...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Crear cuenta
            </span>
          )}
        </Button>
      </form>
    </div>
  )
}
