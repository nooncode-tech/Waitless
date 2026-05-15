'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

interface RevenueTrendRow {
  fecha: string
  total_ventas: number
  total_sesiones: number
  total_ordenes: number
  avg_ticket: number
}

interface FeedbackSummary {
  total: number
  avg_rating: number
  dist: Record<'1' | '2' | '3' | '4' | '5', number>
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function StarBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#F59E0B', borderRadius: 999, width: `${pct}%`, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#9CA3AF', width: 28, textAlign: 'right' }}>{count}</span>
    </div>
  )
}

const RANGE_OPTIONS = [
  { label: '7 días', days: 7 },
  { label: '14 días', days: 14 },
  { label: '30 días', days: 30 },
]

export function AnalyticsDashboard() {
  const [days, setDays] = useState(7)
  const [trend, setTrend] = useState<RevenueTrendRow[]>([])
  const [feedback, setFeedback] = useState<FeedbackSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [trendRes, feedbackRes] = await Promise.all([
        supabase.rpc('get_revenue_trend', { p_days: days }),
        supabase.rpc('get_feedback_summary', { p_days: 30 }),
      ])
      if (trendRes.error) throw trendRes.error
      if (feedbackRes.error) throw feedbackRes.error
      setTrend((trendRes.data as RevenueTrendRow[]) ?? [])
      setFeedback((feedbackRes.data as FeedbackSummary) ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando analítica')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  const totalVentas = trend.reduce((s, r) => s + Number(r.total_ventas), 0)
  const totalSesiones = trend.reduce((s, r) => s + Number(r.total_sesiones), 0)
  const totalOrdenes = trend.reduce((s, r) => s + Number(r.total_ordenes), 0)
  const avgTicket = totalSesiones > 0 ? totalVentas / totalSesiones : 0
  const maxVentas = Math.max(...trend.map(r => Number(r.total_ventas)), 1)

  const kpis = [
    { label: 'Ventas', value: formatPrice(totalVentas), symbol: '↑', color: '#BEEBBE', textColor: '#0a3a0a' },
    { label: 'Sesiones', value: totalSesiones.toString(), symbol: '◎', color: '#DBEAFE', textColor: '#1D4ED8' },
    { label: 'Órdenes', value: totalOrdenes.toString(), symbol: '◈', color: '#EDE9FE', textColor: '#7C3AED' },
    { label: 'Ticket medio', value: formatPrice(avgTicket), symbol: '$', color: '#FEF3C7', textColor: '#B45309' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>◫</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#111' }}>Analítica comercial</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', border: '1px solid #E5E5E5', borderRadius: 10, overflow: 'hidden' }}>
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: days === opt.days ? '#111' : '#fff',
                  color: days === opt.days ? '#fff' : '#6B7280',
                  fontFamily: FONT,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            aria-label="Actualizar analítica"
            style={{
              width: 32, height: 32, borderRadius: 10, border: '1px solid #E5E5E5',
              background: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, opacity: loading ? 0.5 : 1, fontFamily: FONT,
            }}
          >
            {loading ? <span style={{ fontSize: 24, color: '#CCC' }}>↻</span> : <span style={{ color: '#6B7280' }}>↺</span>}
          </button>
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: '#EF4444', background: '#FEF2F2', borderRadius: 10, padding: '8px 16px' }}>{error}</p>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{ border: '1px solid #E5E5E5', borderRadius: 14, padding: 12, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ padding: '4px 8px', borderRadius: 8, background: kpi.color, color: kpi.textColor, fontSize: 14, fontWeight: 700 }}>
                {kpi.symbol}
              </div>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{kpi.label}</span>
            </div>
            {loading ? (
              <div style={{ height: 20, width: 64, background: '#F3F4F6', borderRadius: 6 }} />
            ) : (
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#111' }}>{kpi.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Revenue trend chart */}
      <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, background: '#fff', padding: 16 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 900, color: '#111' }}>
          Tendencia de ventas — últimos {days} días
        </h3>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128 }}>
            <span style={{ fontSize: 24, color: '#CCC' }}>↻</span>
          </div>
        ) : trend.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, color: '#D1D5DB' }}>Ø</div>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#9CA3AF' }}>Sin datos para el período</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 112 }}>
              {trend.map(row => {
                const height = Math.max(4, Math.round((Number(row.total_ventas) / maxVentas) * 100))
                return (
                  <div key={row.fecha} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <div
                      title={`${shortDate(row.fecha)}: ${formatPrice(Number(row.total_ventas))}`}
                      style={{
                        width: '100%',
                        background: '#BEEBBE',
                        borderRadius: '4px 4px 0 0',
                        height: `${height}%`,
                        transition: 'background .2s',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0a3a0a' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#BEEBBE' }}
                    />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {trend.map(row => (
                <div key={row.fecha} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#9CA3AF' }}>
                  {shortDate(row.fecha)}
                </div>
              ))}
            </div>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#9CA3AF', borderBottom: '1px solid #F3F4F6' }}>
                    <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 500 }}>Fecha</th>
                    <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 500 }}>Ventas</th>
                    <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 500 }}>Sesiones</th>
                    <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 500 }}>Órdenes</th>
                    <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 500 }}>Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trend].reverse().map(row => (
                    <tr key={row.fecha} style={{ borderBottom: '1px solid #F9FAFB' }}>
                      <td style={{ padding: '4px 0', color: '#111' }}>{shortDate(row.fecha)}</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', color: '#111' }}>{formatPrice(Number(row.total_ventas))}</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', color: '#6B7280' }}>{row.total_sesiones}</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', color: '#6B7280' }}>{row.total_ordenes}</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', color: '#6B7280' }}>{formatPrice(Number(row.avg_ticket))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Feedback summary */}
      <div style={{ border: '1px solid #E5E5E5', borderRadius: 14, background: '#fff', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16, color: '#F59E0B' }}>★</span>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#111' }}>Feedback de clientes — últimos 30 días</h3>
        </div>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}>
            <span style={{ fontSize: 24, color: '#CCC' }}>↻</span>
          </div>
        ) : !feedback || feedback.total === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, color: '#D1D5DB' }}>Ø</div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>Sin feedback en este período</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 40, fontWeight: 900, color: '#111', lineHeight: 1 }}>
                {Number(feedback.avg_rating).toFixed(1)}
              </p>
              <div style={{ display: 'flex', gap: 2, marginTop: 6, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} style={{ fontSize: 13, color: n <= Math.round(feedback.avg_rating) ? '#F59E0B' : '#E5E7EB' }}>★</span>
                ))}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>{feedback.total} reseñas</p>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([5, 4, 3, 2, 1] as const).map(star => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#6B7280', width: 12, flexShrink: 0 }}>{star}</span>
                  <span style={{ fontSize: 11, color: '#F59E0B', flexShrink: 0 }}>★</span>
                  <StarBar count={feedback.dist[String(star) as keyof typeof feedback.dist]} total={feedback.total} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
