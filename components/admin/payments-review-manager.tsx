'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle2, XCircle, AlertCircle, ExternalLink,
  ChevronDown, ChevronUp, Clock, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentStatus2 } from '@/lib/store'

interface Receipt {
  id: string
  file_url: string | null
  file_type: string | null
  referencia: string | null
  monto_declarado: number | null
  review_status: string
  created_at: string
}

interface PaymentRow {
  id: string
  status: PaymentStatus2
  monto_requerido: number
  monto_declarado: number | null
  moneda: string
  motivo_rechazo: string | null
  notas_internas: string | null
  created_at: string
  updated_at: string
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

const STATUS_VARIANT: Record<PaymentStatus2, string> = {
  PENDIENTE_DE_PAGO: 'bg-muted text-muted-foreground',
  COMPROBANTE_CARGADO: 'bg-warning/15 text-warning border-warning/30',
  EN_REVISION: 'bg-primary/10 text-primary border-primary/30',
  PAGO_VALIDADO: 'bg-success/10 text-success border-success/30',
  PAGO_RECHAZADO: 'bg-destructive/10 text-destructive border-destructive/30',
  PAGO_PARCIAL: 'bg-warning/10 text-warning border-warning/30',
  CORRECCION_SOLICITADA: 'bg-secondary text-secondary-foreground',
  ANULADO: 'bg-muted text-muted-foreground',
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

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/admin/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setPayments(json.payments ?? [])
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
      if (!res.ok) {
        const j = await res.json()
        alert(j.error ?? 'Error al procesar la acción')
        return false
      }
      return true
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprove = async (paymentId: string) => {
    if (!confirm('¿Aprobar este pago y generar nota interna?')) return
    const ok = await callAction(paymentId, 'approve')
    if (ok) fetchPayments()
  }

  const handleReject = async () => {
    if (!rejectModal) return
    if (!rejectMotivo.trim()) { alert('El motivo es obligatorio'); return }
    const ok = await callAction(rejectModal.id, 'reject', { motivo: rejectMotivo })
    if (ok) { setRejectModal(null); setRejectMotivo(''); fetchPayments() }
  }

  const handleCorrection = async () => {
    if (!correctionModal) return
    const ok = await callAction(correctionModal.id, 'correction', { notas: correctionNotas })
    if (ok) { setCorrectionModal(null); setCorrectionNotas(''); fetchPayments() }
  }

  const pendingCount = payments.filter(
    p => p.status === 'COMPROBANTE_CARGADO' || p.status === 'EN_REVISION'
  ).length

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            Revisión de pagos
            {pendingCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-destructive text-background rounded-full">
                {pendingCount}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Valida comprobantes de transferencias y pagos digitales</p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchPayments}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filtro de status */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {(['COMPROBANTE_CARGADO', 'EN_REVISION', 'PAGO_VALIDADO', 'PAGO_RECHAZADO', 'CORRECCION_SOLICITADA', ''] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors',
              filterStatus === s
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
            )}
          >
            {s ? STATUS_LABELS[s as PaymentStatus2] : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-10">Cargando…</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay pagos en este estado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => {
            const isExpanded = expandedId === p.id
            const isLoading = actionLoading === p.id
            const latestReceipt = p.payment_receipts?.[p.payment_receipts.length - 1]
            const isPending = ['COMPROBANTE_CARGADO', 'EN_REVISION'].includes(p.status)

            return (
              <div key={p.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        Mesa {p.table_sessions?.mesa ?? '—'}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                          STATUS_VARIANT[p.status]
                        )}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{p.payment_methods?.nombre ?? 'Sin método'}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">
                        ${p.monto_declarado ?? p.monto_requerido} {p.moneda}
                      </span>
                      {p.monto_declarado && p.monto_declarado !== p.monto_requerido && (
                        <span className="text-warning">(req. ${p.monto_requerido})</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border">
                    {/* Comprobante */}
                    {latestReceipt && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg space-y-2">
                        <p className="text-xs font-semibold text-foreground">Comprobante</p>
                        {latestReceipt.referencia && (
                          <p className="text-sm text-foreground">Ref: <span className="font-mono">{latestReceipt.referencia}</span></p>
                        )}
                        {latestReceipt.file_url && (
                          <a
                            href={latestReceipt.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver imagen / PDF
                          </a>
                        )}
                        {latestReceipt.monto_declarado && (
                          <p className="text-xs text-muted-foreground">
                            Monto declarado: <span className="font-medium text-foreground">${latestReceipt.monto_declarado}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Notas de rechazo */}
                    {p.motivo_rechazo && (
                      <div className="p-2 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <p className="text-xs text-destructive font-medium">Motivo de rechazo:</p>
                        <p className="text-xs text-destructive/80 mt-0.5">{p.motivo_rechazo}</p>
                      </div>
                    )}

                    {p.notas_internas && (
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground font-medium">Notas internas:</p>
                        <p className="text-xs text-foreground mt-0.5">{p.notas_internas}</p>
                      </div>
                    )}

                    {/* Historial de comprobantes */}
                    {p.payment_receipts.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {p.payment_receipts.length} comprobantes cargados en total
                      </p>
                    )}

                    {/* Acciones */}
                    {canValidate && isPending && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 h-9 gap-1.5 bg-success hover:bg-success/90 text-background"
                          onClick={() => handleApprove(p.id)}
                          disabled={isLoading}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-9 gap-1.5 border-warning text-warning hover:bg-warning/10"
                          onClick={() => { setCorrectionModal({ id: p.id }); setCorrectionNotas('') }}
                          disabled={isLoading}
                        >
                          <AlertCircle className="h-4 w-4" />
                          Corrección
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-9 gap-1.5 border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() => { setRejectModal({ id: p.id }); setRejectMotivo('') }}
                          disabled={isLoading}
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setRejectModal(null)}>
          <div
            className="bg-background rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-4 space-y-4"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-foreground">Rechazar pago</h3>
            <div>
              <Label className="text-xs">Motivo (obligatorio)</Label>
              <Textarea
                value={rejectMotivo}
                onChange={e => setRejectMotivo(e.target.value)}
                placeholder="ej. El monto no coincide con el total de la cuenta."
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setRejectModal(null)}>Cancelar</Button>
              <Button
                className="flex-1 h-10 bg-destructive hover:bg-destructive/90 text-background"
                onClick={handleReject}
                disabled={!!actionLoading}
              >
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal corrección */}
      {correctionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setCorrectionModal(null)}>
          <div
            className="bg-background rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-4 space-y-4"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-foreground">Solicitar corrección</h3>
            <div>
              <Label className="text-xs">Instrucciones para el cliente (opcional)</Label>
              <Textarea
                value={correctionNotas}
                onChange={e => setCorrectionNotas(e.target.value)}
                placeholder="ej. Por favor incluye el número de referencia de la operación."
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setCorrectionModal(null)}>Cancelar</Button>
              <Button
                className="flex-1 h-10"
                onClick={handleCorrection}
                disabled={!!actionLoading}
              >
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
