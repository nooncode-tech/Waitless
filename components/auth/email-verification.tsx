'use client'

import React, { useState } from 'react'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"

interface EmailVerificationProps {
  /** Email real o usuario con el que se identifica la cuenta a verificar. */
  identifier: string
  /** Email a mostrar ("Te enviamos un código a ..."). Opcional. */
  email?: string
  /** Se llama cuando el código se verifica correctamente. */
  onVerified: () => void
  /** Acción opcional para volver atrás (ej. volver al login). */
  onBack?: () => void
  /** Color de acento de los botones (default negro). */
  accent?: string
}

export function EmailVerification({ identifier, email, onVerified, onBack, accent = '#000' }: EmailVerificationProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const codeValid = /^\d{6}$/.test(code)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codeValid) return
    setError('')
    setInfo('')
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code }),
      })
      if (res.ok) {
        onVerified()
      } else {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Código incorrecto o vencido')
      }
    } catch {
      setError('Error de conexión. Verificá tu red e intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return
    setError('')
    setInfo('')
    setIsResending(true)
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      setInfo('Te reenviamos un código nuevo. Revisá tu correo.')
      // Cooldown de 30s para evitar spam (el server también limita a 3/min).
      setCooldown(30)
      const timer = setInterval(() => {
        setCooldown(c => {
          if (c <= 1) { clearInterval(timer); return 0 }
          return c - 1
        })
      }, 1000)
    } catch {
      setError('No pudimos reenviar el código. Intentá de nuevo en un momento.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 360, fontFamily: FONT }}>
      <style>{`@keyframes ev-spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>✉️</div>
        <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 8 }}>
          Verificá tu email.
        </h1>
        <p style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.55)', fontFamily: FONT }}>
          {email
            ? <>Te enviamos un código de 6 dígitos a <strong>{email}</strong>. Ingresalo para activar tu cuenta.</>
            : 'Te enviamos un código de 6 dígitos a tu correo. Ingresalo para activar tu cuenta.'}
        </p>
      </div>

      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          autoFocus
          disabled={isLoading}
          style={{
            height: 56, padding: '0 14px', textAlign: 'center',
            border: '1px solid rgba(0,0,0,0.15)', borderRadius: 12,
            fontSize: 28, fontFamily: MONO, letterSpacing: '0.5em', fontWeight: 700,
            outline: 'none', background: '#FAFAFA', color: '#000',
            width: '100%', boxSizing: 'border-box',
          }}
        />

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#c0392b', background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '10px 14px' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 3.5v3.5M6.5 8.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {error}
          </div>
        )}
        {info && (
          <div style={{ fontSize: 12.5, color: '#0a7d3a', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 14px' }}>
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !codeValid}
          style={{
            height: 46, width: '100%',
            background: isLoading || !codeValid ? 'rgba(0,0,0,0.35)' : accent,
            color: '#fff', border: 'none', borderRadius: 999,
            fontSize: 14, fontWeight: 700, fontFamily: FONT,
            cursor: isLoading || !codeValid ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {isLoading
            ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'ev-spin 0.7s linear infinite' }} />
            : 'Verificar →'}
        </button>
      </form>

      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12.5, color: 'rgba(0,0,0,0.5)' }}>
        ¿No te llegó?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: cooldown > 0 || isResending ? 'rgba(0,0,0,0.3)' : '#000',
            fontWeight: 700, fontFamily: FONT, fontSize: 12.5,
            cursor: cooldown > 0 || isResending ? 'default' : 'pointer',
            textDecoration: cooldown > 0 || isResending ? 'none' : 'underline',
          }}
        >
          {cooldown > 0 ? `Reenviar en ${cooldown}s` : isResending ? 'Reenviando…' : 'Reenviar código'}
        </button>
      </div>

      {onBack && (
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button
            type="button"
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 12.5, color: 'rgba(0,0,0,0.45)', fontWeight: 500 }}
          >
            ← Volver
          </button>
        </div>
      )}
    </div>
  )
}
