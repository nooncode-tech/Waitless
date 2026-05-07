'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GoogleAuthButton } from '@/components/ui/google-auth-button'

type Mode = 'login' | 'register'

export function ConsumerAuth() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/consumidor/explorar'
  const [mode, setMode] = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '', telefono: '',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    })
    if (error) { setError('Email o contraseña incorrectos'); setIsLoading(false); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setIsLoading(false); return }
    const res = await fetch('/api/consumidor/profile', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) {
      await supabase.auth.signOut()
      setError('Esta cuenta no es una cuenta de consumidor')
      setIsLoading(false)
      return
    }
    router.replace(next)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setIsLoading(true)
    const res = await fetch('/api/consumidor/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
        telefono: form.telefono.trim() || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al registrarse'); setIsLoading(false); return }
    await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
    router.replace(next)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between">
        <a href="/consumidor/explorar" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
          ← Explorar
        </a>
        <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
          <span className="text-white font-black text-sm tracking-tight">W</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h1>
            <p className="text-gray-500 text-sm">
              {mode === 'login'
                ? '¿No tenés cuenta? '
                : '¿Ya tenés cuenta? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
                className="font-semibold text-black underline underline-offset-2"
              >
                {mode === 'login' ? 'Registrate' : 'Iniciá sesión'}
              </button>
            </p>
          </div>

          {/* Google */}
          <GoogleAuthButton
            label="Continuar con Google"
            redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/consumidor/auth/callback` : '/consumidor/auth/callback'}
            onBeforeRedirect={() => {
              if (next !== '/consumidor/explorar') localStorage.setItem('waitless:next', next)
            }}
          />

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">o continuá con email</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">

            {mode === 'register' && (
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre *</label>
                  <input
                    value={form.nombre} onChange={set('nombre')} placeholder="Juan"
                    disabled={isLoading} autoFocus
                    className="w-full h-12 px-4 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Apellido</label>
                  <input
                    value={form.apellido} onChange={set('apellido')} placeholder="García"
                    disabled={isLoading}
                    className="w-full h-12 px-4 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email" value={form.email} onChange={set('email')}
                placeholder="tu@email.com" disabled={isLoading}
                autoFocus={mode === 'login'} autoComplete="email"
                className="w-full h-12 px-4 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</label>
                <input
                  type="tel" value={form.telefono} onChange={set('telefono')}
                  placeholder="+1 234 567 8900" disabled={isLoading}
                  className="w-full h-12 px-4 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={set('password')}
                  placeholder="••••••••" disabled={isLoading}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full h-12 pl-4 pr-11 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !form.email || !form.password}
              className="w-full h-12 bg-black hover:bg-zinc-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-colors mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Verificando...' : 'Creando cuenta...'}
                </span>
              ) : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            Al continuar aceptás los{' '}
            <span className="text-gray-600 font-medium cursor-pointer hover:text-gray-900">Términos de servicio</span>
            {' '}y la{' '}
            <span className="text-gray-600 font-medium cursor-pointer hover:text-gray-900">Política de privacidad</span>
          </p>
        </div>
      </div>
    </div>
  )
}
