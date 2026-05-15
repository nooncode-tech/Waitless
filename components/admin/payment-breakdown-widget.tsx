'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

type DateRange = 'hoy' | '7d' | '30d'

const RANGE_LABELS: Record<DateRange, string> = {
  hoy: 'Hoy',
  '7d': '7 días',
  '30d': '30 días',
}

const METHOD_META: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  efectivo:          { label: 'Efectivo',           icon: '$',  bg: '#d1fae5', color: '#059669' },
  tarjeta:           { label: 'Tarjeta',             icon: '▤',  bg: '#dbeafe', color: '#1d4ed8' },
  transferencia:     { label: 'Transferencia',       icon: '↔',  bg: '#ede9fe', color: '#7c3aed' },
  paypal:            { label: 'PayPal',              icon: 'P',  bg: '#e0f2fe', color: '#0369a1' },
  waitless_creditos: { label: 'Waitless Créditos',  icon: '◉',  bg: '#111',   color: '#BEEBBE' },
  apple_pay:         { label: 'Apple Pay',           icon: '',  bg: '#f3f3f3', color: '#444' },
  sin_especificar:   { label: 'Sin especificar',     icon: '?',  bg: '#f3f3f3', color: '#888' },
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
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #E5E5E5',
      padding: 20, fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, color: '#888' }}>$</span>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0 }}>
            Ingresos por método de pago
          </h3>
        </div>
        {/* Range tabs */}
        <div style={{
          display: 'flex', gap: 2, background: '#f3f3f3',
          borderRadius: 8, padding: 3,
        }}>
          {(Object.keys(RANGE_LABELS) as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                background: range === r ? '#fff' : 'transparent',
                color: range === r ? '#111' : '#888',
                boxShadow: range === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
          <span style={{ fontSize: 22, color: '#ccc', display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : entries.length === 0 ? (
        <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '16px 0', margin: 0 }}>
          Sin pagos registrados en este período.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map(([method, amount]) => {
            const meta = METHOD_META[method] ?? METHOD_META['sin_especificar']
            const pct = data!.total > 0 ? (amount / data!.total) * 100 : 0
            return (
              <div key={method}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: meta.bg, color: meta.color,
                      fontSize: 13, fontWeight: 700,
                    }}>
                      {meta.icon}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{meta.label}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111', fontFamily: MONO }}>{fmt(amount)}</span>
                    <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, background: '#f3f3f3', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: '#BEEBBE', borderRadius: 99,
                    width: `${pct}%`, transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )
          })}

          {/* Total row */}
          <div style={{
            paddingTop: 12, borderTop: '1px solid #f0f0f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total
            </span>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#111', fontFamily: MONO }}>
              {fmt(data!.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
