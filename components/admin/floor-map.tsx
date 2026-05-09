'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { getTimeDiffMinutes } from '@/lib/store'
import type { TableConfig } from '@/lib/store'
import { Save, Clock } from 'lucide-react'

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

function getStatusColors(status: TableStatus) {
  switch (status) {
    case 'libre':
      return { bg: 'bg-gray-200', border: 'border-gray-300', dot: 'bg-gray-400', text: 'text-gray-500', label: 'Libre' }
    case 'ocupada':
      return { bg: 'bg-gray-800', border: 'border-gray-900', dot: 'bg-white', text: 'text-gray-200', label: 'Ocupada' }
    case 'preparando':
      return { bg: 'bg-amber-100', border: 'border-amber-500', dot: 'bg-amber-500', text: 'text-amber-700', label: 'En cocina' }
    case 'listo':
      return { bg: 'bg-emerald-100', border: 'border-emerald-500', dot: 'bg-emerald-500', text: 'text-[#06C167]', label: 'Listo' }
    case 'pagada':
      return { bg: 'bg-emerald-50', border: 'border-emerald-400', dot: 'bg-emerald-400', text: 'text-[#06C167]', label: 'Pagada' }
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
    { dot: 'bg-gray-400', label: 'Libre' },
    { dot: 'bg-gray-800', label: 'Ocupada' },
    { dot: 'bg-amber-500', label: 'En cocina' },
    { dot: 'bg-emerald-500', label: 'Listo' },
    { dot: 'bg-emerald-400', label: 'Pagada' },
  ]

  return (
    <div className="flex flex-col h-full gap-3 p-3 overflow-auto" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${l.dot}`} />
              <span className="text-[11px] text-gray-500">{l.label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={movedTables.size === 0}
          className="h-8 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          Guardar posiciones
          {movedTables.size > 0 && (
            <span className="ml-1 bg-white/20 text-white rounded-full px-1.5 text-[10px] font-bold">{movedTables.size}</span>
          )}
        </button>
      </div>

      <p className="text-[11px] text-gray-400 -mt-1">Arrastrá las mesas para reposicionarlas. Hacé clic para seleccionar.</p>

      <div
        ref={canvasRef}
        className="relative bg-gray-100 rounded-xl border border-dashed border-gray-300 w-full"
        style={{ minHeight: '500px', userSelect: 'none', cursor: isDragging ? 'grabbing' : 'default' }}
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
              className={`absolute flex flex-col items-center justify-between w-16 h-16 rounded-xl border-2 p-1.5 shadow-sm transition-shadow duration-150 cursor-grab active:cursor-grabbing ${colors.bg} ${colors.border} ${isSelected ? 'ring-2 ring-gray-900 ring-offset-1' : ''} ${hasMoved ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
              style={{ left: `${posX}%`, top: `${posY}%`, transform: 'translate(-50%, -50%)', touchAction: 'none' }}
              onMouseDown={e => handleMouseDown(e, table.id, posX, posY)}
            >
              <div className="w-full flex justify-end">
                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              </div>
              <span className={`text-base font-bold leading-none ${status === 'ocupada' ? 'text-white' : 'text-gray-800'}`}>
                {table.numero}
              </span>
              <div className="w-full flex justify-center">
                {status === 'libre' ? (
                  <span className={`text-[8px] font-medium ${colors.text}`}>Libre</span>
                ) : elapsedMin > 0 ? (
                  <span className={`text-[8px] font-semibold flex items-center gap-0.5 ${status === 'ocupada' ? 'text-gray-300' : colors.text}`}>
                    <Clock className="h-2 w-2" />
                    {formatElapsed(elapsedMin)}
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}

        {activeTables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-400">No hay mesas configuradas</p>
          </div>
        )}
      </div>
    </div>
  )
}
