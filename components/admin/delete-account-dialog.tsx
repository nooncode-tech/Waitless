'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

interface Props {
  onClose: () => void
}

type Step = 'warning' | 'confirm' | 'done'

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  padding: 16,
  fontFamily: FONT,
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
  width: '100%',
  maxWidth: 380,
  overflow: 'hidden',
}

export function DeleteAccountDialog({ onClose }: Props) {
  const [step, setStep] = useState<Step>('warning')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!password.trim()) {
      setError('Ingresá tu contraseña para confirmar')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setError('No hay sesión activa. Recargá la página.')
        return
      }

      const res = await fetch('/api/admin/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error inesperado')
        return
      }

      await supabase.auth.signOut()
      setStep('done')
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Paso: éxito ──────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div style={overlayStyle}>
        <div style={{ ...cardStyle, padding: 32, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: '#F3F4F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 24,
          }}>
            🗑
          </div>
          <h2 style={{ fontWeight: 900, fontSize: 20, color: '#111', marginBottom: 8, letterSpacing: -0.3 }}>
            Cuenta eliminada
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
            Tu cuenta y todos los datos del restaurante fueron eliminados permanentemente.
          </p>
          <button
            onClick={() => { window.location.href = '/' }}
            style={{
              width: '100%', height: 44, borderRadius: 10,
              background: '#111', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, fontFamily: FONT,
            }}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  // ── Paso: advertencia ────────────────────────────────────────────────────────

  if (step === 'warning') {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 20px 16px',
            borderBottom: '1px solid #F3F4F6',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: '#FEE2E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15,
              }}>
                ⚠
              </div>
              <h2 style={{ fontWeight: 900, fontSize: 15, color: '#111', margin: 0, letterSpacing: -0.2 }}>
                Eliminar cuenta
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: '#9CA3AF', lineHeight: 1,
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8,
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
              Esta acción es <strong style={{ color: '#111' }}>permanente e irreversible</strong>. Se eliminarán:
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Tu cuenta y acceso a la plataforma',
                'Menú, categorías e ingredientes',
                'Historial de órdenes y sesiones',
                'Configuración y branding del restaurante',
                'Datos de inventario y reportes',
              ].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#6B7280' }}>
                  <span style={{
                    marginTop: 5, width: 6, height: 6,
                    borderRadius: '50%', background: '#FCA5A5',
                    flexShrink: 0, display: 'inline-block',
                  }} />
                  {item}
                </li>
              ))}
            </ul>
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: 10, padding: '12px 16px',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', margin: 0 }}>
                Solo puedes eliminar tu cuenta si no tienes órdenes activas ni mesas abiertas.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, height: 44, borderRadius: 10,
                background: '#fff', border: '1px solid #E5E5E5',
                color: '#374151', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => setStep('confirm')}
              style={{
                flex: 1, height: 44, borderRadius: 10,
                background: '#DC2626', border: 'none',
                color: '#fff', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Paso: confirmación con contraseña ────────────────────────────────────────

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid #F3F4F6',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
            }}>
              🗑
            </div>
            <h2 style={{ fontWeight: 900, fontSize: 15, color: '#111', margin: 0, letterSpacing: -0.2 }}>
              Confirmar eliminación
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: '#9CA3AF', lineHeight: 1,
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
            Ingresá tu contraseña para confirmar que sos vos quien solicita la eliminación.
          </p>

          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 6,
            }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleDelete()}
                placeholder="Tu contraseña actual"
                autoFocus
                style={{
                  width: '100%', height: 44, borderRadius: 10,
                  border: `1px solid ${error ? '#FCA5A5' : '#E5E5E5'}`,
                  padding: '0 40px 0 12px',
                  fontSize: 14, fontFamily: FONT,
                  outline: 'none', boxSizing: 'border-box',
                  background: '#fff', color: '#111',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 10,
                  top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: '#9CA3AF', lineHeight: 1,
                }}
              >
                {showPassword ? '○' : '●'}
              </button>
            </div>
            {error && (
              <p style={{ fontSize: 11, color: '#DC2626', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>⚠</span> {error}
              </p>
            )}
          </div>

          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 10, padding: '12px 16px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#B91C1C', margin: 0 }}>
              ⚠ Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setStep('warning')}
            disabled={loading}
            style={{
              flex: 1, height: 44, borderRadius: 10,
              background: '#fff', border: '1px solid #E5E5E5',
              color: '#374151', fontWeight: 600, fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, fontFamily: FONT,
            }}
          >
            Volver
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || !password.trim()}
            style={{
              flex: 1, height: 44, borderRadius: 10,
              background: '#DC2626', border: 'none',
              color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: (loading || !password.trim()) ? 'not-allowed' : 'pointer',
              opacity: (loading || !password.trim()) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: FONT,
            }}
          >
            {loading ? (
              <>
                <span style={{ fontSize: 16 }}>↻</span>
                Eliminando...
              </>
            ) : (
              'Eliminar cuenta'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
