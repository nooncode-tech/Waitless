'use client'

import { useState } from 'react'
import { Check, Zap, Building2, Rocket, ExternalLink, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'

type Plan = 'starter' | 'pro' | 'enterprise'

const PLANS: {
  key: Plan
  label: string
  price: string
  icon: React.ReactNode
  description: string
  features: string[]
  cta: string
  highlight?: boolean
}[] = [
  {
    key: 'starter',
    label: 'Starter',
    price: 'Gratis',
    icon: <Rocket className="h-5 w-5" />,
    description: 'Para empezar sin compromisos.',
    features: ['Pedidos por mesa', 'KDS (cocina)', 'Menú QR', 'Hasta 5 mesas'],
    cta: 'Plan actual',
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$29 / mes',
    icon: <Zap className="h-5 w-5" />,
    description: 'Para restaurantes en crecimiento.',
    features: ['Todo de Starter', 'Analítica de ventas', 'Lista de espera', 'Notificaciones push', 'Reembolsos', 'Mesas ilimitadas'],
    cta: 'Suscribirse a Pro',
    highlight: true,
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: '$99 / mes',
    icon: <Building2 className="h-5 w-5" />,
    description: 'Para cadenas y grupos.',
    features: ['Todo de Pro', 'Multi-sucursal', 'White label', 'Soporte prioritario', 'SLA garantizado'],
    cta: 'Suscribirse a Enterprise',
  },
]

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function BillingManager() {
  const { tenantPlan } = useApp()
  const [loading, setLoading] = useState<Plan | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    setLoading(plan)
    setError(null)
    try {
      const token = await getToken()
      if (!token) { setError('Sin sesión activa'); return }
      const origin = window.location.origin
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan, successUrl: `${origin}/`, cancelUrl: `${origin}/` }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear sesión de pago'); return }
      window.location.href = data.url
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  const handlePortal = async () => {
    setLoading('portal')
    setError(null)
    try {
      const token = await getToken()
      if (!token) { setError('Sin sesión activa'); return }
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ returnUrl: window.location.origin }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al abrir portal'); return }
      window.open(data.url, '_blank')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div>
        <h2 className="text-xs font-black text-gray-900 uppercase tracking-wide">Plan & Facturación</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Plan actual: <span className="font-semibold text-gray-900 capitalize">{tenantPlan}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-500">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = tenantPlan === plan.key
          const isUpgrade = plan.key !== 'starter' && !isCurrent

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border-2 p-5 flex flex-col gap-4 ${
                plan.highlight ? 'border-gray-900'
                : isCurrent ? 'border-[#06C167]'
                : 'border-gray-200'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-gray-900 text-white px-3 py-0.5 rounded-full">
                  Más popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#06C167] text-white px-3 py-0.5 rounded-full">
                  Plan activo
                </span>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isCurrent ? 'bg-emerald-100 text-[#06C167]' : 'bg-gray-100 text-gray-700'}`}>
                    {plan.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{plan.label}</p>
                    <p className="text-xs text-gray-500">{plan.description}</p>
                  </div>
                </div>
              </div>

              <p className="text-2xl font-bold text-gray-900">{plan.price}</p>

              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-500">
                    <Check className="h-3.5 w-3.5 text-[#06C167] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                plan.key !== 'starter' ? (
                  <button
                    onClick={handlePortal}
                    disabled={loading === 'portal'}
                    className="w-full h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading === 'portal' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    Gestionar suscripción
                  </button>
                ) : (
                  <div className="py-2 text-center text-xs text-[#06C167] font-semibold">Plan activo</div>
                )
              ) : isUpgrade ? (
                <button
                  onClick={() => handleUpgrade(plan.key as 'pro' | 'enterprise')}
                  disabled={!!loading}
                  className={`w-full h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 ${plan.highlight ? 'bg-gray-900 hover:bg-black text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {loading === plan.key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {plan.cta}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        Los pagos son procesados de forma segura por Stripe. Podés cancelar en cualquier momento desde el portal de facturación.
      </p>
    </div>
  )
}
