'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import {
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  ChefHat,
  AlertTriangle,
  Star,
  Download,
  Smartphone,
  RotateCcw,
  XCircle,
  MessageSquare,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import { formatPrice, calculateOrderTotal } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { PaymentBreakdownWidget } from './payment-breakdown-widget'

interface TrendRow {
  fecha: string
  total_ventas: number
  total_sesiones: number
  total_ordenes: number
  avg_ticket: number
}

interface FeedbackSummary {
  total: number
  avg_rating: number
  dist: Record<string, number>
}

type DateRange = 'hoy' | '7d' | '30d'

const RANGE_LABELS: Record<DateRange, string> = {
  hoy: 'Hoy',
  '7d': '7 días',
  '30d': '30 días',
}

export function ReportsManager() {
  const { orders, tableSessions, waiterCalls, tables } = useApp()
  const [dateRange, setDateRange] = useState<DateRange>('hoy')
  const [closedSessionsDB, setClosedSessionsDB] = useState<{ total: number }[]>([])
  const [revenueTrend, setRevenueTrend] = useState<TrendRow[]>([])
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null)

  const rangeStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    if (dateRange === '7d') d.setDate(d.getDate() - 6)
    else if (dateRange === '30d') d.setDate(d.getDate() - 29)
    return d
  }, [dateRange])

  // Fetch closed sessions from Supabase for accurate KPIs
  useEffect(() => {
    supabase
      .from('table_sessions')
      .select('total')
      .eq('activa', false)
      .eq('bill_status', 'cerrada')
      .gte('created_at', rangeStart.toISOString())
      .then(({ data }) => {
        setClosedSessionsDB((data ?? []) as { total: number }[])
      })
  }, [rangeStart])

  // Fetch revenue trend (7d or 30d) from DB RPC
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setting state from async Supabase fetch inside effect, intentional data-loading pattern
    if (dateRange === 'hoy') { setRevenueTrend([]); return }
    const days = dateRange === '7d' ? 7 : 30
    supabase.rpc('get_revenue_trend', { p_days: days }).then(({ data }) => {
      if (data) {
        setRevenueTrend(
          (data as TrendRow[]).map(row => ({
            ...row,
            // Format date as "dd/MM" for display
            fechaLabel: new Date(row.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
          })) as TrendRow[]
        )
      }
    })
  }, [dateRange])

  // Fetch feedback summary
  useEffect(() => {
    const days = dateRange === 'hoy' ? 1 : dateRange === '7d' ? 7 : 30
    supabase.rpc('get_feedback_summary', { p_days: days }).then(({ data }) => {
      if (data) setFeedbackSummary(data as FeedbackSummary)
    })
  }, [dateRange])

  // Snapshot today's KPIs (persist to kpi_daily) — fire-and-forget
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    void Promise.resolve(supabase.rpc('get_daily_kpis', { p_fecha: today }))
  }, [])

  const prevRangeStart = useMemo(() => {
    const d = new Date(rangeStart)
    if (dateRange === 'hoy') d.setDate(d.getDate() - 1)
    else if (dateRange === '7d') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 30)
    return d
  }, [rangeStart, dateRange])

  const todayOrders = useMemo(
    () => orders.filter(o => new Date(o.createdAt) >= rangeStart),
    [orders, rangeStart]
  )
  const prevOrders = useMemo(
    () => orders.filter(o => {
      const t = new Date(o.createdAt)
      return t >= prevRangeStart && t < rangeStart
    }),
    [orders, prevRangeStart, rangeStart]
  )
  const completedOrders = useMemo(
    () => todayOrders.filter(o => o.status === 'entregado'),
    [todayOrders]
  )
  const prevCompleted = useMemo(
    () => prevOrders.filter(o => o.status === 'entregado'),
    [prevOrders]
  )
  const cancelledOrders = useMemo(
    () => todayOrders.filter(o => o.status === 'cancelado'),
    [todayOrders]
  )

  // ── Sessions in range — from DB for accuracy ─────────
  // closedSessionsDB is fetched from Supabase; fallback to in-memory for offline
  const closedSessionsLocal = useMemo(
    () => tableSessions.filter(s => {
      const t = new Date(s.createdAt)
      return t >= rangeStart && !s.activa && s.billStatus === 'cerrada'
    }),
    [tableSessions, rangeStart]
  )
  const closedSessions = closedSessionsDB.length > 0 ? closedSessionsDB : closedSessionsLocal

  // ── PDF KPI formulas ──────────────────────────────────
  // adoption_rate = qr_orders / total_orders * 100
  const adoptionRate = useMemo(() => {
    if (!todayOrders.length) return 0
    const qrOrders = todayOrders.filter(o => o.isQrOrder).length
    return Math.round((qrOrders / todayOrders.length) * 100)
  }, [todayOrders])

  // avg_order_time = AVG(confirmed_at - createdAt) in minutes
  const avgOrderTime = useMemo(() => {
    const withTimes = todayOrders.filter(o => o.confirmedAt && o.createdAt)
    if (!withTimes.length) return 0
    const total = withTimes.reduce((sum, o) => {
      const ms = new Date(o.confirmedAt!).getTime() - new Date(o.createdAt).getTime()
      return sum + ms / 60000
    }, 0)
    return total / withTimes.length
  }, [todayOrders])

  // error_rate = cancelados / total * 100
  const errorRate = useMemo(() => {
    if (!todayOrders.length) return 0
    return Math.round((cancelledOrders.length / todayOrders.length) * 100)
  }, [cancelledOrders, todayOrders])

  // ── KPIs ──────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => completedOrders.reduce((sum, o) => sum + calculateOrderTotal(o.items), 0),
    [completedOrders]
  )
  const prevRevenue = useMemo(
    () => prevCompleted.reduce((sum, o) => sum + calculateOrderTotal(o.items), 0),
    [prevCompleted]
  )
  const revenueDiff = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null

  // avg_ticket = total_ventas / total_sesiones_cerradas (PDF formula)
  const closedCount = closedSessions.length
  const avgTicket = closedCount > 0 ? totalRevenue / closedCount : 0

  // avg_rotation = closed_sessions / active_tables
  const activeTableCount = useMemo(() => tables.filter(t => t.activa).length || 1, [tables])
  const avgRotation = closedCount / activeTableCount

  const avgPrepTime = useMemo(() => {
    const withTimes = completedOrders.filter(
      o => o.tiempoInicioPreparacion && o.tiempoFinPreparacion
    )
    if (!withTimes.length) return 0
    const total = withTimes.reduce((sum, o) => {
      const ms =
        new Date(o.tiempoFinPreparacion!).getTime() -
        new Date(o.tiempoInicioPreparacion!).getTime()
      return sum + ms / 60000
    }, 0)
    return total / withTimes.length
  }, [completedOrders])

  // SLA compliance (< 15 min)
  const slaCompliance = useMemo(() => {
    const withTimes = completedOrders.filter(
      o => o.tiempoInicioPreparacion && o.tiempoFinPreparacion
    )
    if (!withTimes.length) return 100
    const ok = withTimes.filter(o => {
      const ms =
        new Date(o.tiempoFinPreparacion!).getTime() -
        new Date(o.tiempoInicioPreparacion!).getTime()
      return ms / 60000 <= 15
    }).length
    return Math.round((ok / withTimes.length) * 100)
  }, [completedOrders])

  const activeTables = tableSessions.filter(s => s.activa).length
  const totalTableCount = tableSessions.length > 0
    ? Math.max(...tableSessions.map(s => s.mesa))
    : 1
  const occupancy = totalTableCount > 0
    ? Math.round((activeTables / Math.max(totalTableCount, 1)) * 100)
    : 0

  // ── Ventas por hora ───────────────────────────────────
  const hourlyData = useMemo(() => {
    const buckets: Record<number, number> = {}
    for (let h = 8; h <= 23; h++) buckets[h] = 0
    completedOrders.forEach(o => {
      const h = new Date(o.createdAt).getHours()
      if (h >= 8 && h <= 23) {
        buckets[h] = (buckets[h] || 0) + calculateOrderTotal(o.items)
      }
    })
    return Object.entries(buckets).map(([hour, revenue]) => ({
      hour: `${hour}h`,
      revenue,
    }))
  }, [completedOrders])

  const maxHourRevenue = Math.max(...hourlyData.map(d => d.revenue), 1)

  // Daily trend — from DB for 7d/30d, client-side fallback for 'hoy'
  const trendData = useMemo(() => {
    if (revenueTrend.length > 0) {
      return revenueTrend.map(r => ({
        label: (r as TrendRow & { fechaLabel?: string }).fechaLabel ?? r.fecha,
        ventas: Number(r.total_ventas),
        sesiones: Number(r.total_sesiones),
      }))
    }
    // Client-side daily grouping (fallback)
    if (dateRange === 'hoy') return []
    const days = dateRange === '7d' ? 7 : 30
    const buckets: Record<string, { ventas: number; sesiones: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
      buckets[key] = { ventas: 0, sesiones: 0 }
    }
    completedOrders.forEach(o => {
      const key = new Date(o.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
      if (buckets[key]) buckets[key].ventas += calculateOrderTotal(o.items)
    })
    tableSessions.forEach(s => {
      if (!s.activa && s.billStatus === 'cerrada') {
        const key = new Date(s.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
        if (buckets[key]) buckets[key].sesiones += 1
      }
    })
    return Object.entries(buckets).map(([label, v]) => ({ label, ...v }))
  }, [revenueTrend, dateRange, completedOrders, tableSessions])

  // ── Ventas por canal ──────────────────────────────────
  const byChannel = useMemo(() => {
    const map: Record<string, number> = { mesa: 0, mesero: 0, para_llevar: 0, delivery: 0 }
    todayOrders.forEach(o => { map[o.canal] = (map[o.canal] || 0) + 1 })
    const total = todayOrders.length || 1
    return [
      { label: 'Mesa', count: map.mesa + map.mesero, pct: Math.round(((map.mesa + map.mesero) / total) * 100) },
      { label: 'Para llevar', count: map.para_llevar, pct: Math.round((map.para_llevar / total) * 100) },
      { label: 'Delivery', count: map.delivery, pct: Math.round((map.delivery / total) * 100) },
    ]
  }, [todayOrders])

  // ── Top items ─────────────────────────────────────────
  const topItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {}
    completedOrders.forEach(o => {
      o.items.forEach(item => {
        if (!map[item.menuItem.id]) {
          map[item.menuItem.id] = { name: item.menuItem.nombre, qty: 0, revenue: 0 }
        }
        map[item.menuItem.id].qty += item.cantidad
        const extras = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
        map[item.menuItem.id].revenue += (item.menuItem.precio + extras) * item.cantidad
      })
    })
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [completedOrders])

  // ── Alertas del día ───────────────────────────────────
  const pendingCalls = waiterCalls.filter(c => !c.atendido).length

  const kpis = [
    {
      label: dateRange === 'hoy' ? 'Ventas Hoy' : `Ventas (${RANGE_LABELS[dateRange]})`,
      value: formatPrice(totalRevenue),
      icon: <DollarSign className="h-4 w-4" />,
      sub: `${completedOrders.length} pedidos completados`,
      diff: revenueDiff,
    },
    {
      label: 'Ticket Promedio',
      value: formatPrice(avgTicket),
      icon: <TrendingUp className="h-4 w-4" />,
      sub: `${closedCount} sesiones cerradas`,
      diff: null,
    },
    {
      label: 'Tiempo orden→cocina',
      value: avgOrderTime > 0 ? `${avgOrderTime.toFixed(1)} min` : '— min',
      icon: <Clock className="h-4 w-4" />,
      sub: `SLA ${slaCompliance}% ≤15 min`,
      diff: null,
    },
    {
      label: 'Ocupación',
      value: `${activeTables} mesas`,
      icon: <Users className="h-4 w-4" />,
      sub: `${occupancy}% de capacidad`,
      diff: null,
    },
    {
      label: 'Adopción QR',
      value: `${adoptionRate}%`,
      icon: <Smartphone className="h-4 w-4" />,
      sub: `${todayOrders.filter(o => o.isQrOrder).length} pedidos QR`,
      diff: null,
    },
    {
      label: 'Rotación por mesa',
      value: avgRotation.toFixed(1),
      icon: <RotateCcw className="h-4 w-4" />,
      sub: `${closedCount} sesiones / ${activeTableCount} mesas`,
      diff: null,
    },
    {
      label: 'Tasa de error',
      value: `${errorRate}%`,
      icon: <XCircle className="h-4 w-4" />,
      sub: `${cancelledOrders.length} cancelados`,
      diff: null,
    },
  ]

  const handleExportCSV = () => {
    const rows = [
      ['Fecha', 'Mesa', 'Pedido #', 'Item', 'Cantidad', 'Precio Unit', 'Total', 'Estado', 'Canal'],
      ...completedOrders.flatMap(o =>
        o.items.map(item => {
          const extras = item.extras?.reduce((e: number, ex: { precio: number }) => e + ex.precio, 0) || 0
          const unitPrice = item.menuItem.precio + extras
          return [
            new Date(o.createdAt).toLocaleDateString('es-MX'),
            o.mesa,
            o.numero,
            item.menuItem.nombre,
            item.cantidad,
            unitPrice.toFixed(2),
            (unitPrice * item.cantidad).toFixed(2),
            o.status,
            o.canal,
          ]
        })
      ),
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waitless_ventas_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
  const CardHead = ({ children }: { children: React.ReactNode }) => (
    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
      {children}
    </div>
  )

  return (
    <div className="space-y-4 w-full" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-gray-400 capitalize">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />CSV
          </button>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(Object.keys(RANGE_LABELS) as DateRange[]).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className={cn('px-3 py-1 text-xs font-bold rounded-lg transition-all',
                  dateRange === r ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                )}>
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerta llamadas pendientes */}
      {pendingCalls > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-red-700">
            {pendingCalls} llamada{pendingCalls !== 1 ? 's' : ''} de mesero sin atender
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpis.map((kpi, i) => {
          const accent = i === 0 ? '#06C167' : i === 6 ? '#EF4444' : '#111'
          return (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-tight line-clamp-2">
                  {kpi.label}
                </span>
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: accent + '15', color: accent }}>
                  {kpi.icon}
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 leading-none truncate" style={{ letterSpacing: '-0.03em' }}>
                {kpi.value}
              </p>
              {kpi.diff !== null && kpi.diff !== undefined ? (
                <p className={cn('text-[11px] mt-1.5 font-semibold flex items-center gap-0.5',
                  kpi.diff > 0 ? 'text-[#06C167]' : kpi.diff < 0 ? 'text-red-500' : 'text-gray-400'
                )}>
                  {kpi.diff > 0 ? '↑' : kpi.diff < 0 ? '↓' : '='} {Math.abs(kpi.diff)}%
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">{kpi.sub}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Gráfico ventas por hora */}
      <Card>
        <CardHead>
          <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Ventas por hora</p>
        </CardHead>
        <div className="p-5">
          {totalRevenue > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `$${v}`} />
                <Tooltip
                  formatter={(value: number) => [formatPrice(value), 'Ventas']}
                  contentStyle={{ border: '1px solid #F3F4F6', borderRadius: 12, fontSize: 12, color: '#111', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  cursor={{ fill: '#F9FAFB' }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {hourlyData.map(entry => (
                    <Cell key={entry.hour} fill={entry.revenue === maxHourRevenue && entry.revenue > 0 ? '#06C167' : '#E5E7EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-gray-400">Sin ventas en el período seleccionado</p>
            </div>
          )}
        </div>
      </Card>

      {/* Gráfico tendencia diaria */}
      {dateRange !== 'hoy' && (
        <Card>
          <CardHead>
            <p className="text-xs font-black text-gray-900 uppercase tracking-widest">
              Tendencia — {RANGE_LABELS[dateRange]}
            </p>
          </CardHead>
          <div className="p-5">
            {trendData.some(d => d.ventas > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={dateRange === '30d' ? 4 : 0} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatPrice(value), 'Ventas']}
                    contentStyle={{ border: '1px solid #F3F4F6', borderRadius: 12, fontSize: 12, color: '#111', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  />
                  <Line type="monotone" dataKey="ventas" stroke="#06C167" strokeWidth={2.5} dot={{ r: 3, fill: '#06C167', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-sm text-gray-400">Sin datos en el período</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Canal + Eficiencia */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHead>
            <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Por canal</p>
          </CardHead>
          <div className="p-5 space-y-4">
            {byChannel.map(ch => (
              <div key={ch.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-gray-700">{ch.label}</span>
                  <span className="text-sm font-black text-gray-900">{ch.count} <span className="text-xs font-normal text-gray-400">({ch.pct}%)</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full transition-all" style={{ width: `${ch.pct}%` }} />
                </div>
              </div>
            ))}
            {todayOrders.length === 0 && <p className="text-sm text-gray-400 text-center py-2">Sin pedidos</p>}
          </div>
        </Card>

        <Card>
          <CardHead>
            <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Eficiencia</p>
            <span className={cn('text-sm font-black', slaCompliance >= 90 ? 'text-[#06C167]' : slaCompliance >= 70 ? 'text-amber-500' : 'text-red-500')}>
              SLA {slaCompliance}%
            </span>
          </CardHead>
          <div className="p-5 space-y-4">
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${slaCompliance}%`, backgroundColor: slaCompliance >= 90 ? '#06C167' : slaCompliance >= 70 ? '#F59E0B' : '#EF4444' }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { label: 'Completados', value: completedOrders.length, color: '#06C167' },
                { label: 'En proceso', value: todayOrders.filter(o => !['entregado', 'cancelado'].includes(o.status)).length, color: '#F59E0B' },
                { label: 'Cancelados', value: cancelledOrders.length, color: '#EF4444' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-black" style={{ color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Desglose por método de pago */}
      <PaymentBreakdownWidget />

      {/* Top items */}
      <Card>
        <CardHead>
          <div className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-gray-400" />
            <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Más vendidos</p>
          </div>
          <span className="text-[11px] text-gray-400">{RANGE_LABELS[dateRange]}</span>
        </CardHead>
        <div className="p-5">
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0',
                    i === 0 ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                  )}>
                    {i === 0 ? <Star className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{item.name}</span>
                  <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0 font-semibold">×{item.qty}</span>
                  <span className="text-sm font-black text-gray-900 shrink-0" style={{ letterSpacing: '-0.02em' }}>
                    {formatPrice(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Sin ventas en el período</p>
          )}
        </div>
      </Card>

      {/* Feedback summary */}
      {feedbackSummary && feedbackSummary.total > 0 && (
        <Card>
          <CardHead>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Satisfacción</p>
            </div>
            <span className="text-[11px] text-gray-400">{feedbackSummary.total} reseña{feedbackSummary.total !== 1 ? 's' : ''}</span>
          </CardHead>
          <div className="p-5">
            <div className="flex items-start gap-6">
              <div className="text-center shrink-0">
                <p className="text-4xl font-black text-gray-900 leading-none" style={{ letterSpacing: '-0.04em' }}>
                  {feedbackSummary.avg_rating?.toFixed(1) ?? '—'}
                </p>
                <div className="flex gap-0.5 justify-center mt-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn('h-3.5 w-3.5', s <= Math.round(feedbackSummary.avg_rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200')} />
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = feedbackSummary.dist?.[String(star)] ?? 0
                  const pct = feedbackSummary.total > 0 ? Math.round((count / feedbackSummary.total) * 100) : 0
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 w-3 shrink-0 font-semibold">{star}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-400 w-5 text-right shrink-0 font-semibold">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
