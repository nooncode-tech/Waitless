'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle2, XCircle, AlertCircle, ExternalLink,
  ChevronDown, ChevronUp, Clock, RefreshCw,
} from 'lucide-react'
import type { PaymentStatus2 } from '@/lib/store'

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

const STATUS_STYLE: Record<PaymentStatus2, string> = {
  PENDIENTE_DE_PAGO: 'bg-gray-100 text-gray-600',
  COMPROBANTE_CARGADO: 'bg-amber-100 text-amber-700 border border-amber-200',
  EN_REVISION: 'bg-blue-100 text-blue-700 border border-blue-200',
  PAGO_VALIDADO: 'bg-emerald-100 text-[#06C167] border border-emerald-200',
  PAGO_RECHAZADO: 'bg-red-100 text-red-600 border border-red-200',
  PAGO_PARCIAL: 'bg-amber-100 text-amber-700 border border-amber-200',
  CORRECCION_SOLICITADA: 'bg-gray-100 text-gray-700',
  ANULADO: 'bg-gray-100 text-gray-500',
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

  return (
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
            Revisión de pagos
            {pendingCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Valida comprobantes de transferencias y pagos digitales</p>
        </div>
        <button onClick={fetchPayments} className="h-9 w-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {approvedNote && (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#06C167] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#06C167]">Pago aprobado</p>
              <p className="text-xs text-[#06C167]/80 font-mono">{approvedNote.numero}</p>
            </div>
          </div>
          <button onClick={() => setApprovedNote(null)} className="text-xs text-[#06C167]/60 hover:text-[#06C167]">✕</button>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {(['COMPROBANTE_CARGADO', 'EN_REVISION', 'PAGO_VALIDADO', 'PAGO_RECHAZADO', 'CORRECCION_SOLICITADA', ''] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${filterStatus === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
          >
            {s ? STATUS_LABELS[s as PaymentStatus2] : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-10">Cargando…</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
          <Clock className="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No hay pagos en este estado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => {
            const isExpanded = expandedId === p.id
            const isLoading = actionLoading === p.id
            const latestReceipt = p.payment_receipts?.[p.payment_receipts.length - 1]
            const isPending = ['COMPROBANTE_CARGADO', 'EN_REVISION'].includes(p.status)

            return (
              <div key={p.id} className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
                <button
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">Mesa {p.table_sessions?.mesa ?? '—'}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{p.payment_methods?.nombre ?? 'Sin método'}</span>
                      <span>·</span>
                      <span className="font-medium text-gray-900">${p.monto_declarado ?? p.monto_requerido} {p.moneda}</span>
                      {p.monto_declarado && p.monto_declarado !== p.monto_requerido && (
                        <span className="text-amber-600">(req. ${p.monto_requerido})</span>
                      )}
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
                    {latestReceipt && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
                        <p className="text-xs font-semibold text-gray-900">Comprobante</p>
                        {latestReceipt.referencia && (
                          <p className="text-sm text-gray-900">Ref: <span className="font-mono">{latestReceipt.referencia}</span></p>
                        )}
                        {latestReceipt.file_url && (
                          <a href={latestReceipt.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 underline">
                            <ExternalLink className="h-3 w-3" />Ver imagen / PDF
                          </a>
                        )}
                        {latestReceipt.monto_declarado && (
                          <p className="text-xs text-gray-500">Monto declarado: <span className="font-medium text-gray-900">${latestReceipt.monto_declarado}</span></p>
                        )}
                      </div>
                    )}

                    {p.motivo_rechazo && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-xs text-red-600 font-medium">Motivo de rechazo:</p>
                        <p className="text-xs text-red-500/80 mt-0.5">{p.motivo_rechazo}</p>
                      </div>
                    )}

                    {p.notas_internas && (
                      <div className="p-2 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 font-medium">Notas internas:</p>
                        <p className="text-xs text-gray-900 mt-0.5">{p.notas_internas}</p>
                      </div>
                    )}

                    {p.payment_receipts.length > 1 && (
                      <p className="text-xs text-gray-400">{p.payment_receipts.length} comprobantes cargados en total</p>
                    )}

                    {canValidate && isPending && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleApprove(p.id)}
                          disabled={isLoading}
                          className="flex-1 h-9 rounded-xl bg-[#06C167] hover:bg-[#05a857] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />Aprobar
                        </button>
                        <button
                          onClick={() => { setCorrectionModal({ id: p.id }); setCorrectionNotas('') }}
                          disabled={isLoading}
                          className="flex-1 h-9 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />Corrección
                        </button>
                        <button
                          onClick={() => { setRejectModal({ id: p.id }); setRejectMotivo('') }}
                          disabled={isLoading}
                          className="flex-1 h-9 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />Rechazar
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-gray-900">Rechazar pago</h3>
            <div>
              <Label className="text-xs text-gray-500">Motivo (obligatorio)</Label>
              <Textarea value={rejectMotivo} onChange={e => setRejectMotivo(e.target.value)} placeholder="ej. El monto no coincide con el total de la cuenta." rows={3} className="mt-1 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleReject} disabled={!!actionLoading} className="flex-1 h-9 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold disabled:opacity-50">Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {correctionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setCorrectionModal(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-gray-900">Solicitar corrección</h3>
            <div>
              <Label className="text-xs text-gray-500">Instrucciones para el cliente (opcional)</Label>
              <Textarea value={correctionNotas} onChange={e => setCorrectionNotas(e.target.value)} placeholder="ej. Por favor incluye el número de referencia de la operación." rows={3} className="mt-1 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCorrectionModal(null)} className="flex-1 h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCorrection} disabled={!!actionLoading} className="flex-1 h-9 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-50">Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
