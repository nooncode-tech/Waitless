'use client'

import { useState, useMemo } from 'react'
import { Search, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
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
  crear_pedido: 'bg-emerald-100 text-[#06C167]',
  cancelar_pedido: 'bg-red-100 text-red-700',
  cancelar_orden: 'bg-red-100 text-red-700',
  confirmar_pago: 'bg-blue-100 text-blue-700',
  cerrar_sesion: 'bg-gray-100 text-gray-700',
  aplicar_descuento: 'bg-amber-100 text-amber-700',
  reembolso: 'bg-gray-100 text-gray-700',
  eliminar_platillo: 'bg-red-100 text-red-700',
  eliminar_categoria: 'bg-red-100 text-red-700',
  eliminar_mesa: 'bg-red-100 text-red-700',
  ajuste_inventario: 'bg-purple-100 text-purple-700',
  imprimir_cuenta: 'bg-slate-100 text-slate-700',
  imprimir_cierre: 'bg-slate-100 text-slate-700',
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
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="flex items-center gap-3">
        <ClipboardList className="h-5 w-5 text-gray-500" />
        <h2 className="text-sm font-black text-gray-900">Bitácora de Actividad</h2>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{auditLogs.length} registros</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por detalle, acción o usuario..." className="pl-8 h-9 text-sm" />
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

      {/* Log list */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-2xl py-10 text-center">
          <ClipboardList className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">
            {auditLogs.length === 0 ? 'No hay registros aún' : 'No se encontraron resultados'}
          </p>
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[calc(100vh-240px)] space-y-1.5">
          {filtered.map(log => {
            const color = ACTION_COLORS[log.accion] || 'bg-gray-100 text-gray-700'
            const hasDetail = !!(log.razon || log.antes || log.despues)
            const isExpanded = expanded.has(log.id)
            return (
              <div key={log.id} className="rounded-xl bg-white border border-gray-100 hover:bg-gray-50 transition-colors">
                <div
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 ${hasDetail ? 'cursor-pointer' : ''}`}
                  onClick={() => hasDetail && toggleExpand(log.id)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {hasDetail && (
                      isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${color}`}>
                      {ACTION_LABELS[log.accion] || log.accion}
                    </span>
                    <span className="text-sm text-gray-900 truncate">{log.detalles}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                    <span className="font-medium text-gray-900">{getUserName(log.userId)}</span>
                    <span>{formatTime(log.createdAt)}</span>
                  </div>
                </div>

                {hasDetail && isExpanded && (
                  <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs border-t border-gray-100 pt-2">
                    {log.razon && (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Razón</p>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-2 py-1">{log.razon}</p>
                      </div>
                    )}
                    {log.antes && (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Antes</p>
                        <pre className="text-gray-900 bg-gray-50 rounded-lg px-2 py-1 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.antes, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.despues && (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Después</p>
                        <pre className="text-gray-900 bg-gray-50 rounded-lg px-2 py-1 overflow-x-auto whitespace-pre-wrap">
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
      )}
    </div>
  )
}
