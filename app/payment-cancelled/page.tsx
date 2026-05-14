'use client'

import { useEffect } from 'react'
import '../payment-success/payment.css'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"

export default function PaymentCancelledPage() {
  useEffect(() => {
    // Revert the session from 'en_pago' back to 'abierta' so staff can retry
    // or switch to another payment method. Stripe does NOT fire a webhook on
    // checkout abandonment, so we must do this from the cancel redirect.
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (sessionId) {
      fetch('/api/payments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {/* non-blocking — state will be recoverable by staff */})
    }
  }, [])

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return (
    <div
      style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto', width: '100%', padding: '48px 24px 40px' }}>

        {/* ── Top row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FBBF24', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#92400E' }}>
              Pago cancelado
            </span>
          </div>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>
            {dateStr} · {timeStr}
          </span>
        </div>

        {/* ── Stamp & headline ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
          <div className="pay-stamp-cancel">×</div>
          <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '-0.05em', lineHeight: 0.92, marginTop: 36 }}>
            No se<br />
            <span style={{ color: 'rgba(0,0,0,0.3)' }}>completó.</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)', marginTop: 14, maxWidth: 380 }}>
            No se realizó ningún cobro. Podés volver a intentarlo o pedirle al mesero que procese el pago de otra forma.
            <strong style={{ color: '#000' }}> Tu mesa sigue abierta.</strong>
          </p>
        </div>

        {/* ── Reasons card ── */}
        <div className="pay-reasons-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)' }}>§ 01</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(0,0,0,0.5)' }}>Posibles razones</span>
          </div>
          <div>
            <div className="pay-leader" style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
              <span>Fondos insuficientes</span>
              <span className="pay-leader-spacer" />
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>común · 62%</span>
            </div>
            <div className="pay-leader" style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', marginTop: 8 }}>
              <span>Tarjeta expirada o bloqueada</span>
              <span className="pay-leader-spacer" />
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>común · 24%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', paddingTop: 8, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
              <span>3DS rechazado por tu banco</span>
              <span style={{ flex: 1, margin: '0 4px' }} />
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>raro · 14%</span>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <button
            className="pay-btn-black"
            onClick={() => window.history.back()}
          >
            Reintentar →
          </button>
          <button
            className="pay-btn-outline-black"
            onClick={() => window.history.back()}
          >
            Cambiar método
          </button>
        </div>

        {/* ── Support link ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: 'rgba(0,0,0,0.5)' }}>
          <span>¿Sigues con el problema?</span>
          <a href="mailto:soporte@waitless.app" style={{ fontWeight: 700, color: '#000', textDecoration: 'none' }}>
            Hablar con soporte →
          </a>
        </div>

      </div>
    </div>
  )
}
