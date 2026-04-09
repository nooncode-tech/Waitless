'use client'

/**
 * AnalyticsDashboard — Sprint 4 Task 4.7
 * Visualiza tendencia de ingresos y resumen de feedback usando las RPCs:
 *   - get_revenue_trend(p_days)      → tabla diaria
 *   - get_feedback_summary(p_days)   → jsonb con rating distribution
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  Star,
  ShoppingBag,
  Users,
  Loader2,
  RefreshCw,
  BarChart2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function StarBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

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

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalVentas = trend.reduce((s, r) => s + Number(r.total_ventas), 0)
  const totalSesiones = trend.reduce((s, r) => s + Number(r.total_sesiones), 0)
  const totalOrdenes = trend.reduce((s, r) => s + Number(r.total_ordenes), 0)
  const avgTicket = totalSesiones > 0 ? totalVentas / totalSesiones : 0
  const maxVentas = Math.max(...trend.map(r => Number(r.total_ventas)), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Analítica comercial</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border overflow-hidden text-xs">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  days === opt.days
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={load}
            disabled={loading}
            aria-label="Actualizar analítica"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Ventas', value: formatPrice(totalVentas), icon: <TrendingUp className="h-4 w-4 text-success" /> },
          { label: 'Sesiones', value: totalSesiones.toString(), icon: <Users className="h-4 w-4 text-primary" /> },
          { label: 'Órdenes', value: totalOrdenes.toString(), icon: <ShoppingBag className="h-4 w-4 text-primary" /> },
          { label: 'Ticket medio', value: formatPrice(avgTicket), icon: <BarChart2 className="h-4 w-4 text-primary" /> },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                {kpi.icon}
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              {loading ? (
                <div className="h-5 w-16 bg-secondary rounded animate-pulse" />
              ) : (
                <p className="text-base font-bold text-foreground">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue trend chart (bar chart via CSS) */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Tendencia de ventas — últimos {days} días
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : trend.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos para el período</p>
          ) : (
            <div className="space-y-3">
              {/* Bar chart */}
              <div className="flex items-end gap-1 h-28">
                {trend.map(row => {
                  const height = Math.max(
                    4,
                    Math.round((Number(row.total_ventas) / maxVentas) * 100)
                  )
                  return (
                    <div key={row.fecha} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all"
                        style={{ height: `${height}%` }}
                        title={`${shortDate(row.fecha)}: ${formatPrice(Number(row.total_ventas))}`}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                        <div className="bg-foreground text-background text-xs rounded px-2 py-1 whitespace-nowrap">
                          {formatPrice(Number(row.total_ventas))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex gap-1">
                {trend.map(row => (
                  <div key={row.fecha} className="flex-1 text-center text-xs text-muted-foreground">
                    {shortDate(row.fecha)}
                  </div>
                ))}
              </div>
              {/* Detailed table */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-1 font-medium">Fecha</th>
                      <th className="text-right py-1 font-medium">Ventas</th>
                      <th className="text-right py-1 font-medium">Sesiones</th>
                      <th className="text-right py-1 font-medium">Órdenes</th>
                      <th className="text-right py-1 font-medium">Ticket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trend].reverse().map(row => (
                      <tr key={row.fecha} className="border-b border-border/50 last:border-0">
                        <td className="py-1 text-foreground">{shortDate(row.fecha)}</td>
                        <td className="py-1 text-right text-foreground">{formatPrice(Number(row.total_ventas))}</td>
                        <td className="py-1 text-right text-muted-foreground">{row.total_sesiones}</td>
                        <td className="py-1 text-right text-muted-foreground">{row.total_ordenes}</td>
                        <td className="py-1 text-right text-muted-foreground">{formatPrice(Number(row.avg_ticket))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Feedback de clientes — últimos 30 días</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !feedback || feedback.total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin feedback en este período</p>
          ) : (
            <div className="flex gap-6">
              {/* Average score */}
              <div className="text-center shrink-0">
                <p className="text-4xl font-bold text-foreground">{Number(feedback.avg_rating).toFixed(1)}</p>
                <div className="flex gap-0.5 mt-1 justify-center">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star
                      key={n}
                      className={`h-3.5 w-3.5 ${n <= Math.round(feedback.avg_rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{feedback.total} reseñas</p>
              </div>
              {/* Distribution bars */}
              <div className="flex-1 space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map(star => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{star}</span>
                    <Star className="h-3 w-3 text-amber-400 shrink-0" />
                    <StarBar count={feedback.dist[String(star) as keyof typeof feedback.dist]} total={feedback.total} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
