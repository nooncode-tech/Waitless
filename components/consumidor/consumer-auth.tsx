'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, LogIn } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    if (error) {
      setError('Email o contraseña incorrectos')
      setIsLoading(false)
      return
    }
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
    if (!res.ok) {
      setError(data.error ?? 'Error al registrarse')
      setIsLoading(false)
      return
    }

    await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
    router.replace(next)
  }

  return (
    <div className="min-h-screen bg-white flex relative" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/* Back */}
      <a
        href="/"
        className="absolute top-5 left-5 z-10 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-900 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Inicio
      </a>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-zinc-950 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />

        {/* Logo */}
        <div className="relative w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-8 shadow-xl">
          <span className="font-black text-zinc-900 text-2xl" style={{ letterSpacing: '-0.04em' }}>W</span>
        </div>

        <h2 className="text-white font-black text-2xl text-center mb-3" style={{ letterSpacing: '-0.03em' }}>
          Bienvenido a Waitless
        </h2>
        <p className="text-zinc-500 text-sm text-center max-w-xs leading-relaxed mb-12">
          Tu plataforma para pedir en restaurantes, seguir tus pedidos y dejar reseñas.
        </p>

        <div className="space-y-3 w-full max-w-xs">
          {[
            'Pedí desde cualquier restaurante',
            'Seguí el estado de tu pedido en vivo',
            'Guardá tus direcciones favoritas',
            'Dejá reseñas y ayudá a otros',
          ].map(line => (
            <div key={line} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
              <span className="text-zinc-400 text-xs">{line}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center">
            <span className="text-white font-black text-xl" style={{ letterSpacing: '-0.04em' }}>W</span>
          </div>
          <span className="font-bold text-sm text-zinc-400 tracking-tight">WAITLESS</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-black text-zinc-900" style={{ letterSpacing: '-0.03em' }}>
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {mode === 'login' ? 'Ingresá a tu cuenta de consumidor' : 'Registrate para pedir y dejar reseñas'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-zinc-100 rounded-xl p-1 mb-6">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarme'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">
            {mode === 'register' && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 pointer-events-none" />
                  <Input placeholder="Nombre *" value={form.nombre} onChange={set('nombre')}
                    className="h-11 pl-9 border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900 rounded" disabled={isLoading} autoFocus />
                </div>
                <div className="flex-1">
                  <Input placeholder="Apellido" value={form.apellido} onChange={set('apellido')}
                    className="h-11 border-zinc-200 focus:border-zinc-900 rounded" disabled={isLoading} />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 pointer-events-none" />
              <Input type="email" placeholder="Email *" value={form.email} onChange={set('email')}
                className="h-11 pl-9 border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900 rounded"
                disabled={isLoading} autoFocus={mode === 'login'} autoComplete="email" />
            </div>

            {mode === 'register' && (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 pointer-events-none" />
                <Input type="tel" placeholder="Teléfono" value={form.telefono} onChange={set('telefono')}
                  className="h-11 pl-9 border-zinc-200 focus:border-zinc-900 rounded" disabled={isLoading} />
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 pointer-events-none" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña *"
                value={form.password}
                onChange={set('password')}
                className="h-11 pl-9 pr-10 border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900 rounded"
                disabled={isLoading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded font-semibold text-sm tracking-wide bg-zinc-900 hover:bg-zinc-800 text-white"
              disabled={isLoading || !form.email || !form.password}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Verificando...' : 'Creando cuenta...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
                </span>
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-zinc-100" />
            <span className="text-xs text-zinc-400 font-medium">o</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          <GoogleAuthButton
            label="Continuar con Google"
            redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/consumidor/auth/callback` : '/consumidor/auth/callback'}
            onBeforeRedirect={() => {
              if (next !== '/consumidor/explorar') {
                localStorage.setItem('waitless:next', next)
              }
            }}
          />

          <p className="text-center text-xs text-zinc-400 mt-6">
            Al registrarte aceptás nuestros{' '}
            <span className="text-zinc-600 font-medium cursor-pointer hover:text-zinc-900 transition-colors">
              Términos de servicio
            </span>
          </p>
        </div>

        <p className="mt-8 text-[10px] text-zinc-300 text-center">
          WAITLESS · Plataforma para consumidores
        </p>
      </div>
    </div>
  )
}
