'use client'

import { useState, useEffect } from 'react'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface PaymentMethodPublic {
  id: string
  nombre: string
  tipo: string
  moneda: string
  instrucciones: string
  datosPago: Record<string, string>
  requiereComprobante: boolean
}

interface PaymentSubmitViewProps {
  sessionId: string
  tenantId: string
  totalMonto: number
  onBack: () => void
  onSubmitted: () => void
}

type Step = 'select' | 'detail' | 'submitted'

const DATO_LABELS: Record<string, string> = {
  banco: 'Banco',
  telefono: 'Teléfono',
  titular: 'Titular',
  cedula: 'Cédula',
  cuenta: 'N° de cuenta',
  email: 'Correo',
  referencia: 'Referencia',
}

export function PaymentSubmitView({
  sessionId,
  tenantId,
  totalMonto,
  onBack,
  onSubmitted,
}: PaymentSubmitViewProps) {
  const [step, setStep] = useState<Step>('select')
  const [methods, setMethods] = useState<PaymentMethodPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PaymentMethodPublic | null>(null)
  const [referencia, setReferencia] = useState('')
  const [monto, setMonto] = useState(totalMonto.toFixed(2))
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/payment-methods?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(j => setMethods(j.methods ?? []))
      .finally(() => setLoading(false))
  }, [tenantId])

  const handleSelectMethod = (m: PaymentMethodPublic) => {
    setSelected(m)
    setReferencia('')
    setSubmitError(null)
    setStep('detail')
  }

  const handleSubmit = async () => {
    if (!selected) return
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) {
      setSubmitError('Ingresa el monto pagado')
      return
    }
    if (selected.requiereComprobante && !referencia.trim()) {
      setSubmitError('La referencia o número de operación es obligatorio')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          paymentMethodId: selected.id,
          referencia: referencia.trim() || undefined,
          montoDeclarado: montoNum,
          fileType: 'referencia',
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        setSubmitError(j.error ?? 'Error al enviar. Intenta de nuevo.')
        return
      }
      setStep('submitted')
    } finally {
      setSubmitting(false)
    }
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
  }

  const backBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 40, height: 40, marginLeft: -8,
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 20, color: '#000', fontFamily: FONT, borderRadius: 12,
  }

  // ─── Submitted ───
  if (step === 'submitted') {
    return (
      <div style={{
        minHeight: '100svh', background: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '0 24px', fontFamily: FONT,
      }}>
        <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#f0fdf0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <span style={{ fontSize: 32, color: '#166534' }}>✓</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#000', margin: '0 0 8px' }}>¡Comprobante enviado!</h2>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
            El restaurante revisará tu pago y te confirmará en breve.
          </p>
          <button
            style={{
              width: '100%', height: 50, background: '#000', color: '#fff',
              border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: FONT,
            }}
            onClick={onSubmitted}
          >
            Volver al menú
          </button>
        </div>
      </div>
    )
  }

  // ─── Detail ───
  if (step === 'detail' && selected) {
    const datos = Object.entries(selected.datosPago ?? {}).filter(([, v]) => v)

    return (
      <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
        <div style={headerStyle}>
          <button onClick={() => setStep('select')} style={backBtnStyle}>←</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#000' }}>{selected.nombre}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Payment data */}
          {datos.length > 0 && (
            <div style={{ padding: '16px', background: '#f7f7f7', borderRadius: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Datos de pago
              </p>
              {datos.map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: '#666' }}>{DATO_LABELS[key] ?? key}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#000', fontFamily: MONO }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Instructions */}
          {selected.instrucciones && (
            <div style={{ padding: '14px 16px', background: '#fafff5', border: '1px solid #d1f7d6', borderRadius: 18 }}>
              <p style={{ fontSize: 14, color: '#000', margin: 0 }}>{selected.instrucciones}</p>
            </div>
          )}

          {/* Amount */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>
              Monto pagado ({selected.moneda})
            </label>
            <input
              type="number" min="0" step="0.01"
              value={monto} onChange={e => setMonto(e.target.value)}
              style={{
                width: '100%', height: 52, padding: '0 14px',
                border: '1.5px solid #e5e5e5', borderRadius: 12,
                fontSize: 20, fontWeight: 700, fontFamily: MONO,
                outline: 'none', color: '#000', boxSizing: 'border-box', background: '#fff',
              }}
            />
          </div>

          {/* Reference */}
          {selected.requiereComprobante && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>
                # Número de referencia / operación
              </label>
              <input
                value={referencia} onChange={e => setReferencia(e.target.value)}
                placeholder="ej. 012345678"
                style={{
                  width: '100%', height: 44, padding: '0 12px',
                  border: '1.5px solid #e5e5e5', borderRadius: 12,
                  fontSize: 14, fontFamily: MONO, outline: 'none',
                  color: '#000', boxSizing: 'border-box', background: '#fff',
                }}
              />
              <p style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
                ↑ Puedes enviar la captura de pantalla al mesero si lo prefieres.
              </p>
            </div>
          )}

          {submitError && (
            <p style={{ fontSize: 14, color: '#dc2626' }}>{submitError}</p>
          )}
        </div>

        <div style={{
          padding: '12px 16px', borderTop: '1px solid #f0f0f0',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        }}>
          <button
            style={{
              width: '100%', height: 52, background: submitting ? '#ccc' : '#000',
              color: '#fff', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: FONT,
            }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Enviando…' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Select method ───
  return (
    <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtnStyle}>←</button>
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#000', display: 'block' }}>Pagar cuenta</span>
          <span style={{ fontSize: 12, color: '#888' }}>Total: ${totalMonto.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Selecciona cómo quieres pagar:</p>

        {loading ? (
          <div style={{ fontSize: 14, color: '#aaa', padding: '32px 0', textAlign: 'center' }}>
            Cargando opciones…
          </div>
        ) : methods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>Ø</div>
            <p style={{ fontSize: 14, color: '#888' }}>
              No hay métodos de pago configurados.<br />Por favor llama al mesero.
            </p>
          </div>
        ) : (
          methods.map(m => (
            <button
              key={m.id}
              onClick={() => handleSelectMethod(m)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px', border: '1.5px solid #e5e5e5', borderRadius: 20,
                background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f7f7f7')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#000', margin: 0 }}>{m.nombre}</p>
                {m.instrucciones && (
                  <p style={{
                    fontSize: 12, color: '#888', marginTop: 3,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    maxWidth: 260,
                  }}>{m.instrucciones}</p>
                )}
              </div>
              <span style={{ fontSize: 18, color: '#aaa', flexShrink: 0 }}>›</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
