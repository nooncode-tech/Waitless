'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatPrice } from '@/lib/store'

interface OrderItem {
  id: string
  cantidad: number
  menuItem: { nombre: string; precio: number }
  extras?: { nombre: string; precio: number }[]
  notas?: string
}

interface ConsumerOrder {
  id: string
  numero: number
  canal: string
  status: string
  total: number
  subtotal: number
  impuestos: number
  created_at: string
  items: OrderItem[]
  payment_status: string
  payment_method: string | null
  restaurant: { id: string; nombre: string; slug: string; logo_url: string | null } | null
}

const CANAL_LABEL: Record<string, string> = {
  para_llevar: 'Para llevar',
  delivery:    'Delivery',
  mesa:        'En mesa',
  mesero:      'En mesa',
}

const PAYMENT_LABEL: Record<string, string> = {
  tarjeta:           'Tarjeta',
  efectivo:          'Efectivo',
  transferencia:     'Transferencia',
  paypal:            'PayPal',
  waitless_creditos: 'Waitless Créditos',
}

const MOTIVOS = [
  'Pedido incorrecto o incompleto',
  'Pedido no llegó',
  'Producto en mal estado',
  'Cobro incorrecto',
  'Demora excesiva',
  'Otro',
]

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateGroup(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getTrackSegments(status: string): Array<'on' | 'live' | 'off'> {
  switch (status) {
    case 'recibido':   return ['on',  'off',  'off',  'off',  'off']
    case 'preparando': return ['on',  'on',   'live', 'off',  'off']
    case 'listo':      return ['on',  'on',   'on',   'live', 'off']
    case 'entregado':  return ['on',  'on',   'on',   'on',   'on']
    default:           return ['off', 'off',  'off',  'off',  'off']
  }
}

function DisputeModal({
  order, token, onClose, onSuccess,
}: {
  order: ConsumerOrder
  token: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [descripcion, setDescripcion] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const next = [...photos, ...files].slice(0, 3)
    setPhotos(next)
    setPhotoPreviews(next.map(f => URL.createObjectURL(f)))
    e.target.value = ''
  }

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(photoPreviews[i])
    setPhotos(p => p.filter((_, idx) => idx !== i))
    setPhotoPreviews(p => p.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivo || loading) return
    setLoading(true)
    setError('')

    const fotoUrls: string[] = []
    for (const file of photos) {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/consumidor/disputes/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (r.ok) {
        const d = await r.json()
        fotoUrls.push(d.url)
      }
    }

    const res = await fetch('/api/consumidor/disputes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id:    order.id,
        tenant_id:   order.restaurant?.id,
        motivo,
        descripcion: descripcion.trim() || undefined,
        foto_urls:   fotoUrls.length > 0 ? fotoUrls : undefined,
      }),
    })
    const data = await res.json()

    if (res.ok) {
      setDone(true)
      setTimeout(() => { onSuccess(); onClose() }, 2000)
    } else {
      setError(data.error ?? 'Error enviando reclamo')
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden', fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid #E5E5E5' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.03em', color: '#000' }}>Abrir reclamo</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 3 }}>
              Pedido #{order.numero} · {order.restaurant?.nombre}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.4)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {done ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: '#BEEBBE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4.5 4.5L16 6" stroke="#0a3a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.03em', color: '#000' }}>Reclamo enviado</div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>El restaurante tiene 24h para responder.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: '#000', marginBottom: 10 }}>Motivo</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {MOTIVOS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    style={{
                      padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      textAlign: 'left', border: '1px solid', fontFamily: FONT,
                      borderColor: motivo === m ? '#000' : '#E5E5E5',
                      background: motivo === m ? '#000' : '#fff',
                      color: motivo === m ? '#fff' : 'rgba(0,0,0,0.65)',
                      cursor: 'pointer',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: '#000', marginBottom: 8 }}>Descripción (opcional)</div>
              <textarea
                rows={3}
                placeholder="Cuéntanos qué pasó con tu pedido..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                style={{ width: '100%', background: '#F4F4F2', border: '1px solid #E5E5E5', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontFamily: FONT, color: '#000', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: '#000', marginBottom: 8 }}>Fotos (opcional, máx. 3)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {photoPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: '#F4F4F2', flexShrink: 0 }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: 999, background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: 64, height: 64, borderRadius: 10, background: '#F4F4F2', border: '1px solid #E5E5E5', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="5" width="14" height="10" rx="2" stroke="#909090" strokeWidth="1.3"/><circle cx="9" cy="10" r="2.5" stroke="#909090" strokeWidth="1.3"/><path d="M6 5V4a2 2 0 014 0v1" stroke="#909090" strokeWidth="1.3"/></svg>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.4)', fontFamily: FONT }}>Agregar</span>
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoAdd} />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c00', background: '#fff0f0', borderRadius: 10, padding: '10px 14px' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#c00" strokeWidth="1.3"/><path d="M7 4.5v3M7 9.5v.2" stroke="#c00" strokeWidth="1.5" strokeLinecap="round"/></svg>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, height: 48, border: '1px solid #E5E5E5', borderRadius: 999, fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,0.55)', background: '#fff', fontFamily: FONT, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading} style={{ flex: 1, height: 48, background: loading ? '#E5E5E5' : '#000', color: loading ? '#999' : '#fff', borderRadius: 999, border: 'none', fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading
                  ? <span style={{ width: 14, height: 14, border: '2px solid #999', borderTopColor: '#fff', borderRadius: 999, animation: 'con-spin 0.7s linear infinite', display: 'inline-block' }} />
                  : 'Enviar reclamo'
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function OrderCard({
  order, token, onDisputeOpened,
}: {
  order: ConsumerOrder
  token: string
  onDisputeOpened: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const isActive = order.status === 'recibido' || order.status === 'preparando' || order.status === 'listo'
  const isCancelled = order.status === 'cancelado'
  const canClaim  = order.status === 'entregado'
  const segments = getTrackSegments(order.status)

  const itemSummary = order.items
    .slice(0, 2)
    .map(i => `${i.cantidad > 1 ? `${i.cantidad}× ` : ''}${i.menuItem.nombre}`)
    .join(' · ')
  const extraCount = order.items.length > 2 ? ` · +${order.items.length - 2}` : ''

  const statusLabel: Record<string, string> = {
    recibido: 'Recibido', preparando: 'En cocina', listo: 'Listo',
    entregado: 'Pagado', cancelado: 'Cancelado',
  }

  return (
    <>
      {showDispute && (
        <DisputeModal
          order={order}
          token={token}
          onClose={() => setShowDispute(false)}
          onSuccess={onDisputeOpened}
        />
      )}

      <div style={{
        background: '#fff',
        border: isActive ? '2px solid #000' : '1px solid #E5E5E5',
        borderRadius: 16,
        position: 'relative',
        fontFamily: FONT,
      }}>
        {isActive && (
          <div style={{ position: 'absolute', top: -10, left: 16, background: '#BEEBBE', color: '#0a3a0a', padding: '4px 9px', fontWeight: 700, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 3 }}>
            EN CURSO
          </div>
        )}
        {isCancelled && (
          <div style={{ position: 'absolute', top: -10, left: 16, background: '#FEE2E2', color: '#c00', padding: '4px 9px', fontWeight: 700, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 3 }}>
            CANCELADO
          </div>
        )}

        <button
          style={{ width: '100%', textAlign: 'left', padding: '16px 16px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}
          onClick={() => setExpanded(e => !e)}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginTop: isActive || isCancelled ? 6 : 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.035em', color: '#000', lineHeight: 1.1 }}>
                {order.restaurant?.nombre ?? 'Restaurante'}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
                #{order.numero} · {new Date(order.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                {order.canal !== 'mesa' && order.canal !== 'mesero' && ` · ${CANAL_LABEL[order.canal] ?? order.canal}`}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 4 }}>
                {itemSummary}{extraCount}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                {formatPrice(order.total)}
              </div>
              {!isActive && !isCancelled && (
                <div style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 8px', background: '#0a3a0a', color: '#BEEBBE', fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 3, marginTop: 4 }}>
                  {statusLabel[order.status] ?? order.status}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 6 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'rgba(0,0,0,0.3)' }}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>

          {isActive && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {segments.map((seg, i) => (
                  <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: seg === 'on' ? '#000' : seg === 'live' ? '#BEEBBE' : 'rgba(0,0,0,0.08)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: MONO, fontSize: 10, color: 'rgba(0,0,0,0.45)' }}>
                <span>Recibido</span>
                <span>Cocinando</span>
                <span>Listo</span>
                <span>Servido</span>
                <span>Pagado</span>
              </div>
            </div>
          )}
        </button>

        {expanded && (
          <div style={{ borderTop: '1px solid #EFEFEF', padding: '12px 16px 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>
              {formatDate(order.created_at)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {order.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#000', letterSpacing: '-0.01em' }}>
                      {item.cantidad}× {item.menuItem.nombre}
                    </div>
                    {item.extras && item.extras.length > 0 && (
                      <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>
                        + {item.extras.map(e => e.nombre).join(', ')}
                      </div>
                    )}
                    {item.notas && (
                      <div style={{ fontFamily: MONO, fontSize: 11, color: '#b45309', marginTop: 2 }}>{item.notas}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {formatPrice(item.menuItem.precio * item.cantidad)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #EFEFEF' }}>
              {order.impuestos > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', marginBottom: 4 }}>
                    <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', marginBottom: 4 }}>
                    <span>Impuestos</span><span>{formatPrice(order.impuestos)}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, color: '#000', letterSpacing: '-0.02em' }}>
                <span>Total</span><span>{formatPrice(order.total)}</span>
              </div>
              {order.payment_method && (
                <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>
                  Pagado con {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
                </div>
              )}
            </div>

            {canClaim && (
              <button
                onClick={() => setShowDispute(true)}
                style={{ width: '100%', marginTop: 12, height: 40, border: '1px solid #E5E5E5', borderRadius: 999, fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.45)', background: '#fff', fontFamily: FONT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5v3M7 9.5v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Reclamar pedido
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export function ConsumerOrdersTab({ token }: { token: string }) {
  const [orders, setOrders] = useState<ConsumerOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/consumidor/orders', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLoading(false)
  }, [token])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  if (loading) {
    return (
      <div className="con-loading" style={{ minHeight: 200 }}>
        <div className="con-spinner" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="con-empty">
        <div className="con-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="#909090" strokeWidth="1.8"/><path d="M9 8h6M9 12h6M9 16h4" stroke="#909090" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <div className="con-empty-title">Sin pedidos aún</div>
        <div className="con-empty-sub">Cuando hagas tu primer pedido aparecerá aquí.</div>
      </div>
    )
  }

  const groups: { label: string; orders: ConsumerOrder[] }[] = []
  for (const order of orders) {
    const label = formatDateGroup(order.created_at)
    const existing = groups.find(g => g.label === label)
    if (existing) existing.orders.push(order)
    else groups.push({ label, orders: [order] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {groups.map(group => (
        <div key={group.label}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 12, paddingLeft: 2 }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {group.orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                token={token}
                onDisputeOpened={fetchOrders}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
