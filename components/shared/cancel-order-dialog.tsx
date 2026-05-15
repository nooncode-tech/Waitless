'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { type Order, type CancelReason, getCancelReasonLabel } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface CancelOrderDialogProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelled?: () => void
}

const CANCEL_REASONS: CancelReason[] = [
  'cliente_solicito',
  'sin_ingredientes',
  'error_pedido',
  'tiempo_excedido',
  'otro',
]

export function CancelOrderDialog({ order, open, onOpenChange, onCancelled }: CancelOrderDialogProps) {
  const { cancelOrder, currentUser } = useApp()
  const [reason, setReason] = useState<CancelReason>('cliente_solicito')
  const [motivo, setMotivo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCancel = () => {
    if (!order) return
    setIsSubmitting(true)
    const success = cancelOrder(order.id, reason, motivo || undefined, currentUser?.id)
    setIsSubmitting(false)
    if (success) {
      onOpenChange(false)
      setReason('cliente_solicito')
      setMotivo('')
      onCancelled?.()
    }
  }

  if (!order || !open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#991B1B', margin: 0 }}>
              Cancelar Pedido #{order.numero}
            </h2>
          </div>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            Esta acción no se puede deshacer. Los ingredientes serán restaurados al inventario.
          </p>
        </div>

        {/* Reason selector */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Motivo de cancelación
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CANCEL_REASONS.map((r) => (
              <label
                key={r}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10,
                  border: `1px solid ${reason === r ? '#000' : '#E5E5E5'}`,
                  background: reason === r ? '#000' : '#FAFAFA',
                  cursor: 'pointer', fontSize: 13, fontWeight: reason === r ? 700 : 400,
                  color: reason === r ? '#fff' : '#333', fontFamily: FONT,
                }}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  style={{ display: 'none' }}
                />
                <span style={{ width: 14, height: 14, borderRadius: 999, border: `2px solid ${reason === r ? '#fff' : '#999'}`, background: reason === r ? '#fff' : 'transparent', flexShrink: 0 }} />
                {getCancelReasonLabel(r)}
              </label>
            ))}
          </div>
        </div>

        {reason === 'otro' && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              Especificar motivo
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe el motivo de la cancelación..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E5E5', fontSize: 13, fontFamily: FONT, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* Items summary */}
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: 12, marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 6 }}>Items que serán cancelados:</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {order.items.map((item) => (
              <li key={item.id} style={{ fontSize: 13, color: '#B45309' }}>
                {item.cantidad}× {item.menuItem.nombre}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onOpenChange(false)}
            style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid #E5E5E5', background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, color: '#333' }}
          >
            Volver
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting || (reason === 'otro' && !motivo.trim())}
            style={{
              flex: 1, height: 44, borderRadius: 10, border: 'none',
              background: isSubmitting || (reason === 'otro' && !motivo.trim()) ? '#FCA5A5' : '#991B1B',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: isSubmitting || (reason === 'otro' && !motivo.trim()) ? 'default' : 'pointer',
              fontFamily: FONT,
            }}
          >
            {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelación'}
          </button>
        </div>
      </div>
    </div>
  )
}
