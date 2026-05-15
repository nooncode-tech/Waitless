'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { getTimeDiffMinutes } from '@/lib/store'
import type { TableConfig } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

type TableStatus = 'libre' | 'ocupada' | 'preparando' | 'listo' | 'pagada'

interface TableRenderInfo {
  table: TableConfig
  status: TableStatus
  elapsedMin: number
}

interface DragState {
  dragging: boolean
  tableId: string | null
  startMouseX: number
  startMouseY: number
  startPosX: number
  startPosY: number
}

interface FloorMapProps {
  onSelectTable?: (tableId: string | null) => void
}

function getStatusColors(status: TableStatus): { bg: string; border: string; dot: string; text: string; label: string } {
  switch (status) {
    case 'libre':
      return { bg: '#e5e7eb', border: '#d1d5db', dot: '#9ca3af', text: '#9ca3af', label: 'Libre' }
    case 'ocupada':
      return { bg: '#1f2937', border: '#111827', dot: '#fff', text: '#e5e7eb', label: 'Ocupada' }
    case 'preparando':
      return { bg: '#fef3c7', border: '#f59e0b', dot: '#f59e0b', text: '#d97706', label: 'En cocina' }
    case 'listo':
      return { bg: MINT + '88', border: MINT_DEEP, dot: MINT_DEEP, text: MINT_DEEP, label: 'Listo' }
    case 'pagada':
      return { bg: MINT + '44', border: MINT, dot: MINT_DEEP, text: MINT_DEEP, label: 'Pagada' }
  }
}

