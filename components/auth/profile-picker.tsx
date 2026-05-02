'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, Lock, LogOut, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
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

export function ProfilePicker({ onLogout }: ProfilePickerProps) {
  const { users, config, switchProfile } = useApp()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const activeUsers = users.filter(u => u.activo)

  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
    setPassword('')
    setError('')
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
      // On success, app-client-root auto-redirects to the role view via useEffect
    } catch {
      setError('Error de conexión. Verificá tu red.')
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

      {/* User grid or password form */}
      {!selectedUser ? (
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
      ) : (
        <div className="w-full max-w-xs">
          <button
            onClick={() => setSelectedUser(null)}
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
          </form>
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
