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

  return (
    <div className="space-y-5 w-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-black tracking-tight">Dashboard</h2>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F2F2F2] text-[#6B6B6B] hover:bg-[#E5E5E5] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <div className="flex items-center gap-1 bg-[#F2F2F2] rounded-lg p-0.5">
            {(Object.keys(RANGE_LABELS) as DateRange[]).map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                  dateRange === r
                    ? 'bg-black text-white'
                    : 'text-[#6B6B6B] hover:text-black'
                )}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerta si hay llamadas pendientes */}
      {pendingCalls > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs font-semibold text-red-700">
            {pendingCalls} llamada{pendingCalls !== 1 ? 's' : ''} de mesero pendiente{pendingCalls !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="border border-[#E5E5E5] rounded-xl p-4 bg-white min-w-0">
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6B6B] leading-tight">
                {kpi.label}
              </span>
              <div className="p-1.5 rounded-lg bg-[#F2F2F2] text-black shrink-0">
                {kpi.icon}
              </div>
            </div>
            <p className="text-xl font-bold text-black leading-none truncate">{kpi.value}</p>
            {kpi.diff !== null && kpi.diff !== undefined ? (
              <p className={cn(
                'text-[10px] mt-1 font-semibold',
                kpi.diff > 0 ? 'text-[#16A34A]' : kpi.diff < 0 ? 'text-[#DC2626]' : 'text-[#BEBEBE]'
              )}>
                {kpi.diff > 0 ? '↑' : kpi.diff < 0 ? '↓' : '='} {Math.abs(kpi.diff)}% vs período anterior
              </p>
            ) : (
              <p className="text-[10px] text-[#BEBEBE] mt-1">{kpi.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Gráfico ventas por hora */}
      <div className="border border-[#E5E5E5] rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5E5]">
          <p className="text-xs font-bold text-black uppercase tracking-wide">Ventas por hora</p>
        </div>
        <div className="p-4">
          {totalRevenue > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: '#BEBEBE' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#BEBEBE' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v === 0 ? '' : `$${v}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatPrice(value), 'Ventas']}
                  contentStyle={{
                    border: '1px solid #E5E5E5',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#000',
                  }}
                  cursor={{ fill: '#F2F2F2' }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {hourlyData.map(entry => (
                    <Cell
                      key={entry.hour}
                      fill={entry.revenue === maxHourRevenue && entry.revenue > 0 ? '#000000' : '#E5E5E5'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-[#BEBEBE]">Sin ventas en el período seleccionado</p>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico tendencia diaria — solo para 7d / 30d */}
      {dateRange !== 'hoy' && (
        <div className="border border-[#E5E5E5] rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E5]">
            <p className="text-xs font-bold text-black uppercase tracking-wide">
              Tendencia de ventas — {RANGE_LABELS[dateRange]}
            </p>
          </div>
          <div className="p-4">
            {trendData.some(d => d.ventas > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#F2F2F2" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: '#BEBEBE' }}
                    axisLine={false}
                    tickLine={false}
                    interval={dateRange === '30d' ? 4 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#BEBEBE' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v === 0 ? '' : `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatPrice(value), 'Ventas']}
                    contentStyle={{ border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 12, color: '#000' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ventas"
                    stroke="#000000"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#000', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-xs text-[#BEBEBE]">Sin datos en el período seleccionado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Canal + Eficiencia */}
      <div className="grid md:grid-cols-2 gap-3">

        {/* Canal */}
        <div className="border border-[#E5E5E5] rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E5]">
            <p className="text-xs font-bold text-black uppercase tracking-wide">Pedidos por canal</p>
          </div>
          <div className="p-4 space-y-3">
            {byChannel.map(ch => (
              <div key={ch.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#6B6B6B]">{ch.label}</span>
                  <span className="font-semibold text-black">{ch.count} ({ch.pct}%)</span>
                </div>
                <div className="h-1.5 bg-[#F2F2F2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all"
                    style={{ width: `${ch.pct}%` }}
                  />
                </div>
              </div>
            ))}
            {todayOrders.length === 0 && (
              <p className="text-xs text-[#BEBEBE] text-center py-2">Sin pedidos en el período seleccionado</p>
            )}
          </div>
        </div>

        {/* SLA & Cancelaciones */}
        <div className="border border-[#E5E5E5] rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E5]">
            <p className="text-xs font-bold text-black uppercase tracking-wide">Eficiencia operativa</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#6B6B6B]">Cumplimiento SLA (≤ 15 min)</span>
                <span className={cn(
                  'font-bold',
                  slaCompliance >= 90 ? 'text-[#16A34A]'
                    : slaCompliance >= 70 ? 'text-[#D97706]'
                    : 'text-[#DC2626]'
                )}>
                  {slaCompliance}%
                </span>
              </div>
              <div className="h-2 bg-[#F2F2F2] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    slaCompliance >= 90 ? 'bg-[#16A34A]'
                      : slaCompliance >= 70 ? 'bg-[#D97706]'
                      : 'bg-[#DC2626]'
                  )}
                  style={{ width: `${slaCompliance}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="text-center">
                <p className="text-lg font-bold text-black">{completedOrders.length}</p>
                <p className="text-[10px] text-[#6B6B6B]">Completados</p>
              </div>
              <div className="text-center border-x border-[#E5E5E5]">
                <p className="text-lg font-bold text-[#D97706]">
                  {todayOrders.filter(o => !['entregado', 'cancelado'].includes(o.status)).length}
                </p>
                <p className="text-[10px] text-[#6B6B6B]">En proceso</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#DC2626]">{cancelledOrders.length}</p>
                <p className="text-[10px] text-[#6B6B6B]">Cancelados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top items */}
      <div className="border border-[#E5E5E5] rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5E5] flex items-center gap-2">
          <ChefHat className="h-3.5 w-3.5 text-[#6B6B6B]" />
          <p className="text-xs font-bold text-black uppercase tracking-wide">Más vendidos ({RANGE_LABELS[dateRange]})</p>
        </div>
        <div className="p-4">
          {topItems.length > 0 ? (
            <div className="space-y-2.5">
              {topItems.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                      i === 0 ? 'bg-black text-white' : 'bg-[#F2F2F2] text-[#6B6B6B]'
                    )}>
                      {i === 0
                        ? <Star className="h-2.5 w-2.5" />
                        : <span className="text-[10px] font-bold">{i + 1}</span>
                      }
                    </span>
                    <span className="text-sm text-black truncate">{item.name}</span>
                    <span className="text-[10px] bg-[#F2F2F2] text-[#6B6B6B] px-1.5 py-0.5 rounded-full shrink-0">
                      ×{item.qty}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-black shrink-0">
                    {formatPrice(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#BEBEBE] text-center py-4">Sin ventas en el período seleccionado</p>
          )}
        </div>
      </div>

      {/* Feedback summary */}
      {feedbackSummary && feedbackSummary.total > 0 && (
        <div className="border border-[#E5E5E5] rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E5] flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-[#6B6B6B]" />
            <p className="text-xs font-bold text-black uppercase tracking-wide">
              Satisfacción de clientes ({RANGE_LABELS[dateRange]})
            </p>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-6">
              {/* Average rating */}
              <div className="text-center shrink-0">
                <p className="text-3xl font-bold text-black leading-none">
                  {feedbackSummary.avg_rating?.toFixed(1) ?? '—'}
                </p>
                <div className="flex gap-0.5 justify-center mt-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={cn(
                        'h-3 w-3',
                        s <= Math.round(feedbackSummary.avg_rating ?? 0)
                          ? 'text-[#D97706] fill-[#D97706]'
                          : 'text-[#E5E5E5] fill-[#E5E5E5]'
                      )}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-[#6B6B6B] mt-1">
                  {feedbackSummary.total} reseña{feedbackSummary.total !== 1 ? 's' : ''}
                </p>
              </div>
              {/* Distribution */}
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = feedbackSummary.dist?.[String(star)] ?? 0
                  const pct = feedbackSummary.total > 0
                    ? Math.round((count / feedbackSummary.total) * 100)
                    : 0
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#6B6B6B] w-3 shrink-0">{star}</span>
                      <Star className="h-2.5 w-2.5 text-[#D97706] fill-[#D97706] shrink-0" />
                      <div className="flex-1 h-1.5 bg-[#F2F2F2] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D97706] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#6B6B6B] w-6 text-right shrink-0">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
