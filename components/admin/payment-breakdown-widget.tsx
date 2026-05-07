'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wallet, CreditCard, Banknote, Landmark, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type DateRange = 'hoy' | '7d' | '30d'

const RANGE_LABELS: Record<DateRange, string> = {
  hoy: 'Hoy',
  '7d': '7 días',
  '30d': '30 días',
}

const METHOD_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  efectivo:           { label: 'Efectivo',           icon: <Banknote className="h-4 w-4" />,   color: 'bg-emerald-100 text-emerald-700' },
  tarjeta:            { label: 'Tarjeta',             icon: <CreditCard className="h-4 w-4" />,  color: 'bg-blue-100 text-blue-700' },
  transferencia:      { label: 'Transferencia',       icon: <Landmark className="h-4 w-4" />,    color: 'bg-violet-100 text-violet-700' },
  paypal:             { label: 'PayPal',              icon: <span className="font-black text-[13px] leading-none">P</span>, color: 'bg-sky-100 text-sky-700' },
  waitless_creditos:  { label: 'Waitless Créditos',  icon: <Wallet className="h-4 w-4" />,      color: 'bg-zinc-900 text-white' },
  apple_pay:          { label: 'Apple Pay',           icon: <span className="text-xs font-bold"></span>, color: 'bg-gray-100 text-gray-700' },
  sin_especificar:    { label: 'Sin especificar',     icon: <CreditCard className="h-4 w-4" />,  color: 'bg-gray-100 text-gray-500' },
}

function fmt(n: number) {
  return n.toLocaleString('es', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

export function PaymentBreakdownWidget() {
  const [range, setRange] = useState<DateRange>('7d')
  const [data, setData] = useState<{ breakdown: Record<string, number>; total: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/admin/payment-breakdown?range=${range}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const json = await res.json()
      setData(json)
    }
    setLoading(false)
  }, [range])

  useEffect(() => { fetchData() }, [fetchData])

  const entries = data
    ? Object.entries(data.breakdown).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-zinc-500" />
          <h3 className="font-bold text-zinc-900 text-sm">Ingresos por método de pago</h3>
        </div>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-0.5">
          {(Object.keys(RANGE_LABELS) as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                range === r ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zinc-400 py-4 text-center">Sin pagos registrados en este período.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([method, amount]) => {
            const meta = METHOD_META[method] ?? METHOD_META['sin_especificar']
            const pct = data!.total > 0 ? (amount / data!.total) * 100 : 0
            return (
              <div key={method}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                      {meta.icon}
                    </span>
                    <span className="text-sm font-medium text-zinc-800">{meta.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-zinc-900">{fmt(amount)}</span>
                    <span className="text-[11px] text-zinc-400 ml-1.5">{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}

          <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total</span>
            <span className="text-base font-black text-zinc-900">{fmt(data!.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
