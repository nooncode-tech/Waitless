'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  ShoppingBag,
  Clock,
  TrendingUp,
  Download,
  Printer,
  CreditCard,
  Banknote,
  XCircle,
  Play,
  Square,
  ChefHat,
  RotateCcw,
  Smartphone,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  formatPrice,
  calculateOrderTotal,
  getChannelLabel,
  type Order
} from '@/lib/store'
import { cn } from '@/lib/utils'

export function DailyClosing() {
  const { orders, refunds, getPaymentsForDate, tables, config } = useApp()

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  // Shift state
  const [shiftOpen, setShiftOpen] = useState(false)
  const [shiftStart, setShiftStart] = useState<Date | null>(null)
  const [shiftEnd, setShiftEnd] = useState<Date | null>(null)
  const [shiftNote, setShiftNote] = useState('')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [fondoCajaApertura, setFondoCajaApertura] = useState<string>('')
  const [efectivoContado, setEfectivoContado] = useState<string>('')
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null)

  // Paid sessions fetched from Supabase for the selected date
  type PaidSession = { id: string; paymentMethod: string | null; total: number; impuestos: number; propina: number; descuento: number; createdAt: string }
  const [paidSessionsFromDB, setPaidSessionsFromDB] = useState<PaidSession[]>([])

  // Task 2.9: KPIs calculados desde Supabase (pipeline real)
  type TopItem = { menu_item_id: string; nombre: string; total_cantidad: number; total_revenue: number }
  type KpiFromDB = {
    fecha: string
    ticket_promedio: number
    total_sesiones: number
    total_ventas: number
    total_ordenes: number
    canceladas: number
    tasa_cancelacion: number
    tiempo_atencion_min: number
    ocupacion_rate: number
    top_items: TopItem[]
  }
  const [kpiFromDB, setKpiFromDB] = useState<KpiFromDB | null>(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpiError, setKpiError] = useState(false)

  // Load active shift on mount
  useEffect(() => {
    supabase
      .from('shifts')
      .select('*')
      .eq('activo', true)
      .order('opened_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const s = data[0]
          setCurrentShiftId(s.id)
          setShiftOpen(true)
          setShiftStart(new Date(s.opened_at))
          setShiftNote(s.notas || '')
        }
      })
  }, [])

  // Load paid sessions from Supabase whenever selected date changes
  useEffect(() => {
    const from = `${selectedDate}T00:00:00.000Z`
    const to = `${selectedDate}T23:59:59.999Z`
    supabase
      .from('table_sessions')
      .select('id, payment_method, total, impuestos, propina, descuento, created_at')
      .eq('payment_status', 'pagado')
      .gte('created_at', from)
      .lte('created_at', to)
      .then(({ data }) => {
        if (data) {
          setPaidSessionsFromDB(data.map(r => ({
            id: r.id,
            paymentMethod: r.payment_method,
            total: r.total ?? 0,
            impuestos: r.impuestos ?? 0,
            propina: r.propina ?? 0,
            descuento: r.descuento ?? 0,
            createdAt: r.created_at,
          })))
        }
      })
  }, [selectedDate])

  // Task 2.9: KPIs desde pipeline Supabase — RPC get_daily_kpis
  const fetchKpis = useCallback(() => {
    setKpiLoading(true)
    setKpiError(false)
    setKpiFromDB(null)
    supabase
      .rpc('get_daily_kpis', { p_fecha: selectedDate })
      .then(({ data, error }) => {
        if (error) {
          console.error('[get_daily_kpis]', error.message)
          setKpiError(true)
        } else if (data) {
          setKpiFromDB(data as KpiFromDB)
        }
        setKpiLoading(false)
      })
  }, [selectedDate])

  useEffect(() => { fetchKpis() }, [fetchKpis])

  const handleOpenShift = async () => {
    const newId = crypto.randomUUID()
    const now = new Date()
    setShiftStart(now)
    setShiftEnd(null)
    setShiftOpen(true)
    setShowCloseConfirm(false)
    setEfectivoContado('')
    setCurrentShiftId(newId)
    await supabase.from('shifts').insert({
      id: newId,
      nombre: `Turno ${now.toLocaleDateString('es-MX')} ${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      opened_at: now.toISOString(),
      activo: true,
    })
  }

  const handleCloseShift = async () => {
    const now = new Date()
    setShiftEnd(now)
    setShiftOpen(false)
    if (currentShiftId) {
      await supabase.from('shifts').update({
        activo: false,
        closed_at: now.toISOString(),
        notas: shiftNote || null,
        total_ventas: stats.netSales,
        total_ordenes: stats.completedOrders,
        efectivo: stats.salesByPayment['efectivo'] ?? 0,
        tarjeta: (stats.salesByPayment['tarjeta'] ?? 0) + (stats.salesByPayment['apple_pay'] ?? 0) + (stats.salesByPayment['transferencia'] ?? 0),
        propinas: stats.totalTips,
        descuentos: stats.totalDiscounts,
        reembolsos: stats.totalRefunds,
      }).eq('id', currentShiftId)
    }

    // Task 2.9: KPI snapshot vía RPC (calcula desde DB real, también hace upsert en kpi_daily)
    supabase.rpc('get_daily_kpis', { p_fecha: selectedDate }).then(({ data, error }) => {
      if (!error && data) setKpiFromDB(data as KpiFromDB)
    })
  }

  // Filter data by selected date
  const dayOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
      return orderDate === selectedDate
    })
  }, [orders, selectedDate])

  const dayRefunds = useMemo(() => {
    return refunds.filter(refund => {
      const refundDate = new Date(refund.createdAt).toISOString().split('T')[0]
      return refundDate === selectedDate
    })
  }, [refunds, selectedDate])

  const dayPayments = useMemo(() => {
    return getPaymentsForDate(new Date(selectedDate))
  }, [getPaymentsForDate, selectedDate])

  // Use DB-fetched paid sessions — local tableSessions only has active (unpaid) ones
  const daySessions = paidSessionsFromDB

  const completedOrders = dayOrders.filter(o => o.status === 'entregado')
  const cancelledOrders = dayOrders.filter(o => o.status === 'cancelado')

  const salesByChannel = dayOrders.reduce((acc, order) => {
    if (order.status !== 'entregado') return acc
    const total = calculateOrderTotal(order.items)
    return { ...acc, [order.canal]: (acc[order.canal] || 0) + total }
  }, {} as Record<string, number>)

  const salesByPayment: Record<string, number> = [
    ...dayPayments.filter(s => s.paymentMethod),
    ...daySessions.filter(s => s.paymentMethod),
  ].reduce((acc, s) => ({
    ...acc,
    [s.paymentMethod!]: (acc[s.paymentMethod!] || 0) + s.total,
  }), {} as Record<string, number>)

  const itemSalesMap = completedOrders.reduce((acc, order) => {
    order.items.forEach(item => {
      const key = item.menuItem.id
      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
      const prev = acc[key] ?? { name: item.menuItem.nombre, quantity: 0, revenue: 0 }
      acc[key] = {
        name: prev.name,
        quantity: prev.quantity + item.cantidad,
        revenue: prev.revenue + (item.menuItem.precio + extrasTotal) * item.cantidad,
      }
    })
    return acc
  }, {} as Record<string, { name: string; quantity: number; revenue: number }>)
  const topItems = Object.values(itemSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const grossSales = completedOrders.reduce((sum, o) => sum + calculateOrderTotal(o.items), 0)
  const totalTax = dayPayments.reduce((sum, p) => sum + p.impuestos, 0) + daySessions.reduce((sum, s) => sum + s.impuestos, 0)
  const totalTips = dayPayments.reduce((sum, p) => sum + p.propina, 0) + daySessions.reduce((sum, s) => sum + s.propina, 0)
  const totalDiscounts = daySessions.reduce((sum, s) => sum + s.descuento, 0)
  const totalRefunds = dayRefunds.reduce((sum, r) => sum + r.monto, 0)
  const netSales = grossSales - totalDiscounts - totalRefunds
  const avgOrderValue = completedOrders.length > 0 ? grossSales / completedOrders.length : 0
  const ordersWithPrepTime = completedOrders.filter(o => o.tiempoInicioPreparacion && o.tiempoFinPreparacion)
  const avgPrepTime = ordersWithPrepTime.length > 0
    ? ordersWithPrepTime.reduce((sum, o) => {
        const start = new Date(o.tiempoInicioPreparacion!).getTime()
        const end = new Date(o.tiempoFinPreparacion!).getTime()
        return sum + (end - start) / 1000 / 60
      }, 0) / ordersWithPrepTime.length
    : 0

  const stats = useMemo(() => ({
    totalOrders: dayOrders.length,
    completedOrders: completedOrders.length,
    cancelledOrders: cancelledOrders.length,
    grossSales,
    netSales,
    totalTax,
    totalTips,
    totalDiscounts,
    totalRefunds,
    avgOrderValue,
    avgPrepTime,
    salesByChannel,
    salesByPayment,
    topItems,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [dayOrders, dayRefunds, dayPayments, paidSessionsFromDB])

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return

    const shiftInfo = shiftStart
      ? `<div class="subtitle">Turno: ${shiftStart.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}${shiftEnd ? ` → ${shiftEnd.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : ' (activo)'}</div>`
      : ''

    const channelRows = Object.entries(stats.salesByChannel).map(
      ([ch, amt]) => `<tr><td>${getChannelLabel(ch as Order['canal'])}</td><td style="text-align:right">$${(amt as number).toFixed(2)}</td></tr>`
    ).join('')

    const paymentRows = Object.entries(stats.salesByPayment).map(
      ([m, amt]) => {
        const label = m === 'tarjeta' ? 'Tarjeta' : m === 'apple_pay' ? 'Apple Pay / Digital' : m === 'transferencia' ? 'Transferencia' : 'Efectivo'
        return `<tr><td>${label}</td><td style="text-align:right">$${(amt as number).toFixed(2)}</td></tr>`
      }
    ).join('')

    const topItemRows = stats.topItems.map(
      (item, i) => `<tr><td>${i + 1}. ${item.name} (x${item.quantity})</td><td style="text-align:right">$${item.revenue.toFixed(2)}</td></tr>`
    ).join('')

    const noteRow = shiftNote ? `<div style="margin-top:12px;padding:8px;background:#f2f2f2;border-radius:4px;font-size:11px;color:#444"><strong>Observaciones:</strong> ${shiftNote}</div>` : ''

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Turno & Caja — ${selectedDate}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;padding:24px;max-width:700px;margin:0 auto;color:#1a1a1a}
      h1{font-size:22px;font-weight:900;text-align:center;letter-spacing:-0.5px}
      .subtitle{text-align:center;color:#666;font-size:11px;margin-bottom:4px}
      .sep{border-top:2px solid #000;margin:12px 0}
      .sep-light{border-top:1px solid #ddd;margin:8px 0}
      .section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 8px;color:#000}
      .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
      .stat-box{border:1px solid #e5e5e5;border-radius:6px;padding:10px;text-align:center}
      .stat-value{font-size:18px;font-weight:800}
      .stat-label{font-size:10px;color:#6b6b6b;margin-top:2px}
      table{width:100%;border-collapse:collapse}
      td{padding:4px 0;vertical-align:top}
      .total-row td{font-weight:800;padding-top:8px;border-top:2px solid #000;font-size:14px}
      .green{color:#16a34a}.red{color:#dc2626}.gray{color:#6b6b6b}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
      .ledger-box{border:1px solid #e5e5e5;border-radius:6px;padding:12px}
      @media print{body{padding:0;font-size:11px}.stat-value{font-size:14px}.stats-grid{gap:6px}}
    </style></head><body>
      <h1>${config.restaurantName ?? ''}</h1>
      <div class="subtitle">TURNO & CAJA — ${selectedDate}</div>
      ${shiftInfo}
      <div class="sep"></div>

      <div class="stats-grid">
        <div class="stat-box"><div class="stat-value">$${stats.netSales.toFixed(2)}</div><div class="stat-label">Ventas Netas</div></div>
        <div class="stat-box"><div class="stat-value">${stats.completedOrders}</div><div class="stat-label">Pedidos</div></div>
        <div class="stat-box"><div class="stat-value">$${stats.avgOrderValue.toFixed(2)}</div><div class="stat-label">Ticket Prom.</div></div>
        <div class="stat-box"><div class="stat-value">${stats.avgPrepTime.toFixed(1)}m</div><div class="stat-label">Prep. Prom.</div></div>
      </div>

      <div class="section-title">Resumen Financiero</div>
      <table>
        <tr><td>Ventas Brutas</td><td style="text-align:right">$${stats.grossSales.toFixed(2)}</td></tr>
        <tr><td class="red">(-) Descuentos</td><td style="text-align:right" class="red">-$${stats.totalDiscounts.toFixed(2)}</td></tr>
        <tr><td class="red">(-) Reembolsos</td><td style="text-align:right" class="red">-$${stats.totalRefunds.toFixed(2)}</td></tr>
        <tr class="total-row"><td>Ventas Netas</td><td style="text-align:right">$${stats.netSales.toFixed(2)}</td></tr>
        <tr><td class="gray">IVA (incluido en ventas)</td><td style="text-align:right" class="gray">$${stats.totalTax.toFixed(2)}</td></tr>
        <tr><td class="green">+ Propinas</td><td style="text-align:right" class="green">$${stats.totalTips.toFixed(2)}</td></tr>
      </table>

      <div class="two-col" style="margin-top:16px">
        <div class="ledger-box">
          <div class="section-title" style="margin-top:0">Por Método de Pago</div>
          <table>${paymentRows || '<tr><td colspan="2" style="color:#999;text-align:center">Sin pagos</td></tr>'}</table>
        </div>
        <div class="ledger-box">
          <div class="section-title" style="margin-top:0">Por Canal</div>
          <table>${channelRows || '<tr><td colspan="2" style="color:#999;text-align:center">Sin ventas</td></tr>'}</table>
        </div>
      </div>

      <div class="section-title">Más Vendidos</div>
      <table>${topItemRows || '<tr><td colspan="2" style="color:#999;text-align:center">Sin ventas</td></tr>'}</table>

      ${stats.cancelledOrders > 0 ? `<div style="margin-top:12px;color:#dc2626;font-weight:700;font-size:12px">Pedidos cancelados: ${stats.cancelledOrders}</div>` : ''}
      ${noteRow}

      <div class="sep"></div>
      <div style="text-align:center;font-size:10px;color:#999;margin-top:8px">
        Generado ${new Date().toLocaleString('es-MX')} · ${config.restaurantName ?? ''} Plataforma Operativa
      </div>
    </body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
  }, [selectedDate, stats, shiftStart, shiftEnd, shiftNote, config.restaurantName])

  const exportCSV = () => {
    const rows = [
      ['Metrica', 'Valor'],
      ['Fecha', selectedDate],
      ['Turno inicio', shiftStart?.toLocaleTimeString('es-MX') || '—'],
      ['Turno fin', shiftEnd?.toLocaleTimeString('es-MX') || '—'],
      ['Total Pedidos', stats.totalOrders.toString()],
      ['Pedidos Completados', stats.completedOrders.toString()],
      ['Pedidos Cancelados', stats.cancelledOrders.toString()],
      ['Ventas Brutas', formatPrice(stats.grossSales)],
      ['Descuentos', formatPrice(stats.totalDiscounts)],
      ['Reembolsos', formatPrice(stats.totalRefunds)],
      ['Ventas Netas', formatPrice(stats.netSales)],
      ['IVA Cobrado', formatPrice(stats.totalTax)],
      ['Propinas', formatPrice(stats.totalTips)],
      ['Ticket Promedio', formatPrice(stats.avgOrderValue)],
      ['Tiempo Promedio Prep', `${stats.avgPrepTime.toFixed(1)} min`],
      ...Object.entries(stats.salesByPayment).map(([m, amt]) => [`Pago — ${m}`, formatPrice(amt)]),
    ]
    const csvContent = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `turno-${selectedDate}.csv`
    link.click()
  }

  const paymentIcon = (method: string) => {
    if (method === 'tarjeta') return <CreditCard className="h-3.5 w-3.5" />
    if (method === 'apple_pay') return <Smartphone className="h-3.5 w-3.5" />
    if (method === 'transferencia') return <Smartphone className="h-3.5 w-3.5" />
    return <Banknote className="h-3.5 w-3.5" />
  }

  const paymentLabel = (method: string) => {
    if (method === 'tarjeta') return 'Tarjeta'
    if (method === 'apple_pay') return 'Apple Pay / Digital'
    if (method === 'transferencia') return 'Transferencia'
    return 'Efectivo'
  }

  const formatShiftTime = (d: Date) =>
    d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Turno & Caja</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Ledger operativo del turno</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="h-8 text-xs w-auto"
          />
          <Button variant="outline" size="sm" onClick={exportCSV}
            className="gap-1.5 h-8 text-xs border-border bg-transparent hover:bg-muted text-foreground">
            <Download className="h-3 w-3" />
            CSV
          </Button>
          <Button size="sm" onClick={handlePrint}
            className="gap-1.5 h-8 text-xs bg-black hover:bg-black/90 text-white">
            <Printer className="h-3 w-3" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Shift Control Panel */}
      <div className={cn(
        'border rounded-xl p-4',
        shiftOpen
          ? 'border-success bg-green-50'
          : shiftEnd
          ? 'border-border bg-muted'
          : 'border-border bg-white'
      )}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                shiftOpen ? 'bg-success animate-pulse' : 'bg-accent'
              )} />
              <span className="text-sm font-bold text-foreground">
                {shiftOpen ? 'Turno activo' : shiftEnd ? 'Turno cerrado' : 'Sin turno abierto'}
              </span>
            </div>
            {shiftStart && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                {shiftOpen
                  ? `Abierto a las ${formatShiftTime(shiftStart)}`
                  : `${formatShiftTime(shiftStart)} → ${shiftEnd ? formatShiftTime(shiftEnd) : '—'}`
                }
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {shiftOpen ? (
              <>
                {showCloseConfirm ? (
                  <>
                    <span className="text-xs text-muted-foreground">¿Confirmar cierre?</span>
                    <Button size="sm" variant="outline"
                      className="h-8 text-xs border-border"
                      onClick={() => setShowCloseConfirm(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm"
                      className="h-8 text-xs bg-black hover:bg-black/90 text-white gap-1.5"
                      onClick={handleCloseShift}>
                      <Square className="h-3 w-3" />
                      Cerrar turno
                    </Button>
                  </>
                ) : (
                  <Button size="sm"
                    className="h-8 text-xs bg-black hover:bg-black/90 text-white gap-1.5"
                    onClick={() => setShowCloseConfirm(true)}>
                    <Square className="h-3 w-3" />
                    Cerrar turno
                  </Button>
                )}
              </>
            ) : (
              <Button size="sm"
                className="h-8 text-xs bg-black hover:bg-black/90 text-white gap-1.5"
                onClick={handleOpenShift}>
                <Play className="h-3 w-3" />
                Abrir turno
              </Button>
            )}
          </div>
        </div>

        {/* Shift note */}
        {(shiftOpen || shiftEnd) && (
          <div className="mt-3">
            <Textarea
              value={shiftNote}
              onChange={e => setShiftNote(e.target.value)}
              placeholder="Observaciones del turno (opcional)..."
              rows={2}
              disabled={!!shiftEnd && !shiftOpen}
              className="text-xs p-2"
            />
          </div>
        )}
      </div>

      {/* Fondo de caja / Conciliación de efectivo */}
      {(shiftOpen || shiftEnd) && (() => {
        const cashSales = stats.salesByPayment['efectivo'] || 0
        const fondoNum = parseFloat(fondoCajaApertura) || 0
        const contadoNum = parseFloat(efectivoContado) || 0
        const esperado = fondoNum + cashSales
        const diferencia = contadoNum - esperado
        const hasDif = efectivoContado !== '' && !isNaN(contadoNum)

        return (
          <div className="border border-border rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Conciliación de Efectivo</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                    Fondo apertura ($)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fondoCajaApertura}
                    onChange={e => setFondoCajaApertura(e.target.value)}
                    placeholder="0.00"
                    disabled={!!shiftEnd && !shiftOpen}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                    Efectivo contado ($)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={efectivoContado}
                    onChange={e => setEfectivoContado(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Fondo apertura</span>
                  <span className="text-foreground">{fondoNum > 0 ? formatPrice(fondoNum) : '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">+ Ventas en efectivo</span>
                  <span className="text-foreground">{formatPrice(cashSales)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-border pt-1.5">
                  <span className="text-foreground">Efectivo esperado</span>
                  <span className="text-foreground">{formatPrice(esperado)}</span>
                </div>
                {hasDif && (
                  <div className={cn(
                    'flex justify-between text-sm font-bold pt-1 border-t-2',
                    diferencia > 0 ? 'border-success' : diferencia < 0 ? 'border-destructive' : 'border-border'
                  )}>
                    <span className={diferencia === 0 ? 'text-muted-foreground' : diferencia > 0 ? 'text-success' : 'text-destructive'}>
                      {diferencia > 0 ? 'Sobrante' : diferencia < 0 ? 'Faltante' : 'Cuadrado'}
                    </span>
                    <span className={diferencia === 0 ? 'text-muted-foreground' : diferencia > 0 ? 'text-success' : 'text-destructive'}>
                      {diferencia > 0 ? '+' : ''}{formatPrice(diferencia)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* KPI Cards — Task 2.9: datos reales desde Supabase RPC */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">KPIs del día</p>
          {kpiLoading && <Spinner className="size-3 text-muted-foreground" />}
          {!kpiLoading && kpiFromDB && !kpiError && (
            <span className="text-[9px] text-muted-foreground">calculado desde Supabase</span>
          )}
          {kpiError && (
            <button
              onClick={fetchKpis}
              className="text-[9px] text-destructive underline"
            >
              Error al cargar — Reintentar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Ticket Promedio',
              value: kpiLoading ? '—' : formatPrice(kpiFromDB?.ticket_promedio ?? 0),
              icon: <TrendingUp className="h-4 w-4" />,
            },
            {
              label: 'Órdenes entregadas',
              value: kpiLoading ? '—' : (kpiFromDB?.total_ordenes ?? 0).toString(),
              icon: <ShoppingBag className="h-4 w-4" />,
            },
            {
              label: 'Tiempo atención',
              value: kpiLoading ? '—' : `${(kpiFromDB?.tiempo_atencion_min ?? 0).toFixed(1)} min`,
              icon: <Clock className="h-4 w-4" />,
            },
            {
              label: 'Ocupación (vueltas/mesa)',
              value: kpiLoading ? '—' : (kpiFromDB?.ocupacion_rate ?? 0).toFixed(1),
              icon: <Users className="h-4 w-4" />,
            },
          ].map(kpi => (
            <div key={kpi.label} className="border border-border rounded-xl p-3 bg-white">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 rounded bg-muted text-foreground">
                  {kpi.icon}
                </div>
              </div>
              <p className="text-lg font-bold text-foreground leading-none">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
        {/* Tasa de cancelación */}
        {!kpiLoading && kpiFromDB && kpiFromDB.canceladas > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{kpiFromDB.canceladas} órdenes canceladas ({kpiFromDB.tasa_cancelacion}% del total)</span>
          </div>
        )}
      </div>

      {/* Financial Ledger */}
      <div className="border border-border rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Resumen Financiero</p>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ventas Brutas</span>
            <span className="font-medium text-foreground">{formatPrice(stats.grossSales)}</span>
          </div>
          {stats.totalDiscounts > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-destructive">(−) Descuentos</span>
              <span className="text-destructive">−{formatPrice(stats.totalDiscounts)}</span>
            </div>
          )}
          {stats.totalRefunds > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-destructive">(−) Reembolsos</span>
              <span className="text-destructive">−{formatPrice(stats.totalRefunds)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
            <span>Ventas Netas</span>
            <span>{formatPrice(stats.netSales)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>IVA (incluido en ventas)</span>
            <span>{formatPrice(stats.totalTax)}</span>
          </div>
          {stats.totalTips > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span>+ Propinas recibidas</span>
              <span className="font-medium">{formatPrice(stats.totalTips)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment & Channel breakdown */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* By Payment Method */}
        <div className="border border-border rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Método de Pago</p>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(stats.salesByPayment).length > 0 ? (
              Object.entries(stats.salesByPayment).map(([method, amount]) => (
                <div key={method} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {paymentIcon(method)}
                    <span>{paymentLabel(method)}</span>
                  </div>
                  <span className="font-semibold text-foreground">{formatPrice(amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">Sin pagos registrados</p>
            )}
          </div>
        </div>

        {/* By Channel */}
        <div className="border border-border rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Canal de Venta</p>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(stats.salesByChannel).length > 0 ? (
              Object.entries(stats.salesByChannel).map(([channel, amount]) => (
                <div key={channel} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{getChannelLabel(channel as Order['canal'])}</span>
                  <span className="font-semibold text-foreground">{formatPrice(amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">Sin ventas</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Items — Task 2.9: desde Supabase RPC (JSONB de órdenes) */}
      <div className="border border-border rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <ChefHat className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Más Vendidos</p>
          {kpiLoading && <Spinner className="size-3 text-muted-foreground ml-auto" />}
        </div>
        <div className="p-4">
          {kpiLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Calculando desde Supabase...</p>
          ) : kpiError ? (
            <div className="text-center py-4">
              <p className="text-xs text-destructive">No se pudo cargar</p>
              <button onClick={fetchKpis} className="text-[10px] text-destructive underline mt-1">Reintentar</button>
            </div>
          ) : (kpiFromDB?.top_items ?? []).length > 0 ? (
            <div className="space-y-2">
              {(kpiFromDB!.top_items).map((item, index) => (
                <div key={item.menu_item_id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-4 text-right">{index + 1}</span>
                    <span className="text-foreground">{item.nombre}</span>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      ×{item.total_cantidad}
                    </span>
                  </div>
                  <span className="font-semibold text-foreground">{formatPrice(item.total_revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Sin ventas en este día</p>
          )}
        </div>
      </div>

      {/* Cancelled / Refunds alerts */}
      {(stats.cancelledOrders > 0 || stats.totalRefunds > 0) && (
        <div className="border border-border rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            <p className="text-xs font-bold text-destructive uppercase tracking-wide">Incidencias</p>
          </div>
          <div className="p-4 space-y-2">
            {stats.cancelledOrders > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pedidos cancelados</span>
                <span className="font-semibold text-destructive">{stats.cancelledOrders}</span>
              </div>
            )}
            {stats.totalRefunds > 0 && (
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Total reembolsado</span>
                </div>
                <span className="font-semibold text-destructive">−{formatPrice(stats.totalRefunds)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
