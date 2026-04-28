'use client'

import { useState } from 'react'
import { ChevronLeft, Minus, Plus, Trash2, ShoppingBag, Phone, Gift, Armchair } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/store'

interface CartViewProps {
  mesa: number
  onBack: () => void
  onOrderConfirmed: (subtotal: number) => void
  loyaltyPhone: string
  onSetLoyaltyPhone: (tel: string) => void
}

export function CartView({ mesa, onBack, onOrderConfirmed, loyaltyPhone, onSetLoyaltyPhone }: CartViewProps) {
  const { cart, updateCartItem, removeFromCart, createOrder, getLoyaltyCustomer, identifyCustomer } = useApp()
  const [phoneInput, setPhoneInput] = useState(loyaltyPhone)
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [seatNumber, setSeatNumber] = useState<number | null>(null)

  const customer = loyaltyPhone ? getLoyaltyCustomer(loyaltyPhone) : undefined

  const subtotal = cart.reduce((sum, item) => {
    const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
    return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
  }, 0)

  const puntosGanados = Math.floor(subtotal / 10)

  const handleIdentify = () => {
    if (phoneInput.trim().length >= 8) {
      identifyCustomer(phoneInput.trim())
      onSetLoyaltyPhone(phoneInput.trim())
      setShowPhoneInput(false)
    }
  }

  const handleConfirm = () => {
    createOrder('mesa', mesa, undefined, seatNumber ?? undefined)
    onOrderConfirmed(subtotal)
  }
  
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
        {/* Header */}
        <header className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <span className="text-sm font-semibold text-foreground">Tu pedido</span>
            <div className="w-8" />
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Tu carrito está vacío</h2>
            <p className="text-sm text-muted-foreground mt-1">Agrega platillos del menú</p>
            <Button
              className="mt-5 bg-foreground text-background h-10 px-6 text-sm rounded-xl"
              onClick={onBack}
            >
              Ver menú
            </Button>
          </div>
        </main>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background px-4 pt-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="text-center">
            <span className="text-sm font-semibold text-foreground">Tu pedido</span>
            <p className="text-[11px] text-muted-foreground">Mesa {mesa}</p>
          </div>
          <div className="w-8" />
        </div>
      </header>

      {/* Cart Items */}
      <main className="flex-1 px-4 py-4 pb-48">
        <div className="space-y-3">
          {cart.map((item) => {
            const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
            const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad
            
            return (
              <div key={item.id} className="flex gap-3 py-2">
                {/* Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-secondary">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img
    src={item.menuItem.imagen || "/placeholder-food.png"}
    alt={item.menuItem.nombre}
    className="w-full h-full object-cover"
  />
</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-[13px] text-foreground leading-tight">
                        {item.menuItem.nombre}
                      </h3>
                      
                      {/* Extras */}
                      {item.extras && item.extras.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          + {item.extras.map(e => e.nombre).join(', ')}
                        </p>
                      )}
                      
                      {/* Notes */}
                      {item.notas && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                          &quot;{item.notas}&quot;
                        </p>
                      )}
                    </div>
                    
                    <button
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-2">
                      <button
                        className="w-7 h-7 flex items-center justify-center border border-border rounded-lg"
                        onClick={() => {
                          if (item.cantidad > 1) {
                            updateCartItem(item.id, item.cantidad - 1)
                          } else {
                            removeFromCart(item.id)
                          }
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-[13px] font-semibold text-foreground w-5 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        className="w-7 h-7 flex items-center justify-center border border-border rounded-lg"
                        onClick={() => updateCartItem(item.id, item.cantidad + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <p className="font-semibold text-[13px] text-foreground">
                      {formatPrice(itemTotal)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Bottom Summary */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 space-y-3 max-w-md mx-auto">

        {/* Loyalty widget */}
        {!loyaltyPhone && !showPhoneInput && (
          <button
            onClick={() => setShowPhoneInput(true)}
            className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:border-foreground transition-colors"
          >
            <Gift className="h-3.5 w-3.5 shrink-0" />
            <span>Acumula puntos — identifícate con tu teléfono</span>
          </button>
        )}

        {showPhoneInput && (
          <div className="flex gap-2">
            <div className="flex-1 flex items-center border border-border rounded-xl px-3 gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="Número de teléfono"
                className="flex-1 text-xs py-2 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                onKeyDown={e => e.key === 'Enter' && handleIdentify()}
                autoFocus
              />
            </div>
            <button
              onClick={handleIdentify}
              disabled={phoneInput.trim().length < 8}
              className="px-3 h-9 bg-foreground text-background text-xs font-semibold rounded-xl disabled:opacity-40"
            >
              OK
            </button>
            <button
              onClick={() => setShowPhoneInput(false)}
              className="px-3 h-9 border border-border text-xs text-muted-foreground rounded-xl"
            >
              ×
            </button>
          </div>
        )}

        {customer && (
          <div className="flex items-center justify-between px-3 py-2 bg-success/10 border border-success/20 rounded-xl">
            <div className="flex items-center gap-2">
              <Gift className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-semibold text-success">
                {customer.puntos} puntos acumulados
              </span>
            </div>
            {puntosGanados > 0 && (
              <span className="text-[10px] text-success">+{puntosGanados} con este pedido</span>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </div>

        {/* Seat selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Armchair className="h-3.5 w-3.5" />
            <span>¿En qué asiento estás? El mesero te lo lleva ahí. <span className="opacity-60">(opcional)</span></span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[1,2,3,4,5,6,7,8].map(n => (
              <button
                key={n}
                onClick={() => setSeatNumber(seatNumber === n ? null : n)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold border transition-colors ${
                  seatNumber === n
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-border hover:border-foreground'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full bg-foreground hover:bg-foreground/90 text-background h-12 text-sm font-semibold rounded-xl"
          onClick={handleConfirm}
        >
          Confirmar pedido
        </Button>

        <button
          className="w-full text-sm text-muted-foreground py-1"
          onClick={onBack}
        >
          Seguir agregando
        </button>
      </div>
    </div>
  )
}
