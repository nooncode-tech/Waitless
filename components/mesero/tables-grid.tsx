'use client'

import React, { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { getTimeDiffMinutes, formatPrice } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface TablesGridProps {
  onSelectTable: (mesa: number) => void
}

export function TablesGrid({ onSelectTable }: TablesGridProps) {
  const { tableSessions, getPendingCalls, getActiveTables, markTableClean, markCallAttended, currentUser, tables, config } = useApp()
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
    const tableOrders = session?.orders?.filter(o => o.status !== 'cancelado') || []
    const activeOrders = tableOrders.filter(o => o.status !== 'entregado')
    const tableCalls = pendingCalls.filter(c => c.mesa === mesa)
    const paymentRequested = session?.paymentStatus === 'pendiente' && tableCalls.some(c => c.tipo === 'cuenta')
    const hasAttentionCall = tableCalls.some(c => c.tipo === 'atencion' || c.tipo === 'otro')
    const elapsedMin = session ? getTimeDiffMinutes(session.createdAt) : 0

    if (tableConfig?.estado === 'limpieza') {
      return { status: 'limpieza' as const, label: 'En limpieza', hasCall: false, hasBillRequest: false, orderCount: 0, session: null, elapsedMin: 0, hasReady: false, hasPreparing: false }
    }
    if (tableConfig?.estado === 'hold') {
      return { status: 'hold' as const, label: 'Reservada', hasCall: false, hasBillRequest: false, orderCount: 0, session: null, elapsedMin: 0, hasReady: false, hasPreparing: false }
    }
    if (!session) {
      return { status: 'libre' as const, label: 'Libre', hasCall: false, hasBillRequest: false, orderCount: 0, session: null, elapsedMin: 0, hasReady: false, hasPreparing: false }
    }
    if (session.billStatus === 'pagada') {
      return { status: 'pagada' as const, label: 'Pagada', hasCall: hasAttentionCall, hasBillRequest: false, orderCount: activeOrders.length, session, elapsedMin, hasReady: false, hasPreparing: false }
    }
    const hasReady = activeOrders.some(o => o.status === 'listo')
    const hasPreparing = activeOrders.some(o => o.status === 'preparando')
    if (hasReady) {
      return { status: 'listo' as const, label: 'Listo — Entregar', hasCall: hasAttentionCall, hasBillRequest: paymentRequested, orderCount: activeOrders.length, session, elapsedMin, hasReady: true, hasPreparing }
    }
    if (hasPreparing) {
      return { status: 'preparando' as const, label: 'En cocina', hasCall: hasAttentionCall, hasBillRequest: paymentRequested, orderCount: activeOrders.length, session, elapsedMin, hasReady: false, hasPreparing: true }
    }
    return { status: 'ocupada' as const, label: paymentRequested ? 'Solicita cuenta' : 'Ocupada', hasCall: hasAttentionCall, hasBillRequest: paymentRequested, orderCount: activeOrders.length, session, elapsedMin, hasReady: false, hasPreparing: false }
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
    if (min < 1) return '< 1m'
    if (min < 60) return `${min}m`
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}h${m > 0 ? ` ${m}m` : ''}`
  }

  const getCellStyle = (info: ReturnType<typeof getTableInfo>): React.CSSProperties => {
    const base: React.CSSProperties = {
      borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', position: 'relative', cursor: 'pointer',
      transition: 'transform 0.15s ease', aspectRatio: '1/1', border: '1px solid #E5E5E5',
    }
    if (info.status === 'libre') return { ...base, background: '#FAFAFA' }
    if (info.status === 'listo') return { ...base, background: '#BEEBBE', border: '1px solid #BEEBBE' }
    if (info.status === 'pagada') return { ...base, background: '#BEEBBE', border: '1px solid #BEEBBE', opacity: 0.7 }
    if (info.status === 'limpieza') return { ...base, background: '#fff', border: '2px dashed #E5E5E5' }
    if (info.status === 'hold') return { ...base, background: '#F0F0F0', border: '1px solid #D0D0D0' }
    if (info.status === 'preparando') return { ...base, background: '#1a1a1a', border: '1px solid #1a1a1a' }
    // ocupada or bill request
    return { ...base, background: '#000', border: info.hasBillRequest ? '2px solid #f59e0b' : '1px solid #000' }
  }

  const getNumColor = (info: ReturnType<typeof getTableInfo>): string => {
    if (info.status === 'libre') return '#909090'
    if (info.status === 'listo') return '#0a3a0a'
    if (info.status === 'pagada') return '#0a3a0a'
    if (info.status === 'limpieza') return '#666'
    if (info.status === 'hold') return '#666'
    return '#fff'
  }

  const handleAttendCall = (callId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentUser) markCallAttended(callId, currentUser.id)
  }

  return (
    <div style={{ fontFamily: FONT, background: '#fff', minHeight: '100%' }}>
      <style>{`
        .mes-table-cell:hover { transform: translateY(-2px); }
        .mes-clean-btn:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderBottom: '1px solid #E5E5E5', position: 'sticky', top: 0, background: '#fff', zIndex: 10,
      }}>
        <div style={{
          width: 30, height: 30, background: '#000', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.04em', flexShrink: 0,
        }}>W</div>
        <div style={{ lineHeight: 1.15, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em' }}>
            {config.restaurantName ?? 'Waitless'} · {currentUser?.nombre ?? ''}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090' }}>
            {occupiedCount + preparingCount + readyCount} mesas activas
          </div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
          color: '#0a3a0a', background: '#BEEBBE', padding: '5px 10px', borderRadius: 999, flexShrink: 0,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#0a3a0a', display: 'inline-block', boxShadow: '0 0 0 2px rgba(10,58,10,0.25)' }} />
          En turno
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, padding: '10px 14px' }}>
        {[
          { label: 'Libres', value: freeCount, color: '#909090', bg: '#FAFAFA' },
          { label: 'Cocina', value: preparingCount, color: '#92400E', bg: '#FEF3C7' },
          { label: 'Listos', value: readyCount, color: '#0a3a0a', bg: '#BEEBBE' },
          { label: 'Ocup.', value: occupiedCount, color: '#fff', bg: '#000' },
          { label: 'Limp.', value: cleaningCount, color: '#666', bg: '#F0F0F0' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontWeight: 700, fontSize: 20, lineHeight: 1, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: s.color, marginTop: 2, opacity: s.color === '#fff' ? 0.7 : 1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alert banner */}
      {alertCount > 0 && (
        <div style={{ margin: '0 14px 8px', padding: '10px 14px', background: '#FEE2E2', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#991B1B', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {alertCount} mesa{alertCount !== 1 ? 's' : ''} requieren atención
          </span>
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 14px 10px', gap: 4 }}>
        <button
          onClick={() => setViewMode('grid')}
          style={{ height: 32, width: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? '#000' : '#F0F0F0', color: viewMode === 'grid' ? '#fff' : '#666', fontWeight: 700, fontSize: 14 }}
          aria-label="Vista cuadrícula"
        >⊞</button>
        <button
          onClick={() => setViewMode('list')}
          style={{ height: 32, width: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: viewMode === 'list' ? '#000' : '#F0F0F0', color: viewMode === 'list' ? '#fff' : '#666', fontWeight: 700, fontSize: 14 }}
          aria-label="Vista lista"
        >☰</button>
      </div>

      {/* Grid / List */}
      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 14px 14px' }}>
          {tableInfos.map((info) => {
            const cellStyle = getCellStyle(info)
            const numColor = getNumColor(info)
            return (
              <button
                key={info.id}
                className="mes-table-cell"
                onClick={() => onSelectTable(info.numero)}
                style={{ ...cellStyle, fontFamily: FONT, border: cellStyle.border, textAlign: 'left' }}
                aria-label={`Mesa ${info.numero} — ${info.label}`}
              >
                {/* Top row: num + time or chip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 26, lineHeight: 1, color: numColor, fontVariantNumeric: 'tabular-nums' }}>
                    {String(info.numero).padStart(2, '0')}
                  </span>
                  {(info.status === 'ocupada' || info.status === 'preparando') && info.elapsedMin > 0 && (
                    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#fff', opacity: 0.7 }}>
                      {formatElapsed(info.elapsedMin)}
                    </span>
                  )}
                  {info.status === 'listo' && (
                    <span style={{ background: '#0a3a0a', color: '#BEEBBE', fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      LISTA
                    </span>
                  )}
                  {info.status === 'pagada' && (
                    <span style={{ background: '#0a3a0a', color: '#BEEBBE', fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      PAG.
                    </span>
                  )}
                  {(info.hasCall || info.hasBillRequest) && (info.status === 'ocupada' || info.status === 'preparando') && (
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: '#f59e0b', display: 'inline-block', boxShadow: '0 0 0 2px rgba(245,158,11,0.3)' }} />
                  )}
                </div>

                {/* Bottom row */}
                {info.status === 'limpieza' ? (
                  <button
                    className="mes-clean-btn"
                    onClick={(e) => { e.stopPropagation(); markTableClean(info.numero) }}
                    style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#666', background: '#F0F0F0', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', textAlign: 'center', width: '100%', marginTop: 8 }}
                  >
                    ✓ Lista
                  </button>
                ) : info.status === 'hold' ? (
                  <span style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#666' }}>Reservada</span>
                ) : info.status === 'libre' ? (
                  <span style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#909090' }}>Libre</span>
                ) : info.session ? (
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: numColor, opacity: info.status === 'ocupada' ? 1 : 0.85 }}>
                    {formatPrice(info.session.total)}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tableInfos.map((info) => {
            const isBlack = info.status === 'ocupada' || info.status === 'preparando'
            const isMint = info.status === 'listo' || info.status === 'pagada'
            return (
              <button
                key={info.id}
                onClick={() => onSelectTable(info.numero)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 12, border: `1px solid ${isMint ? '#BEEBBE' : isBlack ? '#000' : '#E5E5E5'}`,
                  background: isMint ? '#BEEBBE' : isBlack ? '#000' : '#FAFAFA',
                  cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
                }}
                aria-label={`Mesa ${info.numero} — ${info.label}`}
              >
                <span style={{
                  fontWeight: 700, letterSpacing: '-0.04em', fontSize: 20, lineHeight: 1,
                  color: isMint ? '#0a3a0a' : isBlack ? '#fff' : '#909090', minWidth: 36,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {String(info.numero).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: isMint ? '#0a3a0a' : isBlack ? 'rgba(255,255,255,0.6)' : '#909090' }}>
                    {info.label}
                  </div>
                  {info.orderCount > 0 && (
                    <div style={{ fontFamily: MONO, fontSize: 10, color: isMint ? 'rgba(10,58,10,0.6)' : isBlack ? 'rgba(255,255,255,0.4)' : '#bbb', marginTop: 2 }}>
                      {info.orderCount} pedido{info.orderCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                {info.elapsedMin > 0 && (
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: isMint ? '#0a3a0a' : isBlack ? 'rgba(255,255,255,0.7)' : '#909090' }}>
                    {formatElapsed(info.elapsedMin)}
                  </span>
                )}
                {info.status === 'limpieza' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markTableClean(info.numero) }}
                    style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#666', background: '#E5E5E5', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', minHeight: 36 }}
                  >
                    Mesa lista
                  </button>
                )}
                {(info.hasCall || info.hasBillRequest) && info.status !== 'limpieza' && (
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Pending calls section */}
      {pendingCalls.length > 0 && (
        <div style={{ padding: '0 14px 22px', borderTop: '1px solid #EFEFEF', marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 0 10px', fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#BEEBBE', display: 'inline-block', boxShadow: '0 0 0 3px rgba(190,235,190,0.5)' }} />
            Llamadas · {pendingCalls.length} pendiente{pendingCalls.length !== 1 ? 's' : ''}
          </div>
          {pendingCalls.map((call) => (
            <div key={call.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px dashed rgba(0,0,0,0.12)' }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {String(call.mesa).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Mesa {call.mesa} llama</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090' }}>
                  {call.tipo === 'cuenta' ? 'Pedir cuenta' : call.tipo === 'atencion' ? 'Atención' : 'Otro'}
                  {call.mensaje ? ` · ${call.mensaje}` : ''}
                </div>
              </div>
              <button
                onClick={(e) => handleAttendCall(call.id, e)}
                style={{ background: '#BEEBBE', color: '#0a3a0a', height: 28, padding: '0 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                Atender
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
