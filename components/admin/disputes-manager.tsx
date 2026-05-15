'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

interface DisputeTicket {
  id: string
  consumer_id: string
  order_id: string
  motivo: string
  descripcion: string | null
  foto_urls: string[]
  status: 'abierto' | 'restaurante_respondio' | 'en_revision' | 'resuelto_favor_cliente' | 'resuelto_favor_restaurante'
  resolucion: string | null
  restaurante_respuesta: string | null
  restaurante_respondio_at: string | null
  resolved_at: string | null
  created_at: string
  refund_cents?: number | null
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  abierto:                    { label: 'Abierto',               bg: '#FEF3C7', color: '#92400E' },
  restaurante_respondio:      { label: 'Respondido',            bg: '#DBEAFE', color: '#1E40AF' },
  en_revision:                { label: 'En revisión',           bg: '#EDE9FE', color: '#5B21B6' },
  resuelto_favor_cliente:     { label: 'Resuelto — cliente',    bg: '#BEEBBE', color: '#0a3a0a' },
  resuelto_favor_restaurante: { label: 'Resuelto — restaurante', bg: '#F5F5F5', color: '#555' },
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function RespondPanel({ dispute, token, onDone }: { dispute: DisputeTicket; token: string; onDone: () => void }) {
  const [tab, setTab] = useState<'respond' | 'resolve'>('respond')
  const [respuesta, setRespuesta] = useState('')
  const [resolucion, setResolucion] = useState<'favor_cliente' | 'favor_restaurante'>('favor_cliente')
  const [nota, setNota] = useState('')
  const [refundCents, setRefundCents] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canRespond = ['abierto', 'en_revision'].includes(dispute.status)
  const canResolve = !['resuelto_favor_cliente', 'resuelto_favor_restaurante'].includes(dispute.status)

  const handleRespond = async () => {
    if (!respuesta.trim() || loading) return
    setLoading(true); setError('')
    const res = await fetch(`/api/admin/disputes/${dispute.id}?action=respond`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ respuesta: respuesta.trim() }),
    })
    const data = await res.json()
    if (res.ok) onDone()
    else setError(data.error ?? 'Error enviando respuesta')
    setLoading(false)
  }

  const handleResolve = async () => {
    if (loading) return
    setLoading(true); setError('')
    const res = await fetch(`/api/admin/disputes/${dispute.id}?action=resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolucion,
        nota: nota.trim() || undefined,
        refund_cents: resolucion === 'favor_cliente' && refundCents ? Math.round(parseFloat(refundCents) * 100) : 0,
      }),
    })
    const data = await res.json()
    if (res.ok) onDone()
    else setError(data.error ?? 'Error resolviendo reclamo')
    setLoading(false)
  }

  return (
    <div style={{ borderTop: '1px solid #F5F5F5', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {dispute.descripcion && (
        <div style={{ background: '#F5F5F5', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Descripción del cliente</p>
          <p style={{ fontSize: 13, color: '#333', margin: 0 }}>{dispute.descripcion}</p>
        </div>
      )}
      {dispute.restaurante_respuesta && (
        <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Tu respuesta anterior</p>
          <p style={{ fontSize: 13, color: '#1E40AF', margin: 0 }}>{dispute.restaurante_respuesta}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {canRespond && (
          <button onClick={() => setTab('respond')} style={{ flex: 1, height: 36, borderRadius: 10, border: 'none', background: tab === 'respond' ? '#000' : '#F5F5F5', color: tab === 'respond' ? '#fff' : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
            Responder
          </button>
        )}
        {canResolve && (
          <button onClick={() => setTab('resolve')} style={{ flex: 1, height: 36, borderRadius: 10, border: 'none', background: tab === 'resolve' ? '#000' : '#F5F5F5', color: tab === 'resolve' ? '#fff' : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
            Resolver
          </button>
        )}
      </div>

      {tab === 'respond' && canRespond && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea rows={3} placeholder="Escribe tu respuesta al cliente..." value={respuesta} onChange={e => setRespuesta(e.target.value)} style={{ width: '100%', background: '#F5F5F5', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: FONT, border: 'none', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          <button onClick={handleRespond} disabled={loading || !respuesta.trim()} style={{ width: '100%', height: 40, background: loading || !respuesta.trim() ? '#CCC' : '#000', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading || !respuesta.trim() ? 'default' : 'pointer', fontFamily: FONT }}>
            {loading ? '↻ Enviando...' : 'Enviar respuesta'}
          </button>
        </div>
      )}

      {tab === 'resolve' && canResolve && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setResolucion('favor_cliente')} style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: resolucion === 'favor_cliente' ? '#BEEBBE' : '#F5F5F5', color: resolucion === 'favor_cliente' ? '#0a3a0a' : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
              A favor del cliente
            </button>
            <button onClick={() => setResolucion('favor_restaurante')} style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: resolucion === 'favor_restaurante' ? '#000' : '#F5F5F5', color: resolucion === 'favor_restaurante' ? '#fff' : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
              A favor del restaurante
            </button>
          </div>
          {resolucion === 'favor_cliente' && (
            <input type="number" min="0" step="0.01" placeholder="Monto a reembolsar (opcional)" value={refundCents} onChange={e => setRefundCents(e.target.value)} style={{ width: '100%', height: 40, background: '#F5F5F5', borderRadius: 10, padding: '0 14px', fontSize: 13, fontFamily: FONT, border: 'none', outline: 'none', boxSizing: 'border-box' }} />
          )}
          <textarea rows={2} placeholder="Nota interna sobre la resolución (opcional)" value={nota} onChange={e => setNota(e.target.value)} style={{ width: '100%', background: '#F5F5F5', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: FONT, border: 'none', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          <button onClick={handleResolve} disabled={loading} style={{ width: '100%', height: 40, background: loading ? '#CCC' : '#000', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: FONT }}>
            {loading ? '↻ Resolviendo...' : 'Confirmar resolución'}
          </button>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#991B1B', background: '#FEE2E2', borderRadius: 10, padding: '8px 12px' }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}

export function DisputesManager() {
  const [disputes, setDisputes] = useState<DisputeTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const fetchDisputes = useCallback(async (tok: string, statusFilter?: string) => {
    const url = statusFilter && statusFilter !== 'all' ? `/api/admin/disputes?status=${statusFilter}` : '/api/admin/disputes'
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) {
      const data = await res.json()
      setDisputes(data.disputes ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      fetchDisputes(session.access_token)
    })
  }, [fetchDisputes])

  const handleFilter = (f: string) => {
    setFilter(f)
    if (token) { setLoading(true); fetchDisputes(token, f) }
  }

  const pending = disputes.filter(d => !d.status.startsWith('resuelto')).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontFamily: FONT }}>
        <span style={{ fontSize: 24, color: '#CCC' }}>↻</span>
      </div>
    )
  }

  const FILTERS = [
    { value: 'all',                      label: 'Todos' },
    { value: 'abierto',                  label: 'Abiertos' },
    { value: 'restaurante_respondio',    label: 'Respondidos' },
    { value: 'en_revision',              label: 'En revisión' },
    { value: 'resuelto_favor_cliente',   label: 'Resueltos' },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 720, fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Reclamos de clientes</h2>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            {pending > 0 ? `${pending} reclamo${pending !== 1 ? 's' : ''} pendiente${pending !== 1 ? 's' : ''}` : 'Sin reclamos pendientes'}
          </p>
        </div>
        <button onClick={() => token && fetchDisputes(token, filter !== 'all' ? filter : undefined)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999', padding: 4 }} title="Actualizar">↻</button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => handleFilter(f.value)} style={{ padding: '6px 14px', borderRadius: 999, border: 'none', background: filter === f.value ? '#000' : '#F5F5F5', color: filter === f.value ? '#fff' : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
            {f.label}
          </button>
        ))}
      </div>

      {disputes.length === 0 ? (
        <div style={{ border: '1px dashed #E5E5E5', borderRadius: 16, padding: '56px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>✓</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#666', margin: 0 }}>Sin reclamos</p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>Los reclamos de clientes aparecerán aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {disputes.map(dispute => {
            const meta = STATUS_META[dispute.status] ?? STATUS_META.abierto
            const isOpen = expanded === dispute.id
            const isResolved = dispute.status.startsWith('resuelto')

            return (
              <div key={dispute.id} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : dispute.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FONT }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: meta.bg, color: meta.color, flexShrink: 0, whiteSpace: 'nowrap' }}>{meta.label}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dispute.motivo}</p>
                    <p style={{ fontSize: 11, color: '#999', margin: '2px 0 0' }}>{fmtDate(dispute.created_at)}</p>
                  </div>
                  {dispute.refund_cents ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0a3a0a', flexShrink: 0 }}>$ {(dispute.refund_cents / 100).toFixed(2)}</span>
                  ) : null}
                  <span style={{ fontSize: 14, color: '#999', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </button>

                {isOpen && token && (
                  isResolved ? (
                    <div style={{ borderTop: '1px solid #F5F5F5', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {dispute.descripcion && (
                        <div style={{ background: '#F5F5F5', borderRadius: 10, padding: '10px 14px' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Descripción</p>
                          <p style={{ fontSize: 13, color: '#333', margin: 0 }}>{dispute.descripcion}</p>
                        </div>
                      )}
                      {dispute.restaurante_respuesta && (
                        <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 14px' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Tu respuesta</p>
                          <p style={{ fontSize: 13, color: '#1E40AF', margin: 0 }}>{dispute.restaurante_respuesta}</p>
                        </div>
                      )}
                      {dispute.resolucion && (
                        <div style={{ background: '#F5F5F5', borderRadius: 10, padding: '10px 14px' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Nota de resolución</p>
                          <p style={{ fontSize: 13, color: '#333', margin: 0 }}>{dispute.resolucion}</p>
                        </div>
                      )}
                      {dispute.resolved_at && (
                        <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Resuelto: {fmtDate(dispute.resolved_at)}</p>
                      )}
                    </div>
                  ) : (
                    <RespondPanel
                      dispute={dispute}
                      token={token}
                      onDone={() => {
                        setExpanded(null)
                        fetchDisputes(token, filter !== 'all' ? filter : undefined)
                      }}
                    />
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
