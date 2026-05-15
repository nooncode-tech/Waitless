'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

interface HistoryOrder {
  id: string; numero: number; canal: string; mesa: number | null
  items: Array<{ menuItem: { nombre: string }; cantidad: number; extras?: Array<{ nombre: string }> }>
  status: string; nombreCliente: string | null; telefono: string | null
  email: string | null; direccion: string | null; zonaReparto: string | null
  notas: string | null; cancelado: boolean; cancelReason: string | null
  cancelMotivo: string | null; subtotal: number; impuestos: number
  propina: number; total: number; paymentMethod: string | null
  paymentStatus: string | null; createdAt: string
}

const CANAL_LABELS: Record<string, string> = {
  mesa: 'Mesa', para_llevar: 'Para llevar', delivery: 'Delivery', mesero: 'Mesero',
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', apple_pay: 'Apple Pay',
}

function CanalIcon({ canal }: { canal: string }) {
  if (canal === 'delivery') return <span>↗</span>
  if (canal === 'para_llevar') return <span>◎</span>
  return <span>◫</span>
}

export function OrdersHistory() {
  const { currentUser } = useApp()
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [canal, setCanal] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const limit = 30
  const totalPages = Math.ceil(total / limit)

  const fetchHistory = useCallback(async (currentPage: number) => {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Sin sesión'); setLoading(false); return }

      const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) })
      if (q.trim()) params.set('q', q.trim())
      if (canal !== 'all') params.set('canal', canal)
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const res = await fetch(`/api/admin/orders/history?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { setError('Error al cargar historial'); setLoading(false); return }
      const json = await res.json()
      setOrders(json.orders); setTotal(json.total)
    } catch { setError('Error de conexión') } finally { setLoading(false) }
  }, [q, canal, from, to])

  useEffect(() => { setPage(1); fetchHistory(1) }, [fetchHistory])

  const goPage = (p: number) => { setPage(p); fetchHistory(p) }

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    return <p style={{ fontSize: 13, color: '#aaa', padding: 16, fontFamily: FONT }}>Sin acceso</p>
  }

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <form
        onSubmit={e => { e.preventDefault(); setPage(1); fetchHistory(1) }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            border: '1px solid #E5E5E5', borderRadius: 10,
            padding: '0 10px', gap: 8, height: 36, background: '#fff',
          }}>
            <span style={{ color: '#aaa', fontSize: 13 }}>⊞</span>
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nombre, teléfono o correo..."
              style={{
                flex: 1, fontSize: 12, border: 'none', outline: 'none',
                background: 'transparent', color: '#111', fontFamily: FONT,
              }}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#aaa', padding: 0 }}
              >✕</button>
            )}
          </div>
          <button
            type="submit"
            style={{
              height: 36, padding: '0 14px', borderRadius: 10,
              border: '1px solid #E5E5E5', background: '#fff',
              color: '#444', fontSize: 12, cursor: 'pointer', fontFamily: FONT,
            }}
          >Buscar</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={canal}
            onChange={e => setCanal(e.target.value)}
            style={{
              height: 30, borderRadius: 10, border: '1px solid #E5E5E5',
              padding: '0 8px', fontSize: 11, background: '#fff',
              color: '#444', fontFamily: FONT, outline: 'none',
            }}
          >
            <option value="all">Todos los canales</option>
            <option value="mesa">Mesa</option>
            <option value="para_llevar">Para llevar</option>
            <option value="delivery">Delivery</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            title="Desde"
            style={{
              height: 30, borderRadius: 10, border: '1px solid #E5E5E5',
              padding: '0 8px', fontSize: 11, background: '#fff',
              color: '#444', fontFamily: FONT, outline: 'none',
            }}
          />
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            title="Hasta"
            style={{
              height: 30, borderRadius: 10, border: '1px solid #E5E5E5',
              padding: '0 8px', fontSize: 11, background: '#fff',
              color: '#444', fontFamily: FONT, outline: 'none',
            }}
          />
        </div>
      </form>

      <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>
        {total} pedido{total !== 1 ? 's' : ''} completado{total !== 1 ? 's' : ''}
      </p>

      {error && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <span style={{ fontSize: 22, color: '#aaa', animation: 'spin 1s linear infinite' }}>↻</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>◫</div>
          <p style={{ fontSize: 13, margin: 0 }}>Sin pedidos en el historial</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(order => (
            <div
              key={order.id}
              style={{
                border: '1px solid #E5E5E5', borderRadius: 14,
                background: '#fff', padding: '12px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>#{order.numero}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 99,
                    background: '#f3f3f3', color: '#555',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <CanalIcon canal={order.canal} />
                    {CANAL_LABELS[order.canal] ?? order.canal}
                    {order.mesa ? ` · Mesa ${order.mesa}` : ''}
                  </span>
                  {order.cancelado
                    ? <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fee2e2', color: '#dc2626' }}>Cancelado</span>
                    : <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#d1fae5', color: '#059669' }}>Entregado</span>
                  }
                </div>
                <span style={{ fontSize: 10, color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(order.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                  {' '}
                  {new Date(order.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Customer info */}
              {(order.nombreCliente || order.telefono || order.email || order.direccion) && (
                <div style={{
                  background: '#f9f9f9', borderRadius: 10,
                  padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  {order.nombreCliente && (
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#111', margin: 0 }}>{order.nombreCliente}</p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
                    {order.telefono && (
                      <a href={`tel:${order.telefono}`} style={{ fontSize: 11, color: '#666', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        ☎ {order.telefono}
                      </a>
                    )}
                    {order.email && (
                      <a href={`mailto:${order.email}`} style={{ fontSize: 11, color: '#666', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        @ {order.email}
                      </a>
                    )}
                    {order.direccion && (
                      <span style={{ fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                        ◎ {order.direccion}{order.zonaReparto ? ` · ${order.zonaReparto}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#111' }}>
                      {item.cantidad}× {item.menuItem?.nombre ?? '?'}
                      {item.extras && item.extras.length > 0 && (
                        <span style={{ color: '#aaa' }}> · {item.extras.map((e: { nombre: string }) => e.nombre).join(', ')}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {order.notas && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#aaa' }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>≡</span>
                  <span style={{ fontStyle: 'italic' }}>{order.notas}</span>
                </div>
              )}

              {/* Footer */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 8, borderTop: '1px solid #f0f0f0',
              }}>
                <div style={{ fontSize: 11, color: '#aaa' }}>
                  {order.paymentMethod && PAYMENT_LABELS[order.paymentMethod]
                    ? PAYMENT_LABELS[order.paymentMethod]
                    : order.paymentMethod ?? '—'}
                  {order.cancelMotivo && <span style={{ marginLeft: 8, color: '#ef4444' }}>· {order.cancelMotivo}</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{formatPrice(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 8 }}>
          <button
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
            style={{
              width: 30, height: 30, borderRadius: 10,
              border: '1px solid #E5E5E5', background: '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#444',
            }}
          >←</button>
          <span style={{ fontSize: 12, color: '#aaa' }}>Página {page} de {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => goPage(page + 1)}
            style={{
              width: 30, height: 30, borderRadius: 10,
              border: '1px solid #E5E5E5', background: '#fff',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#444',
            }}
          >→</button>
        </div>
      )}
    </div>
  )
}
