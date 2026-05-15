'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { type Order, type OrderItem, formatPrice } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

interface EditOrderDialogProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

export function EditOrderDialog({ order, open, onOpenChange, onUpdated }: EditOrderDialogProps) {
  const { updateOrderItems, canEditOrder } = useApp()
  const [items, setItems] = useState<OrderItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (order) {
      setItems([...order.items]) // eslint-disable-line react-hooks/set-state-in-effect -- syncing local edit state from order prop when dialog opens, intentional
    }
  }, [order])

  const handleQuantityChange = (itemId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, cantidad: Math.max(1, item.cantidad + delta) }
      }
      return item
    }))
  }

  const handleNotesChange = (itemId: string, notas: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, notas } : item
    ))
  }

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handleSave = () => {
    if (!order || items.length === 0) return
    setIsSubmitting(true)
    const success = updateOrderItems(order.id, items)
    setIsSubmitting(false)
    if (success) {
      onOpenChange(false)
      onUpdated?.()
    }
  }

  const calculateTotal = () =>
    items.reduce((sum, item) => {
      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
      return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
    }, 0)

  if (!order || !open) return null

  const canEdit = canEditOrder(order.id)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Editar Pedido #{order.numero}</h2>
            <p style={{ fontSize: 13, color: '#666', marginTop: 4, margin: '4px 0 0' }}>
              {canEdit
                ? 'Modifica cantidades o notas antes de que se empiecen a preparar.'
                : 'Este pedido ya no se puede editar porque está en preparación.'}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid #E5E5E5', background: '#FAFAFA', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {canEdit ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {items.map((item) => (
                <div key={item.id} style={{ border: '1px solid #E5E5E5', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>{item.menuItem.nombre}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{formatPrice(item.menuItem.precio)} c/u</div>
                      {item.extras && item.extras.length > 0 && (
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                          Extras: {item.extras.map(e => e.nombre).join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={item.cantidad <= 1}
                        style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: item.cantidad <= 1 ? '#F5F5F5' : '#fff', cursor: item.cantidad <= 1 ? 'default' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.cantidad <= 1 ? '#CCC' : '#333' }}
                      >−</button>
                      <span style={{ width: 28, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{item.cantidad}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, 1)}
                        style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}
                      >+</button>
                      {items.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF5F5', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991B1B' }}
                        >✕</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Notas</p>
                    <textarea
                      value={item.notas || ''}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      placeholder="Ej: Sin cebolla..."
                      rows={2}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E5E5', fontSize: 13, fontFamily: FONT, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#333', marginTop: 6 }}>
                    Subtotal: {formatPrice((item.menuItem.precio + (item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0)) * item.cantidad)}
                  </div>
                </div>
              ))}

              <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Total del pedido:</span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{formatPrice(calculateTotal())}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => onOpenChange(false)}
                style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid #E5E5E5', background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, color: '#333' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting || items.length === 0}
                style={{
                  flex: 1, height: 44, borderRadius: 10, border: 'none',
                  background: isSubmitting || items.length === 0 ? '#CCC' : '#000',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: isSubmitting || items.length === 0 ? 'default' : 'pointer', fontFamily: FONT,
                }}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
              El pedido está en estado &quot;{order.status}&quot; y no puede ser modificado.
            </p>
            <button
              onClick={() => onOpenChange(false)}
              style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid #E5E5E5', background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