function formatElapsed(min: number): string {
  if (min < 1) return '< 1 min'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h${m > 0 ? `${m}m` : ''}`
}

function defaultPosition(index: number, total: number): { posX: number; posY: number } {
  const cols = 4
  const rows = Math.ceil(total / cols)
  const col = index % cols
  const row = Math.floor(index / cols)
  const marginX = 10, marginY = 10, rangeX = 80, rangeY = 80
  const posX = cols <= 1 ? 50 : marginX + (col / (cols - 1)) * rangeX
  const posY = rows <= 1 ? 50 : marginY + (row / (rows - 1)) * rangeY
  return { posX, posY }
}

export function FloorMap({ onSelectTable }: FloorMapProps) {
  const { getActiveTables, tableSessions, getPendingCalls, updateTable } = useApp()

  const activeTables = useMemo(() => getActiveTables(), [getActiveTables])
  const pendingCalls = useMemo(() => getPendingCalls(), [getPendingCalls])

  const [localPositions, setLocalPositions] = useState<Record<string, { posX: number; posY: number }>>({})
  const [movedTables, setMovedTables] = useState<Set<string>>(new Set())
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const dragRef = useRef<DragState>({
    dragging: false, tableId: null,
    startMouseX: 0, startMouseY: 0, startPosX: 0, startPosY: 0,
  })
  const canvasRef = useRef<HTMLDivElement>(null)

  const tableRenderInfos: TableRenderInfo[] = activeTables.map((table) => {
    const session = tableSessions.find(s => s.mesa === table.numero && s.activa)
    const activeOrders = session?.orders?.filter(o => o.status !== 'cancelado' && o.status !== 'entregado') ?? []
    const tableCalls = pendingCalls.filter(c => c.mesa === table.numero)

    let status: TableStatus = 'libre'
    if (session) {
      const isPaid = session.billStatus === 'pagada'
      const hasReady = activeOrders.some(o => o.status === 'listo')
      const hasPreparing = activeOrders.some(o => o.status === 'preparando')
      if (isPaid) status = 'pagada'
      else if (hasReady) status = 'listo'
      else if (hasPreparing) status = 'preparando'
      else status = 'ocupada'
    }

    void tableCalls
    const elapsedMin = session ? getTimeDiffMinutes(session.createdAt) : 0
    return { table, status, elapsedMin }
  })

  const activeTablesCount = activeTables.length
  const resolvePosition = useCallback(
    (table: TableConfig, idx: number): { posX: number; posY: number } => {
      if (localPositions[table.id]) return localPositions[table.id]
      if (table.posX !== undefined && table.posY !== undefined) return { posX: table.posX, posY: table.posY }
      return defaultPosition(idx, activeTablesCount)
    },
    [localPositions, activeTablesCount]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tableId: string, currentPosX: number, currentPosY: number) => {
      e.preventDefault(); e.stopPropagation()
      dragRef.current = { dragging: true, tableId, startMouseX: e.clientX, startMouseY: e.clientY, startPosX: currentPosX, startPosY: currentPosY }
      setIsDragging(true)
    }, []
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current
    if (!drag.dragging || !drag.tableId || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const deltaXPct = ((e.clientX - drag.startMouseX) / rect.width) * 100
    const deltaYPct = ((e.clientY - drag.startMouseY) / rect.height) * 100
    const newPosX = Math.min(100, Math.max(0, drag.startPosX + deltaXPct))
    const newPosY = Math.min(100, Math.max(0, drag.startPosY + deltaYPct))
    setLocalPositions(prev => ({ ...prev, [drag.tableId!]: { posX: newPosX, posY: newPosY } }))
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current
    if (!drag.dragging || !drag.tableId) { dragRef.current.dragging = false; setIsDragging(false); return }
    const didMove = Math.abs(e.clientX - drag.startMouseX) > 4 || Math.abs(e.clientY - drag.startMouseY) > 4
    if (didMove) {
      setMovedTables(prev => new Set([...prev, drag.tableId!]))
    } else {
      setSelectedTableId(prev => {
        const next = prev === drag.tableId ? null : drag.tableId
        onSelectTable?.(next)
        return next
      })
    }
    dragRef.current.dragging = false; dragRef.current.tableId = null; setIsDragging(false)
  }, [onSelectTable])

  const handleMouseLeave = useCallback(() => {
    if (dragRef.current.dragging) { dragRef.current.dragging = false; dragRef.current.tableId = null; setIsDragging(false) }
  }, [])

  const handleSave = useCallback(() => {
    movedTables.forEach(tableId => {
      const pos = localPositions[tableId]
      if (pos) updateTable(tableId, { posX: Math.round(pos.posX * 10) / 10, posY: Math.round(pos.posY * 10) / 10 })
    })
    setMovedTables(new Set())
  }, [movedTables, localPositions, updateTable])

  void now

  const LEGEND = [
    { dot: '#9ca3af', label: 'Libre' },
    { dot: '#1f2937', label: 'Ocupada' },
    { dot: '#f59e0b', label: 'En cocina' },
    { dot: MINT_DEEP, label: 'Listo' },
    { dot: MINT, label: 'Pagada' },
  ]

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 12, padding: 12, height: '100%', overflow: 'auto' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.dot, flexShrink: 0 }} />
              <span style={{ fontFamily: FONT, fontSize: 11, color: '#6b7280' }}>{l.label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={movedTables.size === 0}
          style={{
            fontFamily: FONT,
            height: 32,
            padding: '0 12px',
            borderRadius: 10,
            background: '#111',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: movedTables.size === 0 ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            opacity: movedTables.size === 0 ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          ✓ Guardar posiciones
          {movedTables.size > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{movedTables.size}</span>
          )}
        </button>
      </div>

      <p style={{ fontFamily: FONT, fontSize: 11, color: '#9ca3af', margin: '-4px 0 0' }}>Arrastrá las mesas para reposicionarlas. Hacé clic para seleccionar.</p>

      {/* Canvas */}
      <div
        ref={canvasRef}
        style={{
          position: 'relative',
          background: '#f3f4f6',
          borderRadius: 10,
          border: '1px dashed #d1d5db',
          width: '100%',
          minHeight: 500,
          userSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {tableRenderInfos.map(({ table, status, elapsedMin }, idx) => {
          const { posX, posY } = resolvePosition(table, idx)
          const colors = getStatusColors(status)
          const isSelected = selectedTableId === table.id
          const hasMoved = movedTables.has(table.id)

          return (
            <div
              key={table.id}
              style={{
                position: 'absolute',
                left: `${posX}%`,
                top: `${posY}%`,
                transform: 'translate(-50%, -50%)',
                width: 64,
                height: 64,
                borderRadius: 10,
                border: `2px solid ${colors.border}`,
                background: colors.bg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 6,
                boxShadow: isSelected
                  ? '0 0 0 3px #111, 0 0 0 5px rgba(0,0,0,0.1)'
                  : hasMoved
                    ? '0 0 0 3px #60a5fa, 0 0 0 5px rgba(96,165,250,0.2)'
                    : '0 1px 3px rgba(0,0,0,0.1)',
                touchAction: 'none',
                cursor: 'grab',
                boxSizing: 'border-box',
              }}
              onMouseDown={e => handleMouseDown(e, table.id, posX, posY)}
            >
              <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.dot }} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, color: status === 'ocupada' ? '#fff' : '#1f2937' }}>
                {table.numero}
              </span>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                {status === 'libre' ? (
                  <span style={{ fontSize: 8, fontWeight: 500, color: colors.text }}>Libre</span>
                ) : elapsedMin > 0 ? (
                  <span style={{ fontSize: 8, fontWeight: 600, color: status === 'ocupada' ? '#d1d5db' : colors.text, display: 'flex', alignItems: 'center', gap: 2 }}>
                    ⏱ {formatElapsed(elapsedMin)}
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}

        {activeTables.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: 13, color: '#9ca3af' }}>Ø No hay mesas configuradas</p>
          </div>
        )}
      </div>
    </div>
  )
}
