'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice, type MenuItem } from '@/lib/store'

interface AddOrderDialogProps {
  mesa: number
  menuItems: MenuItem[]
  onClose: () => void
}

interface CartItem {
  item: MenuItem
  cantidad: number
}

export function AddOrderDialog({ mesa, menuItems, onClose }: AddOrderDialogProps) {
  const { addToCart, createOrder, cart, getActiveTables } = useApp()
  const [search, setSearch] = useState('')
  const [localCart, setLocalCart] = useState<CartItem[]>([])
  const [pendingOrder, setPendingOrder] = useState(false)
  const [seatNumber, setSeatNumber] = useState<number | null>(null)
  const pendingItemCount = useRef(0)

  const tableCapacity = getActiveTables().find(t => t.numero === mesa)?.capacidad ?? 4

  // Watch for cart to be populated after adding items, then create the order
  useEffect(() => {
    if (pendingOrder && cart.length >= pendingItemCount.current && pendingItemCount.current > 0) {
      createOrder('mesero', mesa, undefined, seatNumber || undefined)
      setPendingOrder(false) // eslint-disable-line react-hooks/set-state-in-effect -- resetting coordination flag after order creation, intentional
      pendingItemCount.current = 0
      onClose()
    }
  }, [pendingOrder, cart, createOrder, mesa, seatNumber, onClose])
  
  const filteredItems = menuItems.filter((item) =>
    item.nombre.toLowerCase().includes(search.toLowerCase())
  )
  
  const addItem = (item: MenuItem) => {
    setLocalCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) {
        return prev.map(c => 
          c.item.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c
        )
      }
      return [...prev, { item, cantidad: 1 }]
    })
  }
  
  const removeItem = (itemId: string) => {
    setLocalCart(prev => {
      const existing = prev.find(c => c.item.id === itemId)
      if (existing && existing.cantidad > 1) {
        return prev.map(c =>
          c.item.id === itemId ? { ...c, cantidad: c.cantidad - 1 } : c
        )
      }
      return prev.filter(c => c.item.id !== itemId)
    })
  }
  
  const getItemQuantity = (itemId: string) => {
    return localCart.find(c => c.item.id === itemId)?.cantidad || 0
  }
  
  const total = localCart.reduce((sum, c) => sum + c.item.precio * c.cantidad, 0)
  
  const handleConfirm = () => {
    if (localCart.length === 0) return
    // Track how many distinct cart entries we expect
    pendingItemCount.current = localCart.length
    // Add items to global cart
    localCart.forEach(({ item, cantidad }) => {
      addToCart(item, cantidad)
    })
    // Set flag so the useEffect picks up when cart is ready
    setPendingOrder(true)
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">Agregar pedido</h2>
            <p className="text-xs text-muted-foreground">Mesa {mesa}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Seat Selector */}
        <div className="p-3 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">Asiento (opcional)</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: tableCapacity }, (_, i) => i + 1).map((seat) => (
              <Button
                key={seat}
                variant={seatNumber === seat ? 'default' : 'outline'}
                size="sm"
                className={`h-8 w-8 p-0 text-xs font-semibold ${seatNumber === seat ? 'bg-primary text-primary-foreground' : 'bg-transparent'}`}
                onClick={() => setSeatNumber(prev => prev === seat ? null : seat)}
              >
                {seat}
              </Button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <Input
            type="search"
            placeholder="Buscar platillo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        
        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid gap-1.5">
            {filteredItems.map((item) => {
              const qty = getItemQuantity(item.id)
              const is86d = !item.disponible
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    is86d ? 'bg-secondary/50 opacity-60' : 'bg-secondary'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className={`font-medium text-sm truncate ${is86d ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.nombre}
                      </h3>
                      {is86d && (
                        <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1 py-0.5 rounded shrink-0">
                          86
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-primary font-medium">
                      {formatPrice(item.precio)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {qty > 0 && !is86d && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 bg-transparent"
                          onClick={() => removeItem(item.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center text-xs font-medium text-foreground">
                          {qty}
                        </span>
                      </>
                    )}
                    <Button
                      variant={qty > 0 ? 'outline' : 'default'}
                      size="icon"
                      className={`h-6 w-6 ${qty === 0 ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => !is86d && addItem(item)}
                      disabled={is86d}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Footer */}
        {localCart.length > 0 && (
          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {localCart.reduce((sum, c) => sum + c.cantidad, 0)} artículos
                </p>
                <p className="text-sm font-bold text-foreground">
                  Total: {formatPrice(total)}
                </p>
              </div>
              <Button
                className="bg-primary text-primary-foreground h-8 text-xs px-4"
                onClick={handleConfirm}
              >
                Confirmar pedido
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
