'use client'

import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AlertTriangle } from 'lucide-react'
import { type Order, type CancelReason, getCancelReasonLabel } from '@/lib/store'

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
  
  if (!order) return null
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Pedido #{order.numero}
          </DialogTitle>
          <DialogDescription>
            Esta accion no se puede deshacer. Los ingredientes seran restaurados al inventario.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Motivo de cancelacion</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as CancelReason)}>
              {CANCEL_REASONS.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="font-normal cursor-pointer">
                    {getCancelReasonLabel(r)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          {reason === 'otro' && (
            <div className="space-y-2">
              <Label htmlFor="motivo">Especificar motivo</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe el motivo de la cancelacion..."
                rows={3}
              />
            </div>
          )}
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-amber-800">Items que seran cancelados:</p>
            <ul className="mt-1 text-amber-700">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.cantidad}x {item.menuItem.nombre}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancel}
            disabled={isSubmitting || (reason === 'otro' && !motivo.trim())}
          >
            {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelacion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
