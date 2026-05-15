'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

interface SalesNoteRow {
  id: string
  numero_interno: string
  status: string
  subtotal: number
  descuentos_total: number
  impuestos_total: number
  total: number
  moneda: string
  snapshot_items: unknown[]
  generated_at: string
  voided_at: string | null
  void_reason: string | null
  table_sessions: { id: string; mesa: number } | null
  payments: {
    id: string
    monto_requerido: number
    moneda: string
    payment_methods: { nombre: string; tipo: string } | null
  } | null
}

const STATUS_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  EMITIDA_INTERNAMENTE: 'Emitida',
  ANULADA: 'Anulada',
  CORREGIDA: 'Corregida',
  EXPORTADA: 'Exportada',
}

type StatusKey = 'BORRADOR' | 'EMITIDA_INTERNAMENTE' | 'ANULADA' | 'CORREGIDA' | 'EXPORTADA'

const STATUS_STYLE: Record<StatusKey, React.CSSProperties> = {
  BORRADOR: { background: '#f3f4f6', color: '#6b7280' },
  EMITIDA_INTERNAMENTE: { background: MINT + '66', color: MINT_DEEP, border: `1px solid ${MINT}` },
  ANULADA: { background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' },
  CORREGIDA: { background: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d' },
  EXPORTADA: { background: '#dbeafe', color: '#2563eb', border: '1px solid #93c5fd' },
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function SalesNotesManager() {
  const { config } = useApp()
  const [notes, setNotes] = useState<SalesNoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('EMITIDA_INTERNAMENTE')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/admin/sales-notes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setNotes(json.notes ?? [])
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const handlePrint = (note: SalesNoteRow) => {
    const items = (note.snapshot_items ?? []) as Array<{ nombre?: string; cantidad?: number; precio?: number; total?: number }>
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Nota de venta ${note.numero_interno}</title><style>body{font-family:monospace;font-size:12px;max-width:300px;margin:0 auto;padding:16px;}h1{font-size:14px;font-weight:bold;text-align:center;margin:0 0 4px;}.center{text-align:center;}.divider{border-top:1px dashed #000;margin:8px 0;}.row{display:flex;justify-content:space-between;}.bold{font-weight:bold;}.small{font-size:10px;}</style></head><body><h1>${config.restaurantName ?? 'WAITLESS'}</h1><p class="center small">Nota de venta interna</p><div class="divider"></div><p class="center bold">${note.numero_interno}</p><p class="center small">${new Date(note.generated_at).toLocaleString('es-VE')}</p><p class="center small">Mesa ${note.table_sessions?.mesa ?? '—'}</p><div class="divider"></div>${items.length > 0 ? items.map(it => `<div class="row"><span>${it.cantidad ?? 1}x ${it.nombre ?? 'Ítem'}</span><span>${note.moneda} ${((it.total ?? it.precio ?? 0)).toFixed(2)}</span></div>`).join('') : '<p class="center small">(sin detalle de ítems)</p>'}<div class="divider"></div><div class="row"><span>Subtotal</span><span>${note.moneda} ${note.subtotal.toFixed(2)}</span></div>${note.descuentos_total > 0 ? `<div class="row"><span>Descuento</span><span>- ${note.moneda} ${note.descuentos_total.toFixed(2)}</span></div>` : ''}${note.impuestos_total > 0 ? `<div class="row"><span>Impuesto</span><span>${note.moneda} ${note.impuestos_total.toFixed(2)}</span></div>` : ''}<div class="divider"></div><div class="row bold"><span>TOTAL</span><span>${note.moneda} ${note.total.toFixed(2)}</span></div>${note.payments?.payment_methods ? `<div class="divider"></div><p class="center small">Pagado con: ${note.payments.payment_methods.nombre}</p>` : ''}<div class="divider"></div><p class="center small">Documento interno — no válido como factura fiscal</p><p class="center small">WAITLESS</p></body></html>`
    const win = window.open('', '_blank', 'width=400,height=600')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 300)
  }

  const card: React.CSSProperties = {
    border: '1px solid #E5E5E5',
    borderRadius: 14,
    background: '#fff',
    overflow: 'hidden',
  }

  const btnPrimary: React.CSSProperties = {
    fontFamily: FONT,
    height: 36,
    padding: '0 14px',
    borderRadius: 10,
    background: '#111',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }

  const btnSecondary: React.CSSProperties = {
    fontFamily: FONT,
    height: 36,
    padding: '0 14px',
    borderRadius: 10,
    background: '#fff',
    color: '#374151',
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid #E5E5E5',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>≡</span> Notas de venta
          </h2>
          <p style={{ fontFamily: FONT, fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>Registro de ventas validadas — generadas al aprobar cada comprobante</p>
        </div>
        <button
          onClick={fetchNotes}
          style={{ ...btnSecondary, height: 36, width: 36, padding: 0, justifyContent: 'center', fontSize: 16 }}
          title="Actualizar"
        >
          ↺
        </button>
      </div>

      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, background: '#f9fafb', borderRadius: 10, border: '1px solid #E5E5E5', fontSize: 12, color: '#6b7280' }}>
        <span style={{ color: MINT_DEEP, flexShrink: 0, marginTop: 1 }}>✓</span>
        Cada nota se genera automáticamente al aprobar un comprobante de pago. Son inmutables y quedan en el historial permanentemente.
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {(['EMITIDA_INTERNAMENTE', 'ANULADA', 'EXPORTADA', ''] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              flexShrink: 0,
              fontFamily: FONT,
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 20,
              border: filterStatus === s ? '1px solid #111' : '1px solid #E5E5E5',
              background: filterStatus === s ? '#111' : '#fff',
              color: filterStatus === s ? '#fff' : '#9ca3af',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {s ? STATUS_LABELS[s] : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ fontFamily: FONT, fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>
          ↻ Cargando…
        </div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', border: '1px dashed #E5E5E5', borderRadius: 14 }}>
          <div style={{ fontSize: 32, color: '#E5E5E5', marginBottom: 8 }}>≡</div>
          <p style={{ fontFamily: FONT, fontSize: 13, color: '#9ca3af', margin: 0 }}>No hay notas de venta en este estado</p>
          <p style={{ fontFamily: FONT, fontSize: 11, color: '#d1d5db', margin: '4px 0 0' }}>Se generan automáticamente al aprobar un comprobante</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} ref={printRef}>
          {notes.map(note => {
            const isExpanded = expandedId === note.id
            const items = (note.snapshot_items ?? []) as Array<{ nombre?: string; cantidad?: number; precio?: number; total?: number }>
            const statusStyle = STATUS_STYLE[note.status as StatusKey] ?? { background: '#f3f4f6', color: '#6b7280' }

            return (
              <div key={note.id} style={card}>
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 12,
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: FONT,
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.numero_interno}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, ...statusStyle }}>
                        {STATUS_LABELS[note.status] ?? note.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: '#9ca3af' }}>
                      <span>Mesa {note.table_sessions?.mesa ?? '—'}</span>
                      <span>·</span>
                      <span style={{ fontWeight: 500, color: '#111' }}>{note.moneda} {note.total.toFixed(2)}</span>
                      <span>·</span>
                      <span>{new Date(note.generated_at).toLocaleDateString('es-VE')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      style={{
                        height: 32,
                        width: 32,
                        borderRadius: 10,
                        border: '1px solid #E5E5E5',
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        color: '#9ca3af',
                      }}
                      onClick={e => { e.stopPropagation(); handlePrint(note) }}
                      title="Imprimir nota"
                    >
                      ⎙
                    </button>
                    <span style={{ fontSize: 14, color: '#9ca3af' }}>{isExpanded ? '↑' : '↓'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: '0 12px 12px', borderTop: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
                    {note.payments?.payment_methods && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
                        <span>↓</span>
                        Pagado con: <span style={{ fontWeight: 500, color: '#111' }}>{note.payments.payment_methods.nombre}</span>
                      </div>
                    )}
                    {items.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Ítems</p>
                        {items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#111' }}>{item.cantidad ?? 1}× {item.nombre ?? 'Ítem'}</span>
                            <span style={{ color: '#111', fontWeight: 500 }}>{note.moneda} {(item.total ?? item.precio ?? 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontFamily: FONT, fontSize: 12, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>Sin detalle de ítems disponible</p>
                    )}
                    <div style={{ paddingTop: 8, borderTop: '1px dashed #E5E5E5', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                        <span>Subtotal</span><span>{note.moneda} {note.subtotal.toFixed(2)}</span>
                      </div>
                      {note.descuentos_total > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MINT_DEEP }}>
                          <span>Descuento</span><span>– {note.moneda} {note.descuentos_total.toFixed(2)}</span>
                        </div>
                      )}
                      {note.impuestos_total > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                          <span>Impuesto</span><span>{note.moneda} {note.impuestos_total.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#111', paddingTop: 4, borderTop: '1px solid #E5E5E5' }}>
                        <span>Total</span><span>{note.moneda} {note.total.toFixed(2)}</span>
                      </div>
                    </div>
                    {note.voided_at && (
                      <div style={{ padding: 8, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
                          <span>✕</span>
                          Anulada el {new Date(note.voided_at).toLocaleDateString('es-VE')}
                        </div>
                        {note.void_reason && <p style={{ fontFamily: FONT, fontSize: 12, color: '#ef4444', opacity: 0.7, margin: '2px 0 0' }}>{note.void_reason}</p>}
                      </div>
                    )}
                    <button
                      onClick={() => handlePrint(note)}
                      style={{
                        ...btnSecondary,
                        width: '100%',
                        justifyContent: 'center',
                        marginTop: 4,
                      }}
                    >
                      ⎙ Imprimir / Guardar PDF
                    </button>
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
