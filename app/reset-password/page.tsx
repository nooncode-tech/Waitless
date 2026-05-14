'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'
const LINE = '#E5E5E5'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === 'PASSWORD_RECOVERY' ||
        event === 'SIGNED_IN' ||
        (event === 'INITIAL_SESSION' && !!session)
      ) {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError('')
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(`Error: ${error.message}`)
      } else {
        setDone(true)
        setTimeout(() => router.replace('/'), 3000)
      }
    } catch (err) {
      setError(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative W */}
      <span style={{
        position: 'absolute',
        bottom: -48,
        right: -32,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 280,
        color: 'rgba(255,255,255,0.04)',
        lineHeight: 1,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>W</span>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#fff' }}>
            <span style={{ width: 32, height: 32, background: '#fff', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: 16, letterSpacing: '-0.04em', fontFamily: FONT }}>W</span>
            <span style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-0.045em', fontFamily: FONT }}>WAITLESS</span>
          </a>
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Reset</span>
        </div>

        {done ? (
          /* ── Done state ── */
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: MINT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14l6 6 10-10" stroke={MINT_DEEP} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, letterSpacing: '-0.045em', lineHeight: 0.95, marginBottom: 12 }}>
              ¡Listo!
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
              Contraseña actualizada. Redirigiendo al inicio de sesión…
            </p>
          </div>
        ) : !ready ? (
          /* ── Verifying state ── */
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.7s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Verificando enlace…
            </p>
          </div>
        ) : (
          /* ── Form state ── */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, letterSpacing: '-0.045em', lineHeight: 0.95, marginBottom: 10 }}>
                Nueva<br />contraseña.
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: FONT }}>
                Elige una contraseña segura. Sin límite de intentos.
              </p>
            </div>

            {/* Password field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              <label style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: '#fff', fontFamily: FONT }}>
                Nueva contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  disabled={isLoading}
                  style={{
                    height: 48,
                    padding: '0 44px 0 16px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10,
                    fontSize: 15,
                    letterSpacing: '-0.01em',
                    outline: 'none',
                    fontFamily: FONT,
                    color: '#fff',
                    background: 'rgba(255,255,255,0.05)',
                    width: '100%',
                    boxSizing: 'border-box' as const,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center' }}
                  tabIndex={-1}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    {showPassword
                      ? <><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></>
                      : <><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            {/* Confirm field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              <label style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: '#fff', fontFamily: FONT }}>
                Confirmar contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite tu contraseña"
                disabled={isLoading}
                style={{
                  height: 48,
                  padding: '0 16px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  fontSize: 15,
                  letterSpacing: '-0.01em',
                  outline: 'none',
                  fontFamily: FONT,
                  color: '#fff',
                  background: 'rgba(255,255,255,0.05)',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                }}
              />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v4M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password || !confirm}
              style={{
                width: '100%',
                height: 48,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 999,
                background: MINT,
                color: MINT_DEEP,
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '-0.01em',
                fontFamily: FONT,
                border: 'none',
                cursor: isLoading || !password || !confirm ? 'not-allowed' : 'pointer',
                opacity: isLoading || !password || !confirm ? 0.5 : 1,
              }}
            >
              {isLoading
                ? <span style={{ width: 16, height: 16, border: `2px solid ${MINT_DEEP}40`, borderTopColor: MINT_DEEP, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                : 'Guardar nueva contraseña →'
              }
            </button>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </form>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', fontFamily: MONO, fontSize: 10.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
          <div>El enlace de recuperación expira en <strong style={{ color: '#fff' }}>15 min</strong>.</div>
          <div style={{ marginTop: 4 }}>
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@waitless.app" style={{ color: '#fff', fontWeight: 700, textDecoration: 'none' }}>soporte@waitless.app</a>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25); }
        input:focus { border-color: rgba(255,255,255,0.4) !important; }
      `}</style>
    </div>
  )
}
