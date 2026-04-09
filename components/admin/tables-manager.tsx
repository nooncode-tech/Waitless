'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, formatTime, getTimeDiffMinutes } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  ArrowLeftRight,
  Merge,
  Scissors,
  DoorOpen,
  Clock,
  Receipt,
  Bell,
  ChefHat,
  CircleCheck,
  LayoutGrid,
  List,
  Map,
  X,
  AlertTriangle,
  Users,
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

  // Merge / split / move / close dialogs
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

    const status = isPaid
      ? 'pagada' as const
      : hasReady
      ? 'listo' as const
      : hasPreparing
      ? 'preparando' as const
      : 'ocupada' as const

    const label = isPaid
      ? 'Pagada'
      : paymentRequested
      ? 'Solicita cuenta'
      : hasReady
      ? 'Listo — Entregar'
      : hasPreparing
      ? 'En cocina'
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
    if (status === 'libre') return { bg: 'bg-white', border: 'border-[#E5E5E5]', dot: 'bg-[#BEBEBE]', text: 'text-[#BEBEBE]' }
    if (status === 'pagada') return { bg: 'bg-[#F0FDF4]', border: 'border-[#16A34A]', dot: 'bg-[#16A34A]', text: 'text-[#16A34A]' }
    if (status === 'listo') return { bg: 'bg-[#F0FDF4]', border: 'border-[#16A34A] border-2', dot: 'bg-[#16A34A] animate-pulse', text: 'text-[#16A34A]' }
    if (status === 'preparando') return { bg: 'bg-[#FFFBEB]', border: 'border-[#D97706]', dot: 'bg-[#D97706] animate-pulse', text: 'text-[#D97706]' }
    if (hasBillRequest) return { bg: 'bg-[#FFFBEB]', border: 'border-[#D97706] border-2', dot: 'bg-[#D97706] animate-pulse', text: 'text-[#D97706]' }
    return { bg: 'bg-[#F2F2F2]', border: 'border-[#BEBEBE]', dot: 'bg-black', text: 'text-black' }
  }

  const freeTables = activeTables.filter(
    t => t.numero !== selectedMesa && !tableSessions.some(s => s.mesa === t.numero && s.activa)
  )
  const otherActiveSessions = tableSessions.filter(
    s => s.activa && s.mesa !== selectedMesa
  )

  const isPaid = selectedSession?.billStatus === 'pagada'
  const canClose =
    selectedSession &&
    ((isPaid && (selectedInfo?.activeOrders.length ?? 0) === 0) ||
      (selectedInfo?.tableOrders.length ?? 0) === 0)

  const freeCount = tableInfos.filter(t => t.status === 'libre').length
  const readyCount = tableInfos.filter(t => t.status === 'listo').length
  const preparingCount = tableInfos.filter(t => t.status === 'preparando').length
  const occupiedCount = tableInfos.filter(t => t.status === 'ocupada' || t.status === 'pagada').length

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — table grid */}
      <div className="flex-1 overflow-auto p-3">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Libres', value: freeCount, color: 'text-[#BEBEBE]', bg: 'bg-[#F2F2F2]' },
            { label: 'En cocina', value: preparingCount, color: 'text-[#D97706]', bg: 'bg-[#FFFBEB]' },
            { label: 'Listos', value: readyCount, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4]' },
            { label: 'Ocupadas', value: occupiedCount, color: 'text-black', bg: 'bg-[#F2F2F2]' },
          ].map(stat => (
            <div key={stat.label} className={cn('rounded-lg p-2', stat.bg)}>
              <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
              <p className={cn('text-[10px] font-medium', stat.color)}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* View toggle + legend */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { dot: 'bg-[#BEBEBE]', label: 'Libre' },
              { dot: 'bg-black', label: 'Ocupada' },
              { dot: 'bg-[#D97706]', label: 'En cocina' },
              { dot: 'bg-[#16A34A]', label: 'Listo' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={cn('w-2 h-2 rounded-full', l.dot)} />
                <span className="text-[10px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setViewMode('grid')} className={cn('p-1 rounded', viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-muted-foreground')} title="Vista grilla">
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode('list')} className={cn('p-1 rounded', viewMode === 'list' ? 'bg-white shadow-sm' : 'text-muted-foreground')} title="Vista lista">
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode('map')} className={cn('p-1 rounded', viewMode === 'map' ? 'bg-white shadow-sm' : 'text-muted-foreground')} title="Plano del salón">
              <Map className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Grid / List / Map */}
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
                  className={cn(
                    'relative flex flex-col items-center justify-between rounded-xl border transition-all duration-150',
                    'hover:shadow-md hover:-translate-y-0.5 active:scale-95 p-3 aspect-square',
                    style.bg, style.border,
                    (info.hasCall || info.hasBillRequest) && 'ring-2 ring-red-500 ring-offset-1',
                    isSelected && 'ring-2 ring-primary ring-offset-1'
                  )}
                >
                  {(info.hasCall || info.hasBillRequest) && (
                    <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 z-10">
                      {info.hasCall && (
                        <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow">
                          <Bell className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                      {info.hasBillRequest && !info.hasCall && (
                        <span className="w-5 h-5 bg-[#D97706] rounded-full flex items-center justify-center shadow">
                          <Receipt className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                    </div>
                  )}
                  <div className="w-full flex justify-end">
                    <div className={cn('w-2 h-2 rounded-full', style.dot)} />
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-lg font-bold text-black">{info.numero}</span>
                  </div>
                  <div className="w-full">
                    {info.status === 'libre' ? (
                      <p className="text-[9px] text-[#BEBEBE] text-center font-medium">Libre</p>
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
          <div className="space-y-1.5">
            {tableInfos.map(info => {
              const style = getStatusStyle(info.status, info.hasCall, info.hasBillRequest)
              const isSelected = selectedMesa === info.numero
              return (
                <button
                  key={info.id}
                  onClick={() => setSelectedMesa(isSelected ? null : info.numero)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
                    'hover:shadow-sm active:scale-[0.99] text-left',
                    style.bg, style.border,
                    (info.hasCall || info.hasBillRequest) && 'ring-1 ring-red-400',
                    isSelected && 'ring-2 ring-primary'
                  )}
                >
                  <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', style.dot)} />
                  <span className="text-sm font-bold text-black w-14 shrink-0">Mesa {info.numero}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-semibold', style.text)}>{info.label}</p>
                    {info.activeOrders.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">{info.activeOrders.length} pedido{info.activeOrders.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  {info.elapsedMin > 0 && (
                    <div className={cn('flex items-center gap-1 text-xs font-medium shrink-0', style.text)}>
                      <Clock className="h-3 w-3" />
                      {formatElapsed(info.elapsedMin)}
                    </div>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    {info.hasCall && <Bell className="h-3.5 w-3.5 text-red-500" />}
                    {info.hasBillRequest && <Receipt className="h-3.5 w-3.5 text-[#D97706]" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right — selected table detail panel */}
      {selectedMesa !== null && selectedInfo && (
        <div className="w-72 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="text-base font-bold">Mesa {selectedMesa}</h2>
              <p className={cn('text-xs font-medium', getStatusStyle(selectedInfo.status, selectedInfo.hasCall, selectedInfo.hasBillRequest).text)}>
                {selectedInfo.label}
              </p>
            </div>
            <button onClick={() => setSelectedMesa(null)} className="p-1 rounded hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {selectedSession ? (
            <>
              {/* Session info */}
              <div className="p-4 space-y-1 border-b border-border">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Abierta</span>
                  <span>{formatTime(selectedSession.createdAt)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pedidos activos</span>
                  <span>{selectedInfo.activeOrders.length}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(selectedInfo.total)}</span>
                </div>
              </div>

              {/* Orders summary */}
              {selectedInfo.tableOrders.length > 0 && (
                <div className="p-4 border-b border-border">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Pedidos</p>
                  <div className="space-y-1">
                    {selectedInfo.tableOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between text-xs">
                        <span>#{order.numero} — {order.items.map(i => `${i.cantidad}x ${i.menuItem.nombre}`).join(', ').slice(0, 30)}{order.items.map(i => i.menuItem.nombre).join('').length > 30 ? '…' : ''}</span>
                        <Badge variant="outline" className={cn('text-[9px] h-4 ml-1 shrink-0', order.status === 'entregado' ? 'text-[#16A34A]' : order.status === 'listo' ? 'text-[#16A34A]' : order.status === 'cancelado' ? 'text-red-500' : 'text-[#D97706]')}>
                          {order.status === 'entregado' ? 'Entregado' : order.status === 'listo' ? 'Listo' : order.status === 'cancelado' ? 'Cancelado' : order.status === 'preparando' ? 'Preparando' : 'Cola'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 space-y-2 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Acciones</p>

                {/* Move */}
                {!isPaid && (
                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs justify-start gap-2 bg-transparent"
                    onClick={() => setShowMoveDialog(true)}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    Mover mesa a...
                  </Button>
                )}

                {/* Merge */}
                {!isPaid && (
                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs justify-start gap-2 bg-transparent"
                    onClick={() => setShowMergeDialog(true)}
                    disabled={otherActiveSessions.length === 0}
                    title={otherActiveSessions.length === 0 ? 'No hay otras mesas activas' : undefined}
                  >
                    <Merge className="h-4 w-4" />
                    Unir con mesa...
                  </Button>
                )}

                {/* Split */}
                {!isPaid && selectedInfo.activeOrders.length > 1 && (
                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs justify-start gap-2 bg-transparent"
                    onClick={() => { setSplitSelectedOrders([]); setSplitTargetMesa(null); setShowSplitDialog(true) }}
                  >
                    <Scissors className="h-4 w-4" />
                    Separar pedidos...
                  </Button>
                )}

                {/* Close */}
                {canClose && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs justify-start gap-2 border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
                      onClick={() => setShowCloseConfirm(true)}
                    >
                      <DoorOpen className="h-4 w-4" />
                      Cerrar mesa
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <p className="text-sm text-muted-foreground">Mesa libre — sin sesión activa</p>
            </div>
          )}
        </div>
      )}

      {/* ── Move Dialog ─────────────────────────────── */}
      {showMoveDialog && selectedMesa !== null && selectedSession && (
        <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Mover Mesa {selectedMesa}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-3">Selecciona la mesa destino (solo mesas libres)</p>
            <div className="grid grid-cols-4 gap-2">
              {freeTables.map(t => (
                <Button
                  key={t.numero}
                  variant="outline"
                  className="h-10 font-semibold"
                  onClick={() => {
                    moveTableSession(selectedSession.id, t.numero)
                    setShowMoveDialog(false)
                    setSelectedMesa(t.numero)
                  }}
                >
                  {t.numero}
                </Button>
              ))}
            </div>
            {freeTables.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">No hay mesas libres disponibles</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── Merge Dialog ─────────────────────────────── */}
      {showMergeDialog && selectedMesa !== null && selectedSession && (
        <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Unir con Mesa {selectedMesa}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-3">
              Los pedidos de la mesa seleccionada se traen a Mesa {selectedMesa}.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {otherActiveSessions.map(s => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="h-10 font-semibold"
                  onClick={() => {
                    mergeTableSessions(selectedSession.id, s.id)
                    setShowMergeDialog(false)
                  }}
                >
                  {s.mesa}
                </Button>
              ))}
            </div>
            {otherActiveSessions.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">No hay otras mesas activas</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── Split Dialog ─────────────────────────────── */}
      {showSplitDialog && selectedMesa !== null && selectedSession && selectedInfo && (
        <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Separar pedidos — Mesa {selectedMesa}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-3">
              Selecciona los pedidos a mover y la mesa destino (debe estar libre).
            </p>
            {/* Order checkboxes */}
            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
              {selectedInfo.activeOrders.map(order => (
                <label key={order.id} className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={splitSelectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => {
                      setSplitSelectedOrders(prev =>
                        checked ? [...prev, order.id] : prev.filter(id => id !== order.id)
                      )
                    }}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <p className="font-medium">Pedido #{order.numero}</p>
                    <p className="text-muted-foreground">
                      {order.items.map(i => `${i.cantidad}x ${i.menuItem.nombre}`).join(', ')}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {/* Free table selector */}
            <p className="text-xs font-medium mb-2">Mesa destino:</p>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {freeTables.map(t => (
                <Button
                  key={t.numero}
                  variant={splitTargetMesa === t.numero ? 'default' : 'outline'}
                  className="h-9 text-xs font-semibold"
                  onClick={() => setSplitTargetMesa(t.numero)}
                >
                  {t.numero}
                </Button>
              ))}
              {freeTables.length === 0 && (
                <p className="col-span-5 text-xs text-center text-muted-foreground py-2">No hay mesas libres</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowSplitDialog(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary"
                disabled={splitSelectedOrders.length === 0 || splitTargetMesa === null}
                onClick={() => {
                  if (splitTargetMesa !== null) {
                    splitTableSession(selectedSession.id, splitSelectedOrders, splitTargetMesa)
                    setShowSplitDialog(false)
                    setSplitSelectedOrders([])
                  }
                }}
              >
                Separar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Close Confirm ─────────────────────────────── */}
      {showCloseConfirm && selectedMesa !== null && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-3" />
              <h3 className="text-lg font-bold mb-1">Cerrar Mesa {selectedMesa}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Esta acción cierra la sesión activa. El siguiente cliente podrá iniciar una nueva sesión.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowCloseConfirm(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    closeTableSession(selectedSession.id)
                    setShowCloseConfirm(false)
                    setSelectedMesa(null)
                  }}
                >
                  Cerrar mesa
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
