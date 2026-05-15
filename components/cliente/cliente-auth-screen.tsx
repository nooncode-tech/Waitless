'use client'

import { useState } from 'react'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { useApp } from '@/lib/context'
import { clienteLogin, clienteRegister } from '@/lib/cliente-auth'
import type { ClienteUser } from '@/lib/cliente-auth'
import type { TenantBranding } from '@/lib/tenant-server'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

type Screen = 'landing' | 'login' | 'register'

interface ClienteAuthScreenProps {
  onSuccess: (user: ClienteUser | null) => void
  initialBranding?: TenantBranding
}

export function ClienteAuthScreen({ onSuccess, initialBranding }: ClienteAuthScreenProps) {
  const { config } = useApp()

  const logoUrl = config.logoUrl ?? initialBranding?.logoUrl
  const restaurantName = config.restaurantName ?? initialBranding?.restaurantName
  const primaryColor = config.primaryColor ?? initialBranding?.primaryColor ?? '#000000'
  const fontFamily = config.fontFamily ?? initialBranding?.fontFamily ?? FONT

  const [screen, setScreen] = useState<Screen>('landing')

  return (
    <div style={{
      minHeight: '100svh', background: '#fff', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', fontFamily: FONT,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
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
  const btnBase: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderRadius: 16, border: '2px solid #e5e5e5',
    cursor: 'pointer', background: '#fff', fontFamily, transition: 'border-color 0.15s',
    marginBottom: 12,
  }

  return (
    <div>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#000', margin: 0, letterSpacing: '-0.02em', fontFamily }}>
          ¡Bienvenido{restaurantName ? ` a ${restaurantName}` : ''}!
        </h1>
        <p style={{ fontSize: 14, color: '#888', marginTop: 6 }}>¿Cómo querés continuar?</p>
      </div>

      {/* Ya tengo cuenta */}
      <button onClick={onLogin} style={btnBase}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: `${primaryColor}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 18, color: primaryColor }}>→</span>
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#000', margin: 0 }}>Ya tengo cuenta</p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Ingresá con tu email y contraseña</p>
          </div>
        </div>
        <span style={{ fontSize: 16, color: '#aaa' }}>›</span>
      </button>

      {/* Soy nuevo */}
      <button
        onClick={onRegister}
        style={{ ...btnBase, borderColor: primaryColor, background: `${primaryColor}08` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: primaryColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 18, color: '#fff' }}>+</span>
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#000', margin: 0 }}>Soy nuevo</p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Creá tu cuenta en segundos</p>
          </div>
        </div>
        <span style={{ fontSize: 16, color: '#aaa' }}>›</span>
      </button>

      <div style={{ paddingTop: 8, textAlign: 'center' }}>
        <button
          onClick={onGuest}
          style={{
            background: 'none', border: 'none', fontSize: 14, color: '#888',
            cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, fontFamily,
          }}
        >
          Continuar sin cuenta
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   SHARED STYLES
============================================================ */
const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 12px', border: '1.5px solid #e5e5e5',
  borderRadius: 10, fontSize: 14, fontFamily: FONT, outline: 'none',
  color: '#000', background: '#fff', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#000',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
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
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 14, color: '#888', background: 'none', border: 'none',
          cursor: 'pointer', marginBottom: 24, fontFamily,
        }}
      >
        ← Volver
      </button>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#000', margin: 0, letterSpacing: '-0.02em', fontFamily }}>
          Ingresá a tu cuenta
        </h2>
        <p style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Usá el email con el que te registraste</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="cl-email" style={labelStyle}>Email</label>
          <input
            id="cl-email" type="email" placeholder="tu@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={inputStyle} autoComplete="email" required disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="cl-password" style={labelStyle}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="cl-password" type={showPassword ? 'text' : 'password'} placeholder="Contraseña"
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 44 }}
              autoComplete="current-password" required disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, color: '#aaa',
              }}
              tabIndex={-1}
            >
              {showPassword ? '●' : '○'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: '#dc2626', fontSize: 12, background: '#fef2f2',
            border: '1px solid #fecaca', padding: '10px 12px', borderRadius: 10,
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            width: '100%', height: 50, color: '#fff', border: 'none',
            borderRadius: 14, fontSize: 15, fontWeight: 700,
            cursor: isLoading || !email.trim() || !password ? 'not-allowed' : 'pointer',
            opacity: isLoading || !email.trim() || !password ? 0.6 : 1,
            background: primaryColor, fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          disabled={isLoading || !email.trim() || !password}
        >
          {isLoading ? (
            <>
              <span style={{
                width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.7s linear infinite',
              }} />
              Verificando...
            </>
          ) : (
            <>→ Ingresar</>
          )}
        </button>
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
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 14, color: '#888', background: 'none', border: 'none',
          cursor: 'pointer', marginBottom: 24, fontFamily,
        }}
      >
        ← Volver
      </button>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#000', margin: 0, letterSpacing: '-0.02em', fontFamily }}>
          Crear cuenta
        </h2>
        <p style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Tus pedidos quedan guardados para la próxima</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="reg-nombre" style={labelStyle}>Nombre</label>
          <input
            id="reg-nombre" type="text" placeholder="Tu nombre"
            value={nombre} onChange={(e) => setNombre(e.target.value)}
            style={inputStyle} autoComplete="given-name" required disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="reg-email" style={labelStyle}>Email</label>
          <input
            id="reg-email" type="email" placeholder="tu@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={inputStyle} autoComplete="email" required disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="reg-tel" style={labelStyle}>
            Teléfono <span style={{ fontWeight: 400, textTransform: 'none', color: '#aaa' }}>(opcional)</span>
          </label>
          <input
            id="reg-tel" type="tel" placeholder="+54 9 11 1234-5678"
            value={telefono} onChange={(e) => setTelefono(e.target.value)}
            style={inputStyle} autoComplete="tel" disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="reg-password" style={labelStyle}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 44 }}
              autoComplete="new-password" required minLength={6} disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#aaa',
              }}
              tabIndex={-1}
            >
              {showPassword ? '●' : '○'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: '#dc2626', fontSize: 12, background: '#fef2f2',
            border: '1px solid #fecaca', padding: '10px 12px', borderRadius: 10,
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            width: '100%', height: 50, color: '#fff', border: 'none',
            borderRadius: 14, fontSize: 15, fontWeight: 700,
            cursor: isLoading || !nombre.trim() || !email.trim() || !password ? 'not-allowed' : 'pointer',
            opacity: isLoading || !nombre.trim() || !email.trim() || !password ? 0.6 : 1,
            background: primaryColor, fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          disabled={isLoading || !nombre.trim() || !email.trim() || !password}
        >
          {isLoading ? (
            <>
              <span style={{
                width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.7s linear infinite',
              }} />
              Creando cuenta...
            </>
          ) : (
            <>+ Crear cuenta</>
          )}
        </button>
      </form>
    </div>
  )
}
