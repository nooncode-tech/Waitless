'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, formatTime, getTimeDiffMinutes } from '@/lib/store'
import {
  ArrowLeftRight,
  Merge,
  Scissors,
  DoorOpen,
  Clock,
  Receipt,
  Bell,
  LayoutGrid,
  List,
  Map,
  X,
  AlertTriangle,
} from 'lucide-react'
import { FloorMap } from './floor-map'

export function TablesManager() {
  const {
    tableSessions,
    getActiveTables,
    getPendingCalls,
    moveTableSession,
    mergeTableSessions,
    splitTableSession,
    closeTableSession,
  } = useApp()

  const [now, setNow] = useState(new Date())
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
  const [selectedMesa, setSelectedMesa] = useState<number | null>(null)

  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [splitSelectedOrders, setSplitSelectedOrders] = useState<string[]>([])
  const [splitTargetMesa, setSplitTargetMesa] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  void now

  const pendingCalls = getPendingCalls()
  const activeTables = getActiveTables()

  const getTableInfo = (mesa: number) => {
    const session = tableSessions.find(s => s.mesa === mesa && s.activa)
    const tableOrders = session?.orders?.filter(o => o.status !== 'cancelado') || []
    const activeOrders = tableOrders.filter(o => o.status !== 'entregado')
    const tableCalls = pendingCalls.filter(c => c.mesa === mesa)
    const paymentRequested =
      (session?.paymentStatus === 'pendiente' || session?.paymentStatus === 'parcial') ||
      tableCalls.some(c => c.tipo === 'cuenta')
    const hasAttentionCall = tableCalls.some(c => c.tipo === 'atencion' || c.tipo === 'otro')
    const elapsedMin = session ? getTimeDiffMinutes(session.createdAt) : 0
    const total = session?.total ?? 0

    if (!session) return { status: 'libre' as const, label: 'Libre', session: null, activeOrders: [], tableOrders: [], elapsedMin: 0, hasCall: false, hasBillRequest: false, hasReady: false, hasPreparing: false, total: 0 }

    const isPaid = session.billStatus === 'pagada'
    const hasReady = activeOrders.some(o => o.status === 'listo')
    const hasPreparing = activeOrders.some(o => o.status === 'preparando')

    const status = isPaid ? 'pagada' as const : hasReady ? 'listo' as const : hasPreparing ? 'preparando' as const : 'ocupada' as const

    const label = isPaid ? 'Pagada'
      : paymentRequested ? 'Solicita cuenta'
      : hasReady ? 'Listo — Entregar'
      : hasPreparing ? 'En cocina'
      : 'Ocupada'

    return { status, label, session, activeOrders, tableOrders, elapsedMin, hasCall: hasAttentionCall, hasBillRequest: paymentRequested, hasReady, hasPreparing, total }
  }

  const tableInfos = activeTables.map(t => ({ ...t, ...getTableInfo(t.numero) }))

  const selectedInfo = selectedMesa !== null ? getTableInfo(selectedMesa) : null
  const selectedSession = selectedInfo?.session ?? null

  const formatElapsed = (min: number) => {
    if (min < 1) return '< 1 min'
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}h ${m > 0 ? `${m}m` : ''}`
  }

  const getStatusStyle = (status: string, hasCall: boolean, hasBillRequest: boolean) => {
    if (status === 'libre') return { bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-300', text: 'text-gray-400' }
    if (status === 'pagada') return { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-[#06C167]', text: 'text-[#06C167]' }
    if (status === 'listo') return { bg: 'bg-emerald-50', border: 'border-[#06C167] border-2', dot: 'bg-[#06C167] animate-pulse', text: 'text-[#06C167]' }
    if (status === 'preparando') return { bg: 'bg-amber-50', border: 'border-amber-300', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-600' }
    if (hasBillRequest) return { bg: 'bg-amber-50', border: 'border-amber-400 border-2', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-600' }
    return { bg: 'bg-white', border: 'border-gray-200', dot: 'bg-gray-900', text: 'text-gray-900' }
  }

  const freeTables = activeTables.filter(
    t => t.numero !== selectedMesa && !tableSessions.some(s => s.mesa === t.numero && s.activa)
  )
  const otherActiveSessions = tableSessions.filter(s => s.activa && s.mesa !== selectedMesa)

  const isPaid = selectedSession?.billStatus === 'pagada'
  const canClose =
    selectedSession &&
    ((isPaid && (selectedInfo?.activeOrders.length ?? 0) === 0) ||
      (selectedInfo?.tableOrders.length ?? 0) === 0)

  const freeCount = tableInfos.filter(t => t.status === 'libre').length
  const readyCount = tableInfos.filter(t => t.status === 'listo').length
  const preparingCount = tableInfos.filter(t => t.status === 'preparando').length
  const occupiedCount = tableInfos.filter(t => t.status === 'ocupada' || t.status === 'pagada').length

  const statusOrderBadge = (status: string) => {
    if (status === 'entregado' || status === 'listo') return 'bg-emerald-50 text-[#06C167]'
    if (status === 'cancelado') return 'bg-red-50 text-red-500'
    if (status === 'preparando') return 'bg-amber-50 text-amber-600'
    return 'bg-gray-100 text-gray-500'
  }
  const statusOrderLabel = (status: string) => {
    if (status === 'entregado') return 'Entregado'
    if (status === 'listo') return 'Listo'
    if (status === 'cancelado') return 'Cancelado'
    if (status === 'preparando') return 'Preparando'
    return 'Cola'
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      {/* Left — table grid */}
      <div className="flex-1 overflow-auto p-3">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Libres', value: freeCount, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200' },
            { label: 'En cocina', value: preparingCount, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
            { label: 'Listos', value: readyCount, color: 'text-[#06C167]', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { label: 'Ocupadas', value: occupiedCount, color: 'text-gray-900', bg: 'bg-white', border: 'border-gray-200' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-2xl p-3 border ${stat.bg} ${stat.border}`}>
              <p className={`text-2xl font-black leading-none ${stat.color}`} style={{ letterSpacing: '-0.03em' }}>{stat.value}</p>
              <p className={`text-[11px] font-semibold mt-1 ${stat.color}`}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* View toggle + legend */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { color: 'bg-gray-300', label: 'Libre' },
              { color: 'bg-gray-900', label: 'Ocupada' },
              { color: 'bg-amber-400', label: 'En cocina' },
              { color: 'bg-[#06C167]', label: 'Listo' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${l.color}`} />
                <span className="text-[11px] text-gray-500 font-medium">{l.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { mode: 'grid', icon: <LayoutGrid className="h-3.5 w-3.5" />, title: 'Grilla' },
              { mode: 'list', icon: <List className="h-3.5 w-3.5" />, title: 'Lista' },
              { mode: 'map', icon: <Map className="h-3.5 w-3.5" />, title: 'Plano' },
            ].map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode as typeof viewMode)} title={v.title}
                className={`p-1.5 rounded-lg transition-all ${viewMode === v.mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                {v.icon}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'map' ? (
          <FloorMap />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {tableInfos.map(info => {
              const style = getStatusStyle(info.status, info.hasCall, info.hasBillRequest)
              const isSelected = selectedMesa === info.numero
              return (
                <button
                  key={info.id}
                  onClick={() => setSelectedMesa(isSelected ? null : info.numero)}
                  className={`relative flex flex-col items-center justify-between rounded-2xl border transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-95 p-3 aspect-square ${style.bg} ${style.border} ${(info.hasCall || info.hasBillRequest) ? 'ring-2 ring-red-400 ring-offset-1' : ''} ${isSelected ? 'ring-2 ring-black ring-offset-1' : ''}`}
                >
                  {(info.hasCall || info.hasBillRequest) && (
                    <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 z-10">
                      {info.hasCall && (
                        <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                          <Bell className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                      {info.hasBillRequest && !info.hasCall && (
                        <span className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                          <Receipt className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                    </div>
                  )}
                  <div className="w-full flex justify-end">
                    <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xl font-black text-gray-900" style={{ letterSpacing: '-0.03em' }}>{info.numero}</span>
                  </div>
                  <div className="w-full">
                    {info.status === 'libre' ? (
                      <p className="text-[10px] text-gray-400 text-center font-semibold">Libre</p>
                    ) : info.elapsedMin > 0 ? (
                      <p className={`text-[9px] font-bold text-center flex items-center justify-center gap-0.5 ${style.text}`}>
                        <Clock className="h-2 w-2" />{formatElapsed(info.elapsedMin)}
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {tableInfos.map(info => {
              const style = getStatusStyle(info.status, info.hasCall, info.hasBillRequest)
              const isSelected = selectedMesa === info.numero
              return (
                <button
                  key={info.id}
                  onClick={() => setSelectedMesa(isSelected ? null : info.numero)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all hover:shadow-sm active:scale-[0.99] text-left ${style.bg} ${style.border} ${(info.hasCall || info.hasBillRequest) ? 'ring-1 ring-red-400' : ''} ${isSelected ? 'ring-2 ring-black' : ''}`}
                >
                  <div className={`w-3 h-3 rounded-full shrink-0 ${style.dot}`} />
                  <span className="text-sm font-black text-gray-900 w-14 shrink-0">Mesa {info.numero}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${style.text}`}>{info.label}</p>
                    {info.activeOrders.length > 0 && (
                      <p className="text-[11px] text-gray-400">{info.activeOrders.length} pedido{info.activeOrders.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  {info.elapsedMin > 0 && (
                    <div className={`flex items-center gap-1 text-xs font-semibold shrink-0 ${style.text}`}>
                      <Clock className="h-3.5 w-3.5" />{formatElapsed(info.elapsedMin)}
                    </div>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    {info.hasCall && <Bell className="h-4 w-4 text-red-500" />}
                    {info.hasBillRequest && <Receipt className="h-4 w-4 text-amber-500" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right — selected table detail panel */}
      {selectedMesa !== null && selectedInfo && (
        <div className="w-72 shrink-0 border-l border-gray-100 bg-white overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>Mesa {selectedMesa}</h2>
              <p className={`text-xs font-bold mt-0.5 ${getStatusStyle(selectedInfo.status, selectedInfo.hasCall, selectedInfo.hasBillRequest).text}`}>
                {selectedInfo.label}
              </p>
            </div>
            <button onClick={() => setSelectedMesa(null)} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedSession ? (
            <>
              <div className="px-5 py-4 space-y-2 border-b border-gray-100">
                {[
                  { label: 'Abierta', value: formatTime(selectedSession.createdAt) },
                  { label: 'Pedidos activos', value: String(selectedInfo.activeOrders.length) },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium">{row.label}</span>
                    <span className="text-xs font-semibold text-gray-900">{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-1">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-sm font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>{formatPrice(selectedInfo.total)}</span>
                </div>
              </div>

              {selectedInfo.tableOrders.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Pedidos</p>
                  <div className="space-y-2">
                    {selectedInfo.tableOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-700 truncate flex-1">
                          #{order.numero} — {order.items.map(i => `${i.cantidad}x ${i.menuItem.nombre}`).join(', ').slice(0, 25)}{order.items.map(i => i.menuItem.nombre).join('').length > 25 ? '…' : ''}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusOrderBadge(order.status)}`}>
                          {statusOrderLabel(order.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-5 py-4 space-y-2 flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Acciones</p>
                {!isPaid && (
                  <button onClick={() => setShowMoveDialog(true)}
                    className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <ArrowLeftRight className="h-4 w-4 text-gray-400 shrink-0" />Mover mesa a...
                  </button>
                )}
                {!isPaid && (
                  <button onClick={() => setShowMergeDialog(true)}
                    disabled={otherActiveSessions.length === 0}
                    className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Merge className="h-4 w-4 text-gray-400 shrink-0" />Unir con mesa...
                  </button>
                )}
                {!isPaid && selectedInfo.activeOrders.length > 1 && (
                  <button onClick={() => { setSplitSelectedOrders([]); setSplitTargetMesa(null); setShowSplitDialog(true) }}
                    className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <Scissors className="h-4 w-4 text-gray-400 shrink-0" />Separar pedidos...
                  </button>
                )}
                {canClose && (
                  <button onClick={() => setShowCloseConfirm(true)}
                    className="w-full h-10 flex items-center gap-2.5 px-3.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors mt-2">
                    <DoorOpen className="h-4 w-4 shrink-0" />Cerrar mesa
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <p className="text-sm text-gray-400">Mesa libre — sin sesión activa</p>
            </div>
          )}
        </div>
      )}

      {/* Move Modal */}
      {showMoveDialog && selectedMesa !== null && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900">Mover Mesa {selectedMesa}</h3>
              <button onClick={() => setShowMoveDialog(false)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">Selecciona la mesa destino (solo libres)</p>
            <div className="grid grid-cols-4 gap-2">
              {freeTables.map(t => (
                <button key={t.numero}
                  className="h-11 rounded-xl border border-gray-200 text-sm font-black text-gray-900 hover:bg-gray-50 transition-colors"
                  onClick={() => { moveTableSession(selectedSession.id, t.numero); setShowMoveDialog(false); setSelectedMesa(t.numero) }}>
                  {t.numero}
                </button>
              ))}
            </div>
            {freeTables.length === 0 && <p className="text-sm text-center text-gray-400 py-2">No hay mesas libres</p>}
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeDialog && selectedMesa !== null && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900">Unir con Mesa {selectedMesa}</h3>
              <button onClick={() => setShowMergeDialog(false)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">Los pedidos se traen a Mesa {selectedMesa}.</p>
            <div className="grid grid-cols-4 gap-2">
              {otherActiveSessions.map(s => (
                <button key={s.id}
                  className="h-11 rounded-xl border border-gray-200 text-sm font-black text-gray-900 hover:bg-gray-50 transition-colors"
                  onClick={() => { mergeTableSessions(selectedSession.id, s.id); setShowMergeDialog(false) }}>
                  {s.mesa}
                </button>
              ))}
            </div>
            {otherActiveSessions.length === 0 && <p className="text-sm text-center text-gray-400 py-2">No hay otras mesas activas</p>}
          </div>
        </div>
      )}

      {/* Split Modal */}
      {showSplitDialog && selectedMesa !== null && selectedSession && selectedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900">Separar pedidos — Mesa {selectedMesa}</h3>
              <button onClick={() => setShowSplitDialog(false)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">Selecciona pedidos a mover y la mesa destino (libre).</p>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {selectedInfo.activeOrders.map(order => (
                <label key={order.id} className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded accent-gray-900"
                    checked={splitSelectedOrders.includes(order.id)}
                    onChange={(e) => {
                      setSplitSelectedOrders(prev => e.target.checked ? [...prev, order.id] : prev.filter(id => id !== order.id))
                    }}
                  />
                  <div className="text-xs">
                    <p className="font-bold text-gray-900">Pedido #{order.numero}</p>
                    <p className="text-gray-400 mt-0.5">{order.items.map(i => `${i.cantidad}x ${i.menuItem.nombre}`).join(', ')}</p>
                  </div>
                </label>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Mesa destino:</p>
              <div className="grid grid-cols-5 gap-1.5">
                {freeTables.map(t => (
                  <button key={t.numero} onClick={() => setSplitTargetMesa(t.numero)}
                    className={`h-10 rounded-xl text-sm font-black transition-all ${splitTargetMesa === t.numero ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-900 hover:bg-gray-50'}`}>
                    {t.numero}
                  </button>
                ))}
                {freeTables.length === 0 && <p className="col-span-5 text-xs text-center text-gray-400 py-2">No hay mesas libres</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSplitDialog(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button
                disabled={splitSelectedOrders.length === 0 || splitTargetMesa === null}
                onClick={() => { if (splitTargetMesa !== null) { splitTableSession(selectedSession.id, splitSelectedOrders, splitTargetMesa); setShowSplitDialog(false); setSplitSelectedOrders([]) } }}
                className="flex-1 h-11 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-bold disabled:opacity-40 transition-colors">
                Separar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirm */}
      {showCloseConfirm && selectedMesa !== null && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>Cerrar Mesa {selectedMesa}</h3>
            <p className="text-sm text-gray-500 mb-5">Esta acción cierra la sesión activa. El siguiente cliente podrá iniciar una nueva sesión.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCloseConfirm(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={() => { closeTableSession(selectedSession.id); setShowCloseConfirm(false); setSelectedMesa(null) }}
                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
                Cerrar mesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
