'use client'

import { useState, useMemo } from 'react'
import { Search, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ACTION_LABELS: Record<string, string> = {
  crear_pedido: 'Pedido creado',
  cancelar_pedido: 'Pedido cancelado',
  cancelar_orden: 'Orden cancelada',
  confirmar_pago: 'Pago confirmado',
  cerrar_sesion: 'Sesión cerrada',
  aplicar_descuento: 'Descuento aplicado',
  crear_platillo: 'Platillo creado',
  actualizar_platillo: 'Platillo actualizado',
  eliminar_platillo: 'Platillo eliminado',
  crear_categoria: 'Categoría creada',
  eliminar_categoria: 'Categoría eliminada',
  crear_ingrediente: 'Ingrediente creado',
  ajuste_inventario: 'Ajuste de inventario',
  reembolso: 'Reembolso',
  crear_mesa: 'Mesa creada',
  eliminar_mesa: 'Mesa eliminada',
  imprimir_cuenta: 'Cuenta impresa',
  imprimir_cierre: 'Cierre impreso',
}

const ACTION_COLORS: Record<string, string> = {
  crear_pedido: 'bg-green-100 text-green-800',
  cancelar_pedido: 'bg-red-100 text-red-800',
  cancelar_orden: 'bg-red-100 text-red-800',
  confirmar_pago: 'bg-blue-100 text-blue-800',
  cerrar_sesion: 'bg-gray-100 text-gray-800',
  aplicar_descuento: 'bg-yellow-100 text-yellow-800',
  reembolso: 'bg-gray-100 text-gray-800',
  eliminar_platillo: 'bg-red-100 text-red-800',
  eliminar_categoria: 'bg-red-100 text-red-800',
  eliminar_mesa: 'bg-red-100 text-red-800',
  ajuste_inventario: 'bg-purple-100 text-purple-800',
  imprimir_cuenta: 'bg-slate-100 text-slate-800',
  imprimir_cierre: 'bg-slate-100 text-slate-800',
}

export function AuditLogViewer() {
  const { auditLogs, users } = useApp()
  const [search, setSearch] = useState('')
  const [filterAccion, setFilterAccion] = useState<string>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const uniqueAcciones = useMemo(
    () => [...new Set(auditLogs.map(l => l.accion))].sort(),
    [auditLogs]
  )

  const filtered = useMemo(() => {
    return [...auditLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter(log => {
        if (filterAccion !== 'all' && log.accion !== filterAccion) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          const user = users.find(u => u.id === log.userId)
          return (
            log.detalles.toLowerCase().includes(q) ||
            log.accion.toLowerCase().includes(q) ||
            log.entidad.toLowerCase().includes(q) ||
            (user?.nombre || '').toLowerCase().includes(q) ||
            (user?.username || '').toLowerCase().includes(q)
          )
        }
        return true
      })
  }, [auditLogs, users, search, filterAccion])

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user ? (user.nombre || user.username) : userId === 'anonymous' ? 'Anónimo' : userId.slice(0, 8)
  }

  const formatTime = (date: Date) =>
    new Date(date).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold">Bitácora de Actividad</h2>
        <Badge variant="secondary">{auditLogs.length} registros</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por detalle, acción o usuario..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={filterAccion} onValueChange={setFilterAccion}>
          <SelectTrigger className="h-9 w-full sm:w-52 text-sm">
            <SelectValue placeholder="Filtrar por acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {uniqueAcciones.map(a => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {auditLogs.length === 0 ? 'No hay registros aún' : 'No se encontraron resultados'}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="space-y-1.5">
            {filtered.map(log => {
              const color = ACTION_COLORS[log.accion] || 'bg-secondary text-foreground'
              const hasDetail = !!(log.razon || log.antes || log.despues)
              const isExpanded = expanded.has(log.id)
              return (
                <div key={log.id} className="rounded-lg bg-card border border-border hover:bg-secondary/30 transition-colors">
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 ${hasDetail ? 'cursor-pointer' : ''}`}
                    onClick={() => hasDetail && toggleExpand(log.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {hasDetail && (
                        isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${color}`}>
                        {ACTION_LABELS[log.accion] || log.accion}
                      </span>
                      <span className="text-sm text-foreground truncate">{log.detalles}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                      <span className="font-medium text-foreground">{getUserName(log.userId)}</span>
                      <span>{formatTime(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Expandable antes/despues panel */}
                  {hasDetail && isExpanded && (
                    <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs border-t border-border pt-2">
                      {log.razon && (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Razón</p>
                          <p className="text-foreground bg-muted/50 rounded px-2 py-1">{log.razon}</p>
                        </div>
                      )}
                      {log.antes && (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Antes</p>
                          <pre className="text-foreground bg-muted/50 rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.antes, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.despues && (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Después</p>
                          <pre className="text-foreground bg-muted/50 rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.despues, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
