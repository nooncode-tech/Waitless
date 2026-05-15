'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import type { PaymentStatus2 } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

interface Receipt {
  id: string; file_url: string | null; file_type: string | null
  referencia: string | null; monto_declarado: number | null
  review_status: string; created_at: string
}

interface PaymentRow {
  id: string; status: PaymentStatus2; monto_requerido: number
  monto_declarado: number | null; moneda: string
  motivo_rechazo: string | null; notas_internas: string | null
  created_at: string; updated_at: string
  payment_methods: { id: string; nombre: string; tipo: string } | null
  table_sessions: { id: string; mesa: number } | null
  payment_receipts: Receipt[]
}

const STATUS_LABELS: Record<PaymentStatus2, string> = {
  PENDIENTE_DE_PAGO: 'Pendiente',
  COMPROBANTE_CARGADO: 'Comprobante cargado',
  EN_REVISION: 'En revisión',
  PAGO_VALIDADO: 'Validado',
  PAGO_RECHAZADO: 'Rechazado',
  PAGO_PARCIAL: 'Parcial',
  CORRECCION_SOLICITADA: 'Corrección solicitada',
  ANULADO: 'Anulado',
}

const STATUS_STYLE: Record<PaymentStatus2, React.CSSProperties> = {
  PENDIENTE_DE_PAGO:     { background: '#f3f3f3', color: '#666' },
  COMPROBANTE_CARGADO:   { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' },
  EN_REVISION:           { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  PAGO_VALIDADO:         { background: '#d1fae5', color: '#059669', border: '1px solid #a7f3d0' },
  PAGO_RECHAZADO:        { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' },
  PAGO_PARCIAL:          { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' },
  CORRECCION_SOLICITADA: { background: '#f3f3f3', color: '#444' },
  ANULADO:               { background: '#f3f3f3', color: '#aaa' },
}

const textareaStyle: React.CSSProperties = {
  width: '100%', borderRadius: 10, border: '1px solid #E5E5E5',
  padding: '8px 10px', fontSize: 13, fontFamily: FONT, outline: 'none',
  background: '#fff', color: '#111', resize: 'vertical', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#888', marginBottom: 4, display: 'block',
}

export function PaymentsReviewManager() {
  const { currentUser } = useApp()
  const role = currentUser?.role
  const canValidate = canDo(role, 'validar_pago')

  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('COMPROBANTE_CARGADO')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectMotivo, setRejectMotivo] = useState('')
  const [correctionModal, setCorrectionModal] = useState<{ id: string } | null>(null)
  const [correctionNotas, setCorrectionNotas] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [approvedNote, setApprovedNote] = useState<{ numero: string } | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) { setPayments([]); return }
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/admin/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      setPayments(json.payments ?? [])
    } catch {
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const callAction = async (paymentId: string, action: string, body?: object) => {
    setActionLoading(paymentId)
    const token = await getToken()
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? 'Error al procesar la acción'); return null }
      return json
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprove = async (paymentId: string) => {
    if (!confirm('¿Aprobar este pago y generar nota interna?')) return
    const result = await callAction(paymentId, 'approve')
    if (result) { setApprovedNote({ numero: result.numeroInterno }); fetchPayments() }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    if (!rejectMotivo.trim()) { alert('El motivo es obligatorio'); return }
    const result = await callAction(rejectModal.id, 'reject', { motivo: rejectMotivo })
    if (result) { setRejectModal(null); setRejectMotivo(''); fetchPayments() }
  }

  const handleCorrection = async () => {
    if (!correctionModal) return
    const result = await callAction(correctionModal.id, 'correction', { notas: correctionNotas })
    if (result) { setCorrectionModal(null); setCorrectionNotas(''); fetchPayments() }
  }

  const pendingCount = payments.filter(p => p.status === 'COMPROBANTE_CARGADO' || p.status === 'EN_REVISION').length

  const FILTER_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '', label: 'Todos' },
    { value: 'COMPROBANTE_CARGADO', label: STATUS_LABELS['COMPROBANTE_CARGADO'] },
    { value: 'EN_REVISION', label: STATUS_LABELS['EN_REVISION'] },
    { value: 'PAGO_VALIDADO', label: STATUS_LABELS['PAGO_VALIDADO'] },
    { value: 'PAGO_RECHAZADO', label: STATUS_LABELS['PAGO_RECHAZADO'] },
    { value: 'CORRECCION_SOLICITADA', label: STATUS_LABELS['CORRECCION_SOLICITADA'] },
  ]

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Revisión de pagos
            {pendingCount > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                height: 20, minWidth: 20, padding: '0 6px',
                fontSize: 10, fontWeight: 700,
                background: '#ef4444', color: '#fff', borderRadius: 99,
              }}>
                {pendingCount}
              </span>
            )}
          </h2>
          <p style={{ fontSize: 10, color: '#aaa', margin: '2px 0 0 0' }}>
            Valida comprobantes de transferencias y pagos digitales
          </p>
        </div>
        <button
          onClick={fetchPayments}
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#888',
          }}
          title="Actualizar"
        >↺</button>
      </div>

      {/* Approved banner */}
      {approvedNote && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: '#d1fae5',
          border: '1px solid #a7f3d0', borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#059669', fontSize: 16 }}>✓</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#059669', margin: 0 }}>Pago aprobado</p>
              <p style={{ fontSize: 11, color: '#059669', margin: 0, fontFamily: MONO, opacity: 0.8 }}>
                {approvedNote.numero}
              </p>
            </div>
          </div>
          <button
            onClick={() => setApprovedNote(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#059669', opacity: 0.6 }}
          >✕</button>
        </div>
      )}

      {/* Filter pills */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        paddingBottom: 4, margin: '0 -4px', padding: '0 4px',
      }}>
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            style={{
              flexShrink: 0, fontSize: 11, padding: '5px 12px', borderRadius: 99,
              border: filterStatus === opt.value ? '1px solid #111' : '1px solid #E5E5E5',
              background: filterStatus === opt.value ? '#111' : '#fff',
              color: filterStatus === opt.value ? '#fff' : '#666',
              cursor: 'pointer', fontFamily: FONT, transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <span style={{ fontSize: 22, color: '#ccc', display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : payments.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 16px',
          border: '1px dashed #E5E5E5', borderRadius: 14,
        }}>
          <div style={{ fontSize: 28, color: '#ddd', marginBottom: 8 }}>⏱</div>
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>No hay pagos en este estado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {payments.map(p => {
            const isExpanded = expandedId === p.id
            const isLoading = actionLoading === p.id
            const latestReceipt = p.payment_receipts?.[p.payment_receipts.length - 1]
            const isPending = ['COMPROBANTE_CARGADO', 'EN_REVISION'].includes(p.status)

            return (
              <div
                key={p.id}
                style={{
                  border: '1px solid #E5E5E5', borderRadius: 14,
                  background: '#fff', overflow: 'hidden',
                }}
              >
                {/* Row header (clickable) */}
                <button
                  style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px', textAlign: 'left', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: FONT,
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
                        Mesa {p.table_sessions?.mesa ?? '—'}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                        ...STATUS_STYLE[p.status],
                      }}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 12, color: '#aaa' }}>
                      <span>{p.payment_methods?.nombre ?? 'Sin método'}</span>
                      <span>·</span>
                      <span style={{ fontWeight: 600, color: '#111', fontFamily: MONO }}>
                        ${p.monto_declarado ?? p.monto_requerido} {p.moneda}
                      </span>
                      {p.monto_declarado && p.monto_declarado !== p.monto_requerido && (
                        <span style={{ color: '#d97706' }}>(req. ${p.monto_requerido})</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: '#aaa', flexShrink: 0, marginTop: 2 }}>
                    {isExpanded ? '↑' : '↓'}
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{
                    padding: '0 12px 12px 12px',
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    {/* Receipt */}
                    {latestReceipt && (
                      <div style={{
                        marginTop: 12, padding: '12px',
                        background: '#f9f9f9', borderRadius: 10,
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#111', margin: 0 }}>Comprobante</p>
                        {latestReceipt.referencia && (
                          <p style={{ fontSize: 13, color: '#111', margin: 0 }}>
                            Ref: <span style={{ fontFamily: MONO }}>{latestReceipt.referencia}</span>
                          </p>
                        )}
                        {latestReceipt.file_url && (
                          <a
                            href={latestReceipt.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            ↗ Ver imagen / PDF
                          </a>
                        )}
                        {latestReceipt.monto_declarado && (
                          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                            Monto declarado: <span style={{ fontWeight: 600, color: '#111' }}>${latestReceipt.monto_declarado}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Rejection reason */}
                    {p.motivo_rechazo && (
                      <div style={{
                        padding: '8px 12px', background: '#fee2e2',
                        border: '1px solid #fecaca', borderRadius: 10,
                      }}>
                        <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, margin: 0 }}>Motivo de rechazo:</p>
                        <p style={{ fontSize: 11, color: '#dc2626', margin: '2px 0 0 0', opacity: 0.8 }}>{p.motivo_rechazo}</p>
                      </div>
                    )}

                    {/* Internal notes */}
                    {p.notas_internas && (
                      <div style={{ padding: '8px 12px', background: '#f9f9f9', borderRadius: 10 }}>
                        <p style={{ fontSize: 11, color: '#888', fontWeight: 600, margin: 0 }}>Notas internas:</p>
                        <p style={{ fontSize: 11, color: '#111', margin: '2px 0 0 0' }}>{p.notas_internas}</p>
                      </div>
                    )}

                    {p.payment_receipts.length > 1 && (
                      <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>
                        {p.payment_receipts.length} comprobantes cargados en total
                      </p>
                    )}

                    {/* Action buttons */}
                    {canValidate && isPending && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleApprove(p.id)}
                          disabled={isLoading}
                          style={{
                            flex: 1, height: 36, borderRadius: 10, border: 'none',
                            background: '#059669', color: '#fff',
                            fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            opacity: isLoading ? 0.5 : 1, fontFamily: FONT,
                          }}
                        >
                          ✓ Aprobar
                        </button>
                        <button
                          onClick={() => { setCorrectionModal({ id: p.id }); setCorrectionNotas('') }}
                          disabled={isLoading}
                          style={{
                            flex: 1, height: 36, borderRadius: 10,
                            border: '1px solid #fde68a', background: '#fff',
                            color: '#b45309', fontSize: 12, fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            opacity: isLoading ? 0.5 : 1, fontFamily: FONT,
                          }}
                        >
                          ⚠ Corrección
                        </button>
                        <button
                          onClick={() => { setRejectModal({ id: p.id }); setRejectMotivo('') }}
                          disabled={isLoading}
                          style={{
                            flex: 1, height: 36, borderRadius: 10,
                            border: '1px solid #fecaca', background: '#fff',
                            color: '#dc2626', fontSize: 12, fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            opacity: isLoading ? 0.5 : 1, fontFamily: FONT,
                          }}
                        >
                          ✕ Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setRejectModal(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '16px 16px 0 0',
              width: '100%', maxWidth: 480, padding: 20,
              paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Rechazar pago</h3>
            <div>
              <label style={labelStyle}>Motivo (obligatorio)</label>
              <textarea
                value={rejectMotivo}
                onChange={e => setRejectMotivo(e.target.value)}
                placeholder="ej. El monto no coincide con el total de la cuenta."
                rows={3}
                style={textareaStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  flex: 1, height: 36, borderRadius: 10, border: '1px solid #E5E5E5',
                  background: '#fff', color: '#444', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >Cancelar</button>
              <button
                onClick={handleReject}
                disabled={!!actionLoading}
                style={{
                  flex: 1, height: 36, borderRadius: 10, border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.5 : 1, fontFamily: FONT,
                }}
              >Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {correctionModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setCorrectionModal(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '16px 16px 0 0',
              width: '100%', maxWidth: 480, padding: 20,
              paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Solicitar corrección</h3>
            <div>
              <label style={labelStyle}>Instrucciones para el cliente (opcional)</label>
              <textarea
                value={correctionNotas}
                onChange={e => setCorrectionNotas(e.target.value)}
                placeholder="ej. Por favor incluye el número de referencia de la operación."
                rows={3}
                style={textareaStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCorrectionModal(null)}
                style={{
                  flex: 1, height: 36, borderRadius: 10, border: '1px solid #E5E5E5',
                  background: '#fff', color: '#444', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >Cancelar</button>
              <button
                onClick={handleCorrection}
                disabled={!!actionLoading}
                style={{
                  flex: 1, height: 36, borderRadius: 10, border: 'none',
                  background: '#111', color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.5 : 1, fontFamily: FONT,
                }}
              >Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
