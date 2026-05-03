'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Mode = 'login' | 'register'

export function ConsumerAuth() {
  const router = useRouter()
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
    // Verify it's a consumer (has consumer_profiles record)
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
    router.replace('/consumidor/perfil')
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

    // Auto-login after register
    await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
    router.replace('/consumidor/perfil')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-xl tracking-tight">W</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.03em' }}>
            {mode === 'login' ? 'Bienvenido' : 'Crear cuenta'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Ingresá a tu cuenta de consumidor' : 'Registrate para pedir y dejar reseñas'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
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
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input placeholder="Nombre *" value={form.nombre} onChange={set('nombre')}
                  className="h-11 pl-9" disabled={isLoading} autoFocus />
              </div>
              <div className="flex-1">
                <Input placeholder="Apellido" value={form.apellido} onChange={set('apellido')}
                  className="h-11" disabled={isLoading} />
              </div>
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input type="email" placeholder="Email *" value={form.email} onChange={set('email')}
              className="h-11 pl-9" disabled={isLoading} autoFocus={mode === 'login'} />
          </div>

          {mode === 'register' && (
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input type="tel" placeholder="Teléfono" value={form.telefono} onChange={set('telefono')}
                className="h-11 pl-9" disabled={isLoading} />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña *"
              value={form.password}
              onChange={set('password')}
              className="h-11 pl-9 pr-10"
              disabled={isLoading}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 mt-1" disabled={isLoading || !form.email || !form.password}>
            {isLoading
              ? <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : <span className="flex items-center gap-1.5">{mode === 'login' ? 'Ingresar' : 'Crear cuenta'} <ChevronRight className="h-4 w-4" /></span>
            }
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Al registrarte aceptás nuestros{' '}
          <span className="text-gray-600 font-medium">Términos de servicio</span>
        </p>
      </div>
    </div>
  )
}
