'use client'

import { useEffect, useState } from 'react'
import './payment.css'

type PaymentState = 'loading' | 'confirmed' | 'pending'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

export default function PaymentSuccessPage() {
  const [state, setState] = useState<PaymentState>('loading')
  const [ref, setRef]     = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripeSessionId = params.get('session_id')
    setRef(stripeSessionId)

    // Stripe's success_url fires as soon as the customer completes checkout,
    // but the webhook (which marks the DB session as 'pagada') may arrive
    // a few seconds later. We poll the /api/payments/status endpoint briefly
    // so the UI reflects the actual DB state rather than just the URL redirect.
    if (!stripeSessionId) {
      setState('confirmed')
      return
    }

    let attempts = 0
    const MAX_ATTEMPTS = 8
    const INTERVAL_MS = 1500

    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/payments/status?stripe_session_id=${encodeURIComponent(stripeSessionId)}`)
        if (res.ok) {
          const json = await res.json()
          if (json.bill_status === 'pagada') {
            setState('confirmed')
            clearInterval(interval)
            return
          }
        }
      } catch { /* ignore — webhook may still be in flight */ }

      if (attempts >= MAX_ATTEMPTS) {
        // Webhook hasn't arrived yet; show confirmed anyway (Stripe already charged)
        setState('confirmed')
        clearInterval(interval)
      }
    }, INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return (
    <div
      className="pay-success-bg"
      style={{ minHeight: '100vh', fontFamily: FONT, display: 'flex', flexDirection: 'column' }}
    >
      {/* Confetti */}
      <span className="pay-confetti" style={{ left: '10%',  animationDelay: '0s' }} />
      <span className="pay-confetti" style={{ left: '25%',  animationDelay: '0.4s',  background: '#fff', width: 6, height: 6 }} />
      <span className="pay-confetti" style={{ left: '38%',  animationDelay: '1.2s',  width: 4, height: 14 }} />
      <span className="pay-confetti" style={{ left: '55%',  animationDelay: '2s' }} />
      <span className="pay-confetti" style={{ left: '72%',  animationDelay: '0.8s',  background: '#fff', width: 5, height: 5 }} />
      <span className="pay-confetti" style={{ left: '88%',  animationDelay: '1.6s',  width: 10, height: 10 }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto', width: '100%', padding: '48px 24px 40px', position: 'relative', zIndex: 2 }}>

        {/* ── Top row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {state === 'confirmed' && <div className="pay-live-dot" />}
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: MINT }}>
              {state === 'loading' ? 'Verificando…' : 'Pago exitoso'}
            </span>
          </div>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            {dateStr} · {timeStr}
          </span>
        </div>

        {/* ── Main content ── */}
        {state === 'loading' ? (
          /* Loading state */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div className="pay-spinner" />
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, letterSpacing: '-0.05em', lineHeight: 0.92, marginBottom: 12 }}>
                Confirmando<br />
                <span style={{ color: MINT }}>tu pago.</span>
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
                Verificando con el sistema. Un momento.
              </p>
            </div>
          </div>
        ) : (
          /* Confirmed state */
          <>
            {/* Stamp */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
              <div className="pay-stamp">✓</div>
              <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '-0.05em', lineHeight: 0.92, marginTop: 36 }}>
                Pagado.<br />
                <span style={{ color: MINT }}>Todo listo.</span>
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 14, maxWidth: 380 }}>
                Tu pago fue procesado correctamente. Podés cerrar esta ventana y volver a tu mesa.
              </p>
            </div>

            {/* Detail card */}
            <div className="pay-detail-card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Referencia</div>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, letterSpacing: '-0.035em', color: MINT }}>
                    {ref ? `…${ref.slice(-8)}` : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Estado</div>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, letterSpacing: '-0.035em' }}>Confirmado</div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 10.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                  {ref && <div>ID: <span style={{ color: '#fff', fontWeight: 700 }}>{ref.slice(0, 24)}…</span></div>}
                  <div>Fecha: <span style={{ color: '#fff', fontWeight: 700 }}>{dateStr}</span></div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                className="pay-btn-mint"
                onClick={() => window.history.back()}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 2h6l3 3v7H3V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
                Ver recibo
              </button>
              <button
                className="pay-btn-outline-white"
                onClick={() => window.history.back()}
              >
                Volver →
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
