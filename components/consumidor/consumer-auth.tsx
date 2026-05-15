'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GoogleAuthButton } from '@/components/ui/google-auth-button'
import '@/app/consumidor/auth.css'

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

  const switchMode = (m: Mode) => { setMode(m); setError('') }

  /* ── password strength ── */
  const strength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2
    : /[^a-zA-Z0-9]/.test(form.password) ? 4
    : 3

  return (
    <div className="ath-root">

      {/* Logo header */}
      <div className="ath-header">
        <a href="/consumidor/explorar" className="ath-logo">
          <span className="ath-logo-mark">W</span>
          <span className="ath-logo-name">WAITLESS</span>
        </a>
      </div>

      {/* Card */}
      <div className="ath-card">

        {/* Tab bar */}
        <div className="ath-tab-bar">
          <button
            className={`ath-tab${mode === 'login' ? ' ath-tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Iniciar sesión
          </button>
          <button
            className={`ath-tab${mode === 'register' ? ' ath-tab--active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Crear cuenta
          </button>
        </div>

        {/* Heading */}
        {mode === 'login' ? (
          <>
            <h1 className="ath-heading ath-heading--36">
              Bienvenido,<br />de vuelta.
            </h1>
            <p className="ath-subheading">
              Entra a tu app de comensal con tu correo.
            </p>
          </>
        ) : (
          <>
            <h1 className="ath-heading ath-heading--32">
              Crea tu cuenta.
            </h1>
            <p className="ath-subheading">
              Accede a restaurantes, wallet y pedidos.
            </p>
          </>
        )}

        {/* Form */}
        <form
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
          className="ath-form"
        >
          {/* Register-only: nombre + apellido */}
          {mode === 'register' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="ath-field">
                <label className="ath-label">Nombre *</label>
                <input
                  className="ath-input"
                  placeholder="Juan"
                  value={form.nombre}
                  onChange={set('nombre')}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="ath-field">
                <label className="ath-label">Apellido</label>
                <input
                  className="ath-input"
                  placeholder="García"
                  value={form.apellido}
                  onChange={set('apellido')}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="ath-field">
            <label className="ath-label">Correo</label>
            <input
              className="ath-input"
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={set('email')}
              disabled={isLoading}
              autoFocus={mode === 'login'}
              autoComplete="email"
            />
          </div>

          {/* Register-only: teléfono */}
          {mode === 'register' && (
            <div className="ath-field">
              <label className="ath-label">Teléfono</label>
              <input
                className="ath-input"
                type="tel"
                placeholder="+1 234 567 8900"
                value={form.telefono}
                onChange={set('telefono')}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Password */}
          <div className="ath-field">
            <label className="ath-label">
              <span>Contraseña</span>
            </label>
            <div className="ath-input-wrap">
              <input
                className="ath-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                value={form.password}
                onChange={set('password')}
                disabled={isLoading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                tabIndex={-1}
                className="ath-eye-btn"
                onClick={() => setShowPassword(s => !s)}
              >
                {showPassword ? '○' : '●'}
              </button>
            </div>
            {mode === 'register' && form.password.length > 0 && (
              <>
                <div className="ath-strength">
                  {[1,2,3,4].map(i => (
                    <span
                      key={i}
                      className={
                        'ath-strength-bar' +
                        (i < strength ? ' ath-strength-bar--on' : '') +
                        (i === strength && strength === 4 ? ' ath-strength-bar--full' : '')
                      }
                    />
                  ))}
                </div>
                <span className="ath-hint">
                  Fuerza:{' '}
                  <strong style={{ color: '#000' }}>
                    {strength <= 1 ? 'débil' : strength === 2 ? 'media' : strength === 3 ? 'buena' : 'fuerte'}
                  </strong>
                  {strength < 4 && ' · agrega un símbolo'}
                </span>
              </>
            )}
            {mode === 'register' && (
              <span className="ath-hint">Mínimo 8 caracteres</span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="ath-error">
              <span style={{ flexShrink: 0 }}>⚠</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="ath-btn-primary"
            disabled={isLoading || !form.email || !form.password}
          >
            {isLoading ? (
              <>
                <span className="ath-spinner" />
                {mode === 'login' ? 'Verificando...' : 'Creando cuenta...'}
              </>
            ) : mode === 'login' ? 'Entrar →' : 'Crear cuenta →'}
          </button>

          {/* Divider */}
          <div className="ath-divider">
            <div className="ath-divider-line" />
            <span className="ath-divider-text">o continúa con</span>
            <div className="ath-divider-line" />
          </div>

          {/* Google */}
          <GoogleAuthButton
            label="Continuar con Google"
            redirectTo={typeof window !== 'undefined'
              ? `${window.location.origin}/consumidor/auth/callback`
              : '/consumidor/auth/callback'}
            onBeforeRedirect={() => {
              if (next !== '/consumidor/explorar') localStorage.setItem('waitless:next', next)
            }}
          />
        </form>

        {/* Footer */}
        <div className="ath-footer">
          <span>
            {mode === 'login' ? '¿Eres nuevo?' : '¿Ya tienes cuenta?'}
          </span>
          <button
            className="ath-footer-link"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Crear cuenta →' : 'Iniciar sesión →'}
          </button>
        </div>
      </div>

      {/* Legal note */}
      <p style={{
        marginTop: 24,
        fontSize: 11,
        color: 'rgba(0,0,0,0.4)',
        fontFamily: 'var(--ath-mono)',
        textAlign: 'center',
        maxWidth: 440,
        letterSpacing: '0.02em',
      }}>
        Al continuar aceptas los{' '}
        <span style={{ color: 'rgba(0,0,0,0.65)', cursor: 'pointer' }}>Términos de servicio</span>
        {' '}y la{' '}
        <span style={{ color: 'rgba(0,0,0,0.65)', cursor: 'pointer' }}>Política de privacidad</span>
      </p>
    </div>
  )
}
