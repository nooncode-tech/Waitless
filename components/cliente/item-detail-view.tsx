'use client'

import { useState } from 'react'
import { ChevronLeft, ShoppingBag, Minus, Plus } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatPrice, type MenuItem, type Extra } from '@/lib/store'

interface ItemDetailViewProps {
  item: MenuItem
  onBack: () => void
  onAddToCart: () => void
  cartItemCount?: number
  canOrder?: boolean
}

export function ItemDetailView({ item, onBack, onAddToCart, cartItemCount = 0, canOrder = true }: ItemDetailViewProps) {
  const { addToCart } = useApp()
  const [cantidad, setCantidad] = useState(1)
  const [notas, setNotas] = useState('')
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([])
  
  const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.precio, 0)
  const total = (item.precio + extrasTotal) * cantidad
  
  const handleToggleExtra = (extra: Extra) => {
    setSelectedExtras(prev => {
      const exists = prev.find(e => e.id === extra.id)
      if (exists) {
        return prev.filter(e => e.id !== extra.id)
      }
      return [...prev, extra]
    })
  }
  
  const handleAddToCart = () => {
    addToCart(item, cantidad, notas || undefined, selectedExtras.length > 0 ? selectedExtras : undefined)
    onAddToCart()
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Hero Image with overlaid header */}
      <div className="relative">
        <div className="w-full aspect-[4/3] bg-secondary flex items-center justify-center rounded-b-[32px] overflow-hidden">
          {item.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imagen}
              alt={item.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-7xl">
              {item.categoria === 'cat-1' ? '🌮' : item.categoria === 'cat-2' ? '🫓' : item.categoria === 'cat-3' ? '🥤' : item.categoria === 'cat-4' ? '🍮' : '🍽️'}
            </span>
          )}
        </div>
        
        {/* Overlaid header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-3">
          <button 
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-sm"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          
          <button className="w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-sm relative">
            <ShoppingBag className="h-5 w-5 text-foreground" />
            {cartItemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pt-5 pb-28">
        {/* Title and description */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-foreground">{item.nombre}</h1>
          {item.descripcion && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {item.descripcion}
            </p>
          )}
        </div>

        {/* Extras */}
        {item.extras && item.extras.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Extras</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {item.extras.map((extra) => {
                const isSelected = selectedExtras.some(e => e.id === extra.id)
                return (
                  <button
                    key={extra.id}
                    onClick={() => handleToggleExtra(extra)}
                    className="flex items-center justify-between py-2 border-b border-border"
                  >
                    <div className="text-left">
                      <p className={`text-[13px] ${isSelected ? 'font-medium text-foreground' : 'text-foreground'}`}>
                        {extra.nombre}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatPrice(extra.precio)}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-primary border-primary' 
                        : 'border-muted-foreground/30'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Notes */}
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-foreground mb-2">Notas especiales</h2>
          <Textarea
            placeholder="Ej: Sin cebolla, extra salsa..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="resize-none text-sm rounded-xl border-border"
            rows={2}
            disabled={!canOrder}
          />
        </div>
        
        {/* Quantity */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Cantidad</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCantidad(Math.max(1, cantidad - 1))}
              disabled={cantidad <= 1 || !canOrder}
              className="w-10 h-10 flex items-center justify-center border border-border rounded-xl disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-base font-semibold text-foreground w-8 text-center">
              {cantidad}
            </span>
            <button
              onClick={() => setCantidad(cantidad + 1)}
              disabled={!canOrder}
              className="w-10 h-10 flex items-center justify-center border border-border rounded-xl disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Add to Cart Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 max-w-md mx-auto">
        <Button
          className="w-full bg-foreground hover:bg-foreground/90 text-background h-12 text-sm font-semibold rounded-xl disabled:opacity-50"
          onClick={handleAddToCart}
          disabled={!canOrder}
        >
          {canOrder ? `Agregar al carrito - ${formatPrice(total)}` : 'No puedes agregar más platillos'}
        </Button>
      </div>
    </div>
  )
}
