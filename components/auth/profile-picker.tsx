'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, Lock, LogOut, AlertCircle, Mail, CheckCircle, ChevronLeft } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/store'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Manager',
  mesero: 'Mesero',
  cocina: 'Cocina',
}

const ROLE_COLORS: Record<string, string> = {
  admin:   'bg-violet-600',
  manager: 'bg-blue-600',
  mesero:  'bg-emerald-600',
  cocina:  'bg-orange-500',
}

interface ProfilePickerProps {
  onLogout: () => void
}

type Screen = 'picker' | 'password' | 'recovery'

export function ProfilePicker({ onLogout }: ProfilePickerProps) {
  const { users, config, switchProfile } = useApp()
  const [screen, setScreen] = useState<Screen>('picker')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')

  const activeUsers = users.filter(u => u.activo)

  const primaryColor = config.primaryColor ?? '#000000'

  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
    setPassword('')
    setError('')
    setScreen('password')
  }

  const handleBack = () => {
    setSelectedUser(null)
    setPassword('')
    setError('')
    setScreen('picker')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !password.trim()) return
    setError('')
    setIsLoading(true)
    try {
      const user = await switchProfile(selectedUser.username, password.trim())
      if (!user) setError('Contraseña incorrecta')
    } catch {
      setError('Error de conexión. Verificá tu red.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recoveryEmail.trim()) return
    setRecoveryError('')
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setRecoveryError('No se pudo enviar el correo. Verificá el email.')
      else setRecoverySent(true)
    } catch {
      setRecoveryError('Error de conexión. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex">

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col items-center justify-between p-12"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="w-full">
          <WaitlessLogo size={44} variant="mark" color="light" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
        </div>

        <div className="text-center">
          {config.restaurantName && (
            <p className="text-white text-2xl font-bold tracking-tight mb-2">{config.restaurantName}</p>
          )}
          <p className="text-white/40 text-sm">Panel de operación</p>
        </div>

        <p className="text-white/20 text-[10px] tracking-widest uppercase">Waitless · Plataforma operativa</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 text-center">
          <WaitlessLogo size={44} variant="mark" color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
          {config.restaurantName && (
            <p className="mt-2 text-sm font-bold text-foreground">{config.restaurantName}</p>
          )}
        </div>

        {/* ── Profile grid ── */}
        {screen === 'picker' && (
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-black" style={{ letterSpacing: '-0.02em' }}>
                ¿Quién sos?
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Seleccioná tu perfil para continuar</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeUsers.map(user => {
                const avatarBg = ROLE_COLORS[user.role] ?? 'bg-foreground'
                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-white hover:border-black hover:shadow-md transition-all duration-150 text-center"
                  >
                    <div className={`w-14 h-14 rounded-2xl ${avatarBg} text-white flex items-center justify-center text-xl font-bold shrink-0 group-hover:scale-105 transition-transform duration-150`}>
                      {user.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[90px]">{user.nombre}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Password form ── */}
        {screen === 'password' && selectedUser && (
          <div className="w-full max-w-sm">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Volver
            </button>

            <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-muted/50 border border-border">
              <div className={`w-12 h-12 rounded-xl ${ROLE_COLORS[selectedUser.role] ?? 'bg-foreground'} text-white flex items-center justify-center text-lg font-bold shrink-0`}>
                {selectedUser.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{selectedUser.nombre}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[selectedUser.role] ?? selectedUser.role}</p>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-black" style={{ letterSpacing: '-0.02em' }}>
                Ingresá tu clave
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Verificá tu identidad para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-10 text-sm"
                  autoFocus
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold"
                disabled={isLoading || !password.trim()}
              >
                {isLoading ? (
                  <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Ingresar
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => { setScreen('recovery'); setRecoveryEmail(''); setRecoverySent(false); setRecoveryError('') }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          </div>
        )}

        {/* ── Recovery form ── */}
        {screen === 'recovery' && (
          <div className="w-full max-w-sm">
            <button
              onClick={() => setScreen(selectedUser ? 'password' : 'picker')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Volver
            </button>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-black" style={{ letterSpacing: '-0.02em' }}>
                Recuperar acceso
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresá el email con el que te registraste y te enviamos un enlace para crear una nueva contraseña.
              </p>
            </div>

            {recoverySent ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">¡Correo enviado!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Revisá tu bandeja en <span className="font-medium text-foreground">{recoveryEmail}</span>.
                    <br />El enlace expira en 1 hora.
                  </p>
                </div>
                <button
                  onClick={() => setScreen(selectedUser ? 'password' : 'picker')}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Volver al inicio
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecovery} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="h-12 pl-9 text-sm"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                {recoveryError && (
                  <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {recoveryError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-semibold"
                  disabled={isLoading || !recoveryEmail.trim()}
                >
                  {isLoading ? (
                    <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar enlace
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión del restaurante
        </button>
      </div>
    </div>
  )
}
