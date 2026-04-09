'use client'

import { useState } from 'react'
import { RotateCcw, DollarSign, Package, AlertTriangle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Order } from '@/lib/store'

interface RefundDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RefundDialog({ order, open, onOpenChange }: RefundDialogProps) {
  const { createRefund, currentUser } = useApp()
  const [tipo, setTipo] = useState<'total' | 'parcial'>('total')
  const [motivo, setMotivo] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [customAmount, setCustomAmount] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price)
  }
  
  const calculateTotal = () => {
    if (tipo === 'total') {
      return order.items.reduce((sum, item) => sum + (item.menuItem.precio * item.cantidad), 0)
    }
    
    if (selectedItems.length > 0) {
      return order.items
        .filter(item => selectedItems.includes(item.id))
        .reduce((sum, item) => sum + (item.menuItem.precio * item.cantidad), 0)
    }
    
    return customAmount
  }
  
  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }
  
  const handleSubmit = () => {
    if (!motivo.trim()) return
    // RBAC P1.7: solo admin puede procesar reembolsos
    if (!canDo(currentUser?.role, 'hacer_refund')) return
    
    setIsProcessing(true)
    
    const refundAmount = calculateTotal()
    const itemIds = tipo === 'parcial' && selectedItems.length > 0 ? selectedItems : undefined
    
    createRefund(
      order.id,
      refundAmount,
      motivo,
      tipo,
      itemIds,
      currentUser?.id
    )
    
    setTimeout(() => {
      setIsProcessing(false)
      onOpenChange(false)
      resetForm()
    }, 500)
  }
  
  const resetForm = () => {
    setTipo('total')
    setMotivo('')
    setSelectedItems([])
    setCustomAmount(0)
  }
  
  const refundAmount = calculateTotal()
  // RBAC P1.7: solo admin puede hacer refund
  const canSubmit = motivo.trim() && refundAmount > 0 && canDo(currentUser?.role, 'hacer_refund')
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Procesar Reembolso
          </DialogTitle>
          <DialogDescription>
            Pedido #{order.numero} - Este proceso revertira el inventario automaticamente
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Tipo de Reembolso */}
          <div className="space-y-2">
            <Label>Tipo de Reembolso</Label>
            <Select value={tipo} onValueChange={(v: 'total' | 'parcial') => setTipo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Reembolso Total</SelectItem>
                <SelectItem value="parcial">Reembolso Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Items para reembolso parcial */}
          {tipo === 'parcial' && (
            <div className="space-y-2">
              <Label>Selecciona los items a reembolsar</Label>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {order.items.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={item.id}
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleItemToggle(item.id)}
                    />
                    <label 
                      htmlFor={item.id}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.menuItem.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Cantidad: {item.cantidad}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatPrice(item.menuItem.precio * item.cantidad)}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
              
              {selectedItems.length === 0 && (
                <div className="space-y-2 pt-2">
                  <Label>O ingresa un monto personalizado</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(Number(e.target.value))}
                      className="pl-9"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Motivo */}
          <div className="space-y-2">
            <Label>Motivo del Reembolso *</Label>
            <Textarea
              placeholder="Describe el motivo del reembolso..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Resumen */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Resumen del Reembolso</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">{tipo === 'total' ? 'Total' : 'Parcial'}</span>
              </div>
              {tipo === 'parcial' && selectedItems.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items:</span>
                  <span className="font-medium">{selectedItems.length} seleccionados</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-amber-200">
                <span className="text-muted-foreground">Monto a reembolsar:</span>
                <span className="font-bold text-amber-800">{formatPrice(refundAmount)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <Package className="h-3 w-3" />
              <span>El inventario sera revertido automaticamente</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isProcessing ? 'Procesando...' : `Procesar Reembolso`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
