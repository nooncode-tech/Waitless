'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

interface ConnectStatus {
  connected: boolean
  accountId?: string
  status: 'not_connected' | 'pending' | 'incomplete' | 'active' | 'disabled'
  charges_enabled: boolean
  payouts_enabled: boolean
  requirements_due?: string[]
  disabled_reason?: string | null
}

const STATUS_META: Record<ConnectStatus['status'], {
  label: string
  color: string
  bg: string
  border: string
  icon: string
}> = {
  not_connected: { label: 'Sin conectar',  color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: '⊘' },
  pending:       { label: 'Pendiente',     color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '⏱' },
  incomplete:    { label: 'Incompleto',    color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', icon: '⚠' },
  active:        { label: 'Activo',        color: MINT_DEEP, bg: '#F0FDF4', border: MINT,      icon: '✓' },
  disabled:      { label: 'Deshabilitado', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '✕' },
}

export function ConnectSettings() {
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const fetchStatus = useCallback(async (tok: string) => {
    const res = await fetch('/api/admin/connect/status', {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (res.ok) {
      setStatus(await res.json())
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      fetchStatus(session.access_token)
    })
  }, [fetchStatus])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connect') === 'success' && token) {
      window.history.replaceState({}, '', window.location.pathname)
      setRefreshing(true)
      setTimeout(() => fetchStatus(token), 1500)
    }
  }, [token, fetchStatus])

  const handleOnboard = async () => {
    if (!token || onboarding) return
    setOnboarding(true)
    const res = await fetch('/api/admin/connect/onboard', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        returnUrl:  `${window.location.origin}/restaurante?connect=success`,
        refreshUrl: `${window.location.origin}/restaurante?connect=refresh`,
      }),
    })
    const data = await res.json()
    if (res.ok && data.url) {
      window.location.href = data.url
    } else {
      console.error('[connect] onboard error:', data)
      setOnboarding(false)
    }
  }

  const handleRefresh = () => {
    if (!token) return
    setRefreshing(true)
    fetchStatus(token)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontFamily: FONT }}>
        <span style={{ fontSize: 24, color: '#CCC' }}>↻</span>
      </div>
    )
  }

  const meta = STATUS_META[status?.status ?? 'not_connected']
  const isActive = status?.status === 'active'

  return (
    <div style={{ padding: 24, maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24, fontFamily: FONT }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111', margin: 0 }}>Stripe Connect</h2>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          Conectá tu cuenta bancaria para recibir pagos directamente en tu cuenta.
          Waitless retiene una comisión del 5% por transacción.
        </p>
      </div>

      {/* Status card */}
      <div style={{
        borderRadius: 14,
        border: `1px solid ${meta.border}`,
        background: meta.bg,
        padding: 20,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <span style={{ fontSize: 20, color: meta.color, marginTop: 2, lineHeight: 1 }}>{meta.icon}</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: meta.color, margin: 0 }}>{meta.label}</p>
            {status?.accountId && (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontFamily: MONO }}>{status.accountId}</p>
            )}
            {status?.status === 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: MINT_DEEP }}>✓</span> Cobros habilitados
                </span>
                <span style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: MINT_DEEP }}>✓</span> Pagos habilitados
                </span>
              </div>
            )}
            {status?.requirements_due && status.requirements_due.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9A3412', margin: '0 0 4px' }}>Información pendiente:</p>
                <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {status.requirements_due.slice(0, 5).map(r => (
                    <li key={r} style={{ fontSize: 11, color: '#EA580C' }}>{r.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}
            {status?.disabled_reason && (
              <p style={{ marginTop: 8, fontSize: 11, color: '#DC2626' }}>
                Motivo: {status.disabled_reason.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Actualizar estado"
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: refreshing ? 'default' : 'pointer',
            fontSize: 16,
            color: refreshing ? '#9CA3AF' : '#6B7280',
            padding: 4,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>↺</span>
        </button>
      </div>

      {/* Action */}
      {!isActive ? (
        <button
          onClick={handleOnboard}
          disabled={onboarding}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            height: 48,
            background: onboarding ? '#374151' : '#111',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            border: 'none',
            borderRadius: 14,
            cursor: onboarding ? 'not-allowed' : 'pointer',
            opacity: onboarding ? 0.7 : 1,
            fontFamily: FONT,
          }}
        >
          {onboarding ? (
            <span style={{ fontSize: 18 }}>↻</span>
          ) : (
            <>
              <span style={{ fontSize: 14 }}>↗</span>
              {status?.connected ? 'Completar configuración en Stripe' : 'Conectar cuenta bancaria'}
            </>
          )}
        </button>
      ) : (
        <div style={{
          borderRadius: 14,
          border: `1px solid ${MINT}`,
          background: '#F0FDF4',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, color: MINT_DEEP }}>⚡</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: 0 }}>Cuenta conectada y activa</p>
          </div>
          <p style={{ fontSize: 12, color: '#15803D', margin: 0 }}>
            Los pagos procesados se transfieren automáticamente a tu cuenta bancaria. La liquidación semanal
            descuenta la comisión de Waitless (5%) y transfiere el neto cada lunes.
          </p>
        </div>
      )}

      {/* Info box */}
      <div style={{
        borderRadius: 14,
        border: '1px solid #E5E5E5',
        background: '#fff',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <p style={{ fontWeight: 700, color: '#111', fontSize: 13, margin: 0 }}>¿Cómo funciona?</p>
        <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Hacé clic en "Conectar cuenta bancaria" para ir a Stripe.',
            'Completá tu información bancaria y de negocio en el formulario de Stripe.',
            'Cuando Stripe verifica tu cuenta (puede tardar 1-2 días hábiles), el estado cambia a "Activo".',
            'Cada lunes Waitless transfiere el 95% de los cobros de la semana anterior a tu cuenta.',
          ].map((text, i) => (
            <li key={i} style={{ fontSize: 12, color: '#6B7280' }}>{text}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
