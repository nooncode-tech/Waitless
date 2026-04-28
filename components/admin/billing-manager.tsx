'use client'

import { useState } from 'react'
import { Check, Zap, Building2, Rocket, ExternalLink, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan,
          successUrl: `${origin}/`,
          cancelUrl: `${origin}/`,
        }),
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Plan & Facturación</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Plan actual: <span className="font-semibold text-foreground capitalize">{tenantPlan}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = tenantPlan === plan.key
          const isUpgrade = plan.key !== 'starter' && !isCurrent

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border-2 p-5 flex flex-col gap-4 ${
                plan.highlight
                  ? 'border-foreground'
                  : isCurrent
                  ? 'border-success'
                  : 'border-border'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-foreground text-background px-3 py-0.5 rounded-full">
                  Más popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-success text-background px-3 py-0.5 rounded-full">
                  Plan activo
                </span>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isCurrent ? 'bg-success/10 text-success' : 'bg-secondary text-foreground'}`}>
                    {plan.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{plan.label}</p>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
              </div>

              <p className="text-2xl font-bold text-foreground">{plan.price}</p>

              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                plan.key !== 'starter' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={handlePortal}
                    disabled={loading === 'portal'}
                  >
                    {loading === 'portal' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    Gestionar suscripción
                  </Button>
                ) : (
                  <div className="py-2 text-center text-xs text-success font-semibold">Plan activo</div>
                )
              ) : isUpgrade ? (
                <Button
                  size="sm"
                  className={`w-full ${plan.highlight ? 'bg-foreground hover:bg-foreground/90 text-background' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.key as 'pro' | 'enterprise')}
                  disabled={!!loading}
                >
                  {loading === plan.key ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                  {plan.cta}
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Los pagos son procesados de forma segura por Stripe. Podés cancelar en cualquier momento desde el portal de facturación.
      </p>
    </div>
  )
}
