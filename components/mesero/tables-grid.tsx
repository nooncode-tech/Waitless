'use client'

import { useEffect, useState } from 'react'
import { Users, Bell, Receipt, Clock, ChefHat, CircleCheck, LayoutGrid, List, Sparkles } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getTimeDiffMinutes } from '@/lib/store'

interface TablesGridProps {
  onSelectTable: (mesa: number) => void
}

export function TablesGrid({ onSelectTable }: TablesGridProps) {
  const { tableSessions, getPendingCalls, getActiveTables, markTableClean, tables } = useApp()
  const [now, setNow] = useState(new Date())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const pendingCalls = getPendingCalls()

  const getTableInfo = (mesa: number) => {
    const tableConfig = tables.find(t => t.numero === mesa)
    const session = tableSessions.find(s => s.mesa === mesa && s.activa)
    const tableOrders = session?.orders?.filter(
      o => o.status !== 'cancelado'
    ) || []
    const activeOrders = tableOrders.filter(o => o.status !== 'entregado')
    const tableCalls = pendingCalls.filter(c => c.mesa === mesa)
    const paymentRequested = session?.paymentStatus === 'pendiente' &&
      tableCalls.some(c => c.tipo === 'cuenta')
    const hasAttentionCall = tableCalls.some(c => c.tipo === 'atencion' || c.tipo === 'otro')
    const elapsedMin = session ? getTimeDiffMinutes(session.createdAt) : 0

    // LIMPIEZA state — session is closed, table needs cleaning
    if (tableConfig?.estado === 'limpieza') {
      return {
        status: 'limpieza' as const,
        label: 'En limpieza',
        hasCall: false,
        hasBillRequest: false,
        orderCount: 0,
        session: null,
        elapsedMin: 0,
        hasReady: false,
        hasPreparing: false,
      }
    }

    // HOLD state — table reserved from waitlist
    if (tableConfig?.estado === 'hold') {
      return {
        status: 'hold' as const,
        label: 'Reservada',
        hasCall: false,
        hasBillRequest: false,
        orderCount: 0,
        session: null,
        elapsedMin: 0,
        hasReady: false,
        hasPreparing: false,
      }
    }

    if (!session) {
      return {
        status: 'libre' as const,
        label: 'Libre',
        hasCall: false,
        hasBillRequest: false,
        orderCount: 0,
        session: null,
        elapsedMin: 0,
        hasReady: false,
        hasPreparing: false,
      }
    }

    if (session.billStatus === 'pagada') {
      return {
        status: 'pagada' as const,
        label: 'Pagada',
        hasCall: hasAttentionCall,
        hasBillRequest: false,
        orderCount: activeOrders.length,
        session,
        elapsedMin,
        hasReady: false,
        hasPreparing: false,
      }
    }

    const hasReady = activeOrders.some(o => o.status === 'listo')
    const hasPreparing = activeOrders.some(o => o.status === 'preparando')

    if (hasReady) {
      return {
        status: 'listo' as const,
        label: 'Listo — Entregar',
        hasCall: hasAttentionCall,
        hasBillRequest: paymentRequested,
        orderCount: activeOrders.length,
        session,
        elapsedMin,
        hasReady: true,
        hasPreparing,
      }
    }
    if (hasPreparing) {
      return {
        status: 'preparando' as const,
        label: 'En cocina',
        hasCall: hasAttentionCall,
        hasBillRequest: paymentRequested,
        orderCount: activeOrders.length,
        session,
        elapsedMin,
        hasReady: false,
        hasPreparing: true,
      }
    }
    return {
      status: 'ocupada' as const,
      label: paymentRequested ? 'Solicita cuenta' : 'Ocupada',
      hasCall: hasAttentionCall,
      hasBillRequest: paymentRequested,
      orderCount: activeOrders.length,
      session,
      elapsedMin,
      hasReady: false,
      hasPreparing: false,
    }
  }

  const activeTables = getActiveTables()
  const tableInfos = activeTables.map(t => ({ ...t, ...getTableInfo(t.numero) }))

  const freeCount = tableInfos.filter(t => t.status === 'libre').length
  const readyCount = tableInfos.filter(t => t.status === 'listo').length
  const preparingCount = tableInfos.filter(t => t.status === 'preparando').length
  const occupiedCount = tableInfos.filter(t => t.status === 'ocupada' || t.status === 'pagada').length
  const cleaningCount = tableInfos.filter(t => t.status === 'limpieza').length
  const alertCount = tableInfos.filter(t => t.hasCall || t.hasBillRequest).length

  const formatElapsed = (min: number) => {
    if (min < 1) return '< 1 min'
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}h ${m > 0 ? `${m}m` : ''}`
  }

  const getStatusStyle = (info: ReturnType<typeof getTableInfo>) => {
    if (info.status === 'libre') return {
      bg: 'bg-white',
      border: 'border-border',
      dot: 'bg-accent',
      text: 'text-muted-foreground',
      badge: '',
    }
    if (info.status === 'limpieza') return {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      dot: 'bg-blue-500 animate-pulse',
      text: 'text-blue-500',
      badge: 'bg-blue-500 text-white',
    }
    if (info.status === 'hold') return {
      bg: 'bg-purple-50',
      border: 'border-purple-500',
      dot: 'bg-purple-500 animate-pulse',
      text: 'text-purple-500',
      badge: 'bg-purple-500 text-white',
    }
    if (info.status === 'pagada') return {
      bg: 'bg-green-50',
      border: 'border-success',
      dot: 'bg-success',
      text: 'text-success',
      badge: 'bg-success text-white',
    }
    if (info.status === 'listo') return {
      bg: 'bg-green-50',
      border: 'border-success border-2',
      dot: 'bg-success animate-pulse',
      text: 'text-success',
      badge: 'bg-success text-white',
    }
    if (info.status === 'preparando') return {
      bg: 'bg-kds-preparing',
      border: 'border-warning',
      dot: 'bg-warning animate-pulse',
      text: 'text-warning',
      badge: 'bg-warning text-white',
    }
    if (info.hasBillRequest) return {
      bg: 'bg-kds-preparing',
      border: 'border-warning border-2',
      dot: 'bg-warning animate-pulse',
      text: 'text-warning',
      badge: 'bg-warning text-white',
    }
    return {
      bg: 'bg-muted',
      border: 'border-accent',
      dot: 'bg-black',
      text: 'text-black',
      badge: 'bg-black text-white',
    }
  }

  return (
    <div className="p-3 md:p-5 bg-white min-h-full">

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { label: 'Libres', value: freeCount, color: 'text-muted-foreground', bg: 'bg-muted' },
          { label: 'En cocina', value: preparingCount, color: 'text-warning', bg: 'bg-kds-preparing', icon: <ChefHat className="h-3.5 w-3.5" /> },
          { label: 'Listos', value: readyCount, color: 'text-success', bg: 'bg-green-50', icon: <CircleCheck className="h-3.5 w-3.5" /> },
          { label: 'Ocupadas', value: occupiedCount, color: 'text-black', bg: 'bg-muted' },
          { label: 'Limpieza', value: cleaningCount, color: 'text-blue-500', bg: 'bg-blue-50', icon: <Sparkles className="h-3.5 w-3.5" /> },
        ].map(stat => (
          <div key={stat.label} className={cn('rounded-lg p-2.5 md:p-3', stat.bg)}>
            <p className={cn('text-xl md:text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className={cn('text-[10px] md:text-xs font-medium flex items-center gap-1', stat.color)}>
              {stat.icon}{stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {alertCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          <Bell className="h-4 w-4 text-red-500 animate-pulse shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-red-700">
            {alertCount} mesa{alertCount !== 1 ? 's' : ''} requieren atención
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { dot: 'bg-accent', label: 'Libre' },
            { dot: 'bg-black', label: 'Ocupada' },
            { dot: 'bg-warning', label: 'En cocina' },
            { dot: 'bg-success', label: 'Listo' },
            { dot: 'bg-blue-500', label: 'Limpieza' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={cn('w-2 h-2 rounded-full', l.dot)} />
              <span className="text-[10px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1" role="group" aria-label="Modo de vista">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-1 rounded', viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-muted-foreground')}
            aria-label="Vista en cuadrícula"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-1 rounded', viewMode === 'list' ? 'bg-white shadow-sm' : 'text-muted-foreground')}
            aria-label="Vista en lista"
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Floor Map Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3">
          {tableInfos.map((info) => {
            const style = getStatusStyle(info)
            return (
              <button
                key={info.id}
                onClick={() => onSelectTable(info.numero)}
                aria-label={[
                  `Mesa ${info.numero}`,
                  info.label,
                  info.hasCall ? 'llamada pendiente' : null,
                  info.hasBillRequest ? 'solicita cuenta' : null,
                  info.orderCount > 0 ? `${info.orderCount} pedido${info.orderCount !== 1 ? 's' : ''}` : null,
                  info.elapsedMin > 0 ? `hace ${formatElapsed(info.elapsedMin)}` : null,
                ].filter(Boolean).join(', ')}
                className={cn(
                  'relative flex flex-col items-center justify-between rounded-xl border transition-all duration-150',
                  'hover:shadow-md hover:-translate-y-0.5 active:scale-95',
                  'p-3 md:p-4 aspect-square',
                  style.bg,
                  style.border,
                  (info.hasCall || info.hasBillRequest) && 'ring-2 ring-red-500 ring-offset-1'
                )}
              >
                {/* Alert badges — decorative, described by button aria-label */}
                {(info.hasCall || info.hasBillRequest) && (
                  <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 z-10" aria-hidden="true">
                    {info.hasCall && (
                      <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow">
                        <Bell className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                    {info.hasBillRequest && !info.hasCall && (
                      <span className="w-5 h-5 bg-warning rounded-full flex items-center justify-center shadow">
                        <Receipt className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                  </div>
                )}

                {/* Status dot */}
                <div className="w-full flex justify-end">
                  <div className={cn('w-2 h-2 rounded-full', style.dot)} />
                </div>

                {/* Table number */}
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-lg md:text-xl font-bold text-black leading-none">
                    {info.numero}
                  </span>
                </div>

                {/* Bottom info */}
                <div className="w-full">
                  {info.status === 'limpieza' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); markTableClean(info.numero) }}
                      className="w-full text-[8px] font-bold text-blue-500 bg-blue-100 rounded px-1 py-0.5 leading-tight"
                      aria-label={`Marcar mesa ${info.numero} como lista`}
                    >
                      ✓ Lista
                    </button>
                  ) : info.status === 'libre' ? (
                    <p className="text-[9px] text-muted-foreground text-center font-medium">Libre</p>
                  ) : info.elapsedMin > 0 ? (
                    <p className={cn('text-[9px] font-semibold text-center flex items-center justify-center gap-0.5', style.text)}>
                      <Clock className="h-2 w-2" />
                      {formatElapsed(info.elapsedMin)}
                    </p>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {tableInfos.map((info) => {
            const style = getStatusStyle(info)
            return (
              <button
                key={info.id}
                onClick={() => onSelectTable(info.numero)}
                aria-label={[
                  `Mesa ${info.numero}`,
                  info.label,
                  info.hasCall ? 'llamada pendiente' : null,
                  info.hasBillRequest ? 'solicita cuenta' : null,
                ].filter(Boolean).join(', ')}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
                  'hover:shadow-sm active:scale-[0.99] text-left',
                  style.bg,
                  style.border,
                  (info.hasCall || info.hasBillRequest) && 'ring-1 ring-red-400'
                )}
              >
                {/* Status dot */}
                <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', style.dot)} />

                {/* Table number */}
                <span className="text-base font-bold text-black w-12 shrink-0">Mesa {info.numero}</span>

                {/* Status */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold', style.text)}>{info.label}</p>
                  {info.orderCount > 0 && (
                    <p className="text-[10px] text-muted-foreground">{info.orderCount} pedido{info.orderCount !== 1 ? 's' : ''}</p>
                  )}
                </div>

                {/* Timer */}
                {info.elapsedMin > 0 && (
                  <div className={cn('flex items-center gap-1 text-xs font-medium shrink-0', style.text)}>
                    <Clock className="h-3 w-3" />
                    {formatElapsed(info.elapsedMin)}
                  </div>
                )}

                {/* Alerts / Limpieza action */}
                <div className="flex items-center gap-1 shrink-0">
                  {info.status === 'limpieza' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); markTableClean(info.numero) }}
                      className="text-[10px] font-bold text-blue-500 bg-blue-100 rounded px-2 py-0.5"
                      aria-label={`Marcar mesa ${info.numero} como lista`}
                    >
                      Mesa lista
                    </button>
                  ) : (
                    <>
                      {info.hasCall && <Bell className="h-3.5 w-3.5 text-red-500" />}
                      {info.hasBillRequest && <Receipt className="h-3.5 w-3.5 text-warning" />}
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
