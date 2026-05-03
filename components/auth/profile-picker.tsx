'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, Lock, LogOut, AlertCircle, Mail, CheckCircle } from 'lucide-react'
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

  // Recovery state
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')

  const activeUsers = users.filter(u => u.activo)

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
      if (!user) {
        setError('Contraseña incorrecta')
      }
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
      if (error) {
        setRecoveryError('No se pudo enviar el correo. Verificá el email.')
      } else {
        setRecoverySent(true)
      }
    } catch {
      setRecoveryError('Error de conexión. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Restaurant branding */}
      <div className="mb-8 text-center">
        <WaitlessLogo size={48} color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
        {config.restaurantName && (
          <p className="mt-2 text-sm font-semibold text-foreground">{config.restaurantName}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">Seleccioná tu perfil para continuar</p>
      </div>

      {/* ── User grid ── */}
      {screen === 'picker' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-sm">
          {activeUsers.map(user => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted hover:border-foreground/30 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold shrink-0">
                {user.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="text-center w-full">
                <p className="text-xs font-semibold text-foreground leading-tight truncate">{user.nombre}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Password form ── */}
      {screen === 'password' && selectedUser && (
        <div className="w-full max-w-xs">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
          >
            ← Volver
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold shrink-0">
              {selectedUser.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedUser.nombre}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[selectedUser.role] ?? selectedUser.role}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
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
              <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11"
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
        <div className="w-full max-w-xs">
          <button
            onClick={() => setScreen(selectedUser ? 'password' : 'picker')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
          >
            ← Volver
          </button>

          <div className="mb-5">
            <p className="text-sm font-semibold text-foreground">Recuperar contraseña</p>
            <p className="text-xs text-muted-foreground mt-1">Ingresá el email con el que te registraste y te enviamos un enlace para crear una nueva contraseña.</p>
          </div>

          {recoverySent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">¡Correo enviado!</p>
              <p className="text-xs text-muted-foreground">Revisá tu bandeja de entrada (y spam) en <span className="font-medium">{recoveryEmail}</span>. El enlace expira en 1 hora.</p>
              <button
                onClick={() => setScreen(selectedUser ? 'password' : 'picker')}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                  className="h-11 pl-9"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              {recoveryError && (
                <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {recoveryError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11"
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

      {/* Full logout */}
      <button
        onClick={onLogout}
        className="mt-10 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        <LogOut className="h-3.5 w-3.5" />
        Cerrar sesión del restaurante
      </button>
    </div>
  )
}
