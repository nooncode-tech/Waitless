'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Minus, Plus, Trash2, Edit3 } from 'lucide-react'
import { type Order, type OrderItem, formatPrice } from '@/lib/store'

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
        const newCantidad = Math.max(1, item.cantidad + delta)
        return { ...item, cantidad: newCantidad }
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
    if (items.length <= 1) return // Must have at least one item
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
  
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
      return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
    }, 0)
  }
  
  if (!order) return null
  
  const canEdit = canEditOrder(order.id)
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editar Pedido #{order.numero}
          </DialogTitle>
          <DialogDescription>
            {canEdit 
              ? 'Modifica las cantidades o notas de los items antes de que se empiecen a preparar.'
              : 'Este pedido ya no se puede editar porque esta en preparacion.'}
          </DialogDescription>
        </DialogHeader>
        
        {canEdit ? (
          <>
            <div className="space-y-4 py-4">
              {items.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.menuItem.nombre}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.menuItem.precio)} c/u
                      </p>
                      {item.extras && item.extras.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Extras: {item.extras.map(e => e.nombre).join(', ')}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-transparent"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={item.cantidad <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.cantidad}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-transparent"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor={`notas-${item.id}`} className="text-xs">Notas</Label>
                    <Textarea
                      id={`notas-${item.id}`}
                      value={item.notas || ''}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      placeholder="Ej: Sin cebolla..."
                      rows={2}
                      className="mt-1 text-sm"
                    />
                  </div>
                  
                  <div className="text-right text-sm font-medium">
                    Subtotal: {formatPrice((item.menuItem.precio + (item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0)) * item.cantidad)}
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-medium">Total del pedido:</span>
                <span className="text-lg font-bold">{formatPrice(calculateTotal())}</span>
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting || items.length === 0}>
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              El pedido ya esta en estado &quot;{order.status}&quot; y no puede ser modificado.
            </p>
            <Button variant="outline" className="mt-4 bg-transparent" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
