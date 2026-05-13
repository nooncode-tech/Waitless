'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Link2, CheckCircle2, AlertCircle, Clock, XCircle,
  ExternalLink, RefreshCcw, Loader2, Zap,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  icon: React.ReactNode
}> = {
  not_connected: { label: 'Sin conectar',  color: 'text-gray-500',   bg: 'bg-gray-50',     icon: <Link2 className="h-5 w-5" /> },
  pending:       { label: 'Pendiente',     color: 'text-amber-600',  bg: 'bg-amber-50',    icon: <Clock className="h-5 w-5" /> },
  incomplete:    { label: 'Incompleto',    color: 'text-orange-600', bg: 'bg-orange-50',   icon: <AlertCircle className="h-5 w-5" /> },
  active:        { label: 'Activo',        color: 'text-[#06C167]',  bg: 'bg-emerald-50',  icon: <CheckCircle2 className="h-5 w-5" /> },
  disabled:      { label: 'Deshabilitado', color: 'text-red-600',    bg: 'bg-red-50',      icon: <XCircle className="h-5 w-5" /> },
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

  // Handle return from Stripe Connect onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connect') === 'success' && token) {
      window.history.replaceState({}, '', window.location.pathname)
      setRefreshing(true)
      setTimeout(() => fetchStatus(token), 1500) // slight delay for Stripe to propagate
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    )
  }

  const meta = STATUS_META[status?.status ?? 'not_connected']
  const isActive = status?.status === 'active'

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Stripe Connect</h2>
        <p className="text-sm text-gray-500 mt-1">
          Conectá tu cuenta bancaria para recibir pagos directamente en tu cuenta.
          Waitless retiene una comisión del 5% por transacción.
        </p>
      </div>

      {/* Status card */}
      <div className={`rounded-2xl border p-5 flex items-start justify-between gap-4 ${meta.bg}`}>
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 ${meta.color}`}>{meta.icon}</div>
          <div>
            <p className={`text-base font-bold ${meta.color}`}>{meta.label}</p>
            {status?.accountId && (
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{status.accountId}</p>
            )}
            {status?.status === 'active' && (
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-[#06C167]" />Cobros habilitados
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-[#06C167]" />Pagos habilitados
                </span>
              </div>
            )}
            {status?.requirements_due && status.requirements_due.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold text-orange-700">Información pendiente:</p>
                <ul className="list-disc list-inside text-xs text-orange-600 space-y-0.5">
                  {status.requirements_due.slice(0, 5).map(r => (
                    <li key={r}>{r.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}
            {status?.disabled_reason && (
              <p className="mt-2 text-xs text-red-600">
                Motivo: {status.disabled_reason.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors"
          title="Actualizar estado"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Action */}
      {!isActive ? (
        <button
          onClick={handleOnboard}
          disabled={onboarding}
          className="flex items-center justify-center gap-2 w-full h-12 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-2xl disabled:opacity-60 transition-colors"
        >
          {onboarding
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <>
                <ExternalLink className="h-4 w-4" />
                {status?.connected ? 'Completar configuración en Stripe' : 'Conectar cuenta bancaria'}
              </>
          }
        </button>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#06C167]" />
            <p className="text-sm font-bold text-emerald-800">Cuenta conectada y activa</p>
          </div>
          <p className="text-xs text-emerald-700">
            Los pagos procesados se transfieren automáticamente a tu cuenta bancaria. La liquidación semanal
            descuenta la comisión de Waitless (5%) y transfiere el neto cada lunes.
          </p>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-2xl border border-gray-200 p-5 space-y-2 text-sm text-gray-600">
        <p className="font-semibold text-gray-900">¿Cómo funciona?</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs">
          <li>Hacé clic en &ldquo;Conectar cuenta bancaria&rdquo; para ir a Stripe.</li>
          <li>Completá tu información bancaria y de negocio en el formulario de Stripe.</li>
          <li>Cuando Stripe verifica tu cuenta (puede tardar 1-2 días hábiles), el estado cambia a &ldquo;Activo&rdquo;.</li>
          <li>Cada lunes Waitless transfiere el 95% de los cobros de la semana anterior a tu cuenta.</li>
        </ol>
      </div>
    </div>
  )
}
