'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/context'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

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

type BadgeStyle = { background: string; color: string }

const ACTION_BADGE_STYLES: Record<string, BadgeStyle> = {
  crear_pedido:      { background: '#D1FAE5', color: '#065F46' },
  cancelar_pedido:   { background: '#FEE2E2', color: '#B91C1C' },
  cancelar_orden:    { background: '#FEE2E2', color: '#B91C1C' },
  confirmar_pago:    { background: '#DBEAFE', color: '#1E40AF' },
  cerrar_sesion:     { background: '#F3F4F6', color: '#374151' },
  aplicar_descuento: { background: '#FEF3C7', color: '#92400E' },
  reembolso:         { background: '#F3F4F6', color: '#374151' },
  eliminar_platillo: { background: '#FEE2E2', color: '#B91C1C' },
  eliminar_categoria:{ background: '#FEE2E2', color: '#B91C1C' },
  eliminar_mesa:     { background: '#FEE2E2', color: '#B91C1C' },
  ajuste_inventario: { background: '#EDE9FE', color: '#5B21B6' },
  imprimir_cuenta:   { background: '#F1F5F9', color: '#475569' },
  imprimir_cierre:   { background: '#F1F5F9', color: '#475569' },
}

const DEFAULT_BADGE: BadgeStyle = { background: '#F3F4F6', color: '#374151' }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>≡</span>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#111' }}>Bitácora de Actividad</h2>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          background: '#F3F4F6', color: '#6B7280',
        }}>
          {auditLogs.length} registros
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 14, pointerEvents: 'none' }}>
            ◎
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por detalle, acción o usuario..."
            style={{
              width: '100%', height: 36, paddingLeft: 32, paddingRight: 12,
              border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 13,
              fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
              color: '#111', background: '#fff',
            }}
          />
        </div>
        <select
          value={filterAccion}
          onChange={e => setFilterAccion(e.target.value)}
          style={{
            height: 36, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 10,
            fontSize: 13, fontFamily: FONT, color: '#111', background: '#fff',
            outline: 'none', cursor: 'pointer', minWidth: 180,
          }}
        >
          <option value="all">Todas las acciones</option>
          {uniqueAcciones.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
          ))}
        </select>
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <div style={{
          border: '1px dashed #E5E5E5', borderRadius: 14, padding: '40px 0',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, color: '#D1D5DB' }}>Ø</div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF' }}>
            {auditLogs.length === 0 ? 'No hay registros aún' : 'No se encontraron resultados'}
          </p>
        </div>
      ) : (
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(log => {
            const badge = ACTION_BADGE_STYLES[log.accion] || DEFAULT_BADGE
            const hasDetail = !!(log.razon || log.antes || log.despues)
            const isExpanded = expanded.has(log.id)
            return (
              <div
                key={log.id}
                style={{ border: '1px solid #E5E5E5', borderRadius: 14, background: '#fff', overflow: 'hidden' }}
              >
                <div
                  onClick={() => hasDetail && toggleExpand(log.id)}
                  style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '10px 12px',
                    cursor: hasDetail ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    {hasDetail && (
                      <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>
                        {isExpanded ? '↓' : '→'}
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      whiteSpace: 'nowrap', flexShrink: 0,
                      background: badge.background, color: badge.color,
                    }}>
                      {ACTION_LABELS[log.accion] || log.accion}
                    </span>
                    <span style={{ fontSize: 13, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.detalles}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, fontSize: 12, color: '#9CA3AF' }}>
                    <span style={{ fontWeight: 600, color: '#111' }}>{getUserName(log.userId)}</span>
                    <span>{formatTime(log.createdAt)}</span>
                  </div>
                </div>

                {hasDetail && isExpanded && (
                  <div style={{
                    padding: '8px 12px 12px', borderTop: '1px solid #F3F4F6',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10,
                  }}>
                    {log.razon && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em' }}>Razón</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#111', background: '#F9FAFB', borderRadius: 8, padding: '4px 8px' }}>{log.razon}</p>
                      </div>
                    )}
                    {log.antes && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em' }}>Antes</p>
                        <pre style={{ margin: 0, fontSize: 11, color: '#111', background: '#F9FAFB', borderRadius: 8, padding: '4px 8px', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: MONO }}>
                          {JSON.stringify(log.antes, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.despues && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em' }}>Después</p>
                        <pre style={{ margin: 0, fontSize: 11, color: '#111', background: '#F9FAFB', borderRadius: 8, padding: '4px 8px', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: MONO }}>
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
