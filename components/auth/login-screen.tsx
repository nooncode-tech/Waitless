'use client'

import React from "react"
import { useState } from 'react'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { GoogleAuthButton } from '@/components/ui/google-auth-button'
import type { UserRole } from '@/lib/store'
import type { TenantBranding } from '@/lib/tenant-server'

interface LoginScreenProps {
  onLoginSuccess: (role: UserRole) => void
  onBack?: () => void
  /** Branding pre-cargado server-side. Evita flash de logo/nombre vacío en el primer render. */
  initialBranding?: TenantBranding
}

export function LoginScreen({ onLoginSuccess, onBack, initialBranding }: LoginScreenProps) {
  const { login, config } = useApp()

  // Usa config del contexto (post-hidratación) con fallback al branding server-side
  const logoUrl = config.logoUrl ?? initialBranding?.logoUrl
  const restaurantName = config.restaurantName ?? initialBranding?.restaurantName
  const primaryColor = config.primaryColor ?? initialBranding?.primaryColor ?? '#000000'
  const fontFamily = config.fontFamily ?? initialBranding?.fontFamily ?? "'Helvetica Neue', Helvetica, Arial, sans-serif"
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await login(username.trim(), password)
      if (user) {
        onLoginSuccess(user.role)
      } else {
        setError('Usuario o contraseña incorrectos')
      }
    } catch {
      setError('Error de conexión. Verificá tu red e intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex relative">
      {/* Back to home button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-5 left-5 z-10 flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-black transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Inicio
        </button>
      )}

      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12" style={{ backgroundColor: primaryColor }}>
        <WaitlessLogo size={56} variant="mark" color="light" imageUrl={logoUrl} imageAlt={restaurantName ?? 'Logo'} />
        <p
          className="mt-6 text-white/50 text-sm text-center max-w-xs leading-relaxed"
          style={{ fontFamily }}
        >
          Plataforma operativa para restaurantes con servicio en mesa.
        </p>
        <div className="mt-16 space-y-3 w-full max-w-xs">
          {[
            'Mesa → Pedido → Cocina → Cobro',
            'Sin fricciones. Sin errores.',
            'Operación impecable primero.',
          ].map((line) => (
            <div key={line} className="flex items-center gap-3">
              <div className="w-1 h-1 rounded-full bg-white/30" />
              <span className="text-white/40 text-xs">{line}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <WaitlessLogo size={48} variant="full" color="dark" imageUrl={logoUrl} imageAlt={restaurantName ?? 'Logo'} />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1
              className="text-2xl font-bold text-black"
              style={{ fontFamily, letterSpacing: '-0.02em' }}
            >
              Iniciar sesión
            </h1>
            <p className="text-sm text-[#6B6B6B] mt-1">
              Ingresá tus credenciales para acceder
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-black uppercase tracking-wide">
                Usuario
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 border-[#E5E5E5] focus:border-black focus:ring-black rounded"
                autoComplete="username"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-black uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10 border-[#E5E5E5] focus:border-black focus:ring-black rounded"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BEBEBE] hover:text-black transition-colors"
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
              disabled={isLoading || !username.trim() || !password}
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

          {/* Bottom links */}
          <div className="mt-6 space-y-3">
            <GoogleAuthButton label="Continuar con Google" />

            <p className="text-center text-xs text-[#ADADAD]">
              ¿No tenés cuenta?{' '}
              <Link
                href="/registro"
                className="text-[#555] font-semibold underline underline-offset-2 hover:text-black transition-colors"
              >
                Registrá tu negocio
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-[10px] text-[#ADADAD] text-center">
          {restaurantName ?? 'WAITLESS · Plataforma operativa para restaurantes'}
        </p>
      </div>
    </div>
  )
}
