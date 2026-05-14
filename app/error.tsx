'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
      fontFamily: FONT,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '80px 48px',
    }}>
      <span style={{
        position: 'absolute',
        top: -40,
        right: -30,
        fontFamily: FONT,
        fontWeight: 700,
        letterSpacing: '-0.06em',
        fontSize: 'clamp(200px, 28vw, 400px)',
        lineHeight: 0.78,
        color: 'rgba(255,255,255,0.04)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>500</span>

      <div style={{ maxWidth: 640, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: '#909090' }}>§ 02</span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: '#fff' }}>Algo se rompió</span>
        </div>

        <h1 style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 'clamp(40px, 7vw, 64px)',
          letterSpacing: '-0.05em',
          lineHeight: 0.92,
          marginBottom: 20,
        }}>
          No fue tu culpa.<br />
          <span style={{ color: MINT }}>Fue la nuestra.</span>
        </h1>

        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontFamily: FONT, maxWidth: 420, marginBottom: 32 }}>
          Tuvimos un error inesperado. El equipo ya recibió la alerta y está revisándolo
          — tu pedido sigue intacto, tus datos están a salvo.
        </p>

        <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, maxWidth: 480, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: '#fff' }}>Detalle técnico</span>
            {error.digest && (
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>ID · {error.digest}</span>
            )}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
            <div>surface · waitless.app</div>
            <div style={{ color: MINT }}>status · equipo notificado</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 12 }}>
          <button
            onClick={reset}
            style={{
              height: 44,
              padding: '0 20px',
              background: MINT,
              color: MINT_DEEP,
              border: 'none',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: FONT,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Reintentar ↻
          </button>
          <a href="/" style={{
            height: 44,
            padding: '0 20px',
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 700,
            fontFamily: FONT,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}>
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  )
}
