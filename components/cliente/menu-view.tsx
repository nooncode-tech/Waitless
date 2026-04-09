'use client'

import { useState } from 'react'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { Search, ShoppingBag, ChevronLeft, Plus, SlidersHorizontal, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice, type MenuItem, canPrepareItem } from '@/lib/store'

interface MenuViewProps {
  mesa: number
  onSelectItem: (item: MenuItem) => void
  onGoToCart: () => void
  cartItemCount: number
  hasActiveOrders: boolean
  onViewStatus: () => void
  onExit: () => void
  canOrder?: boolean
}

export function MenuView({
  mesa,
  onSelectItem,
  onGoToCart,
  cartItemCount,
  hasActiveOrders,
  onViewStatus,
  onExit,
  canOrder = true,
}: MenuViewProps) {
  const { menuItems, ingredients, categories, config } = useApp()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // Filter items but keep unavailable ones visible
  const filteredItems = menuItems.filter((item) => {
    if (search && !item.nombre.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedCategory && item.categoria !== selectedCategory) return false
    return true
  })

  // Categorías activas ordenadas (fuente de verdad: Supabase via context)
  const activeCategories = categories.filter(c => c.activa).sort((a, b) => a.orden - b.orden)

  // Group items by category ID when no category is selected
  const itemsByCategory = selectedCategory
    ? { [selectedCategory]: filteredItems }
    : activeCategories.reduce((acc, cat) => {
        const items = filteredItems.filter(item => item.categoria === cat.id)
        if (items.length > 0) acc[cat.id] = items
        return acc
      }, {} as Record<string, MenuItem[]>)

  const getItemAvailability = (item: MenuItem): { canPrepare: boolean; maxPortions: number; reason: 'ok' | '86d' | 'agotado' } => {
    if (!item.disponible) {
      return { canPrepare: false, maxPortions: 0, reason: '86d' }
    }
    const result = canPrepareItem(item, ingredients)
    return { ...result, reason: result.canPrepare ? 'ok' : 'agotado' }
  }

  const getCategoryEmoji = (categoriaId: string) => {
    switch (categoriaId) {
      case 'cat-1': return '🌮'
      case 'cat-2': return '🫓'
      case 'cat-3': return '🥤'
      case 'cat-4': return '🍮'
      default: return '🍽️'
    }
  }

  const getCategoryName = (categoriaId: string) =>
    activeCategories.find(c => c.id === categoriaId)?.nombre ?? categoriaId
  
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white">
        <div className="px-4 pt-3 pb-2">
          {/* Top bar with back, logo, and cart */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onExit}
              className="w-8 h-8 flex items-center justify-center"
              aria-label="Volver"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" aria-hidden="true" />
            </button>
            
            <div className="flex items-center gap-1.5">
              {config.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.logoUrl} alt={config.restaurantName || 'Logo'} className="h-6 w-auto object-contain" />
              )}
              <span className="text-xs font-medium text-muted-foreground">
                {config.restaurantName ? config.restaurantName : `Mesa ${mesa}`}
              </span>
            </div>
            
            <button
              onClick={onGoToCart}
              className="w-8 h-8 flex items-center justify-center relative"
              disabled={!canOrder}
              aria-label={cartItemCount > 0 ? `Ver carrito, ${cartItemCount} item${cartItemCount !== 1 ? 's' : ''}` : 'Ver carrito'}
            >
              <ShoppingBag className={`h-5 w-5 ${canOrder ? 'text-foreground' : 'text-muted-foreground'}`} aria-hidden="true" />
              {cartItemCount > 0 && canOrder && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* Payment requested banner */}
          {!canOrder && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-[11px] text-amber-700">
                Pago en proceso. No puedes agregar más platillos.
              </p>
            </div>
          )}

          {/* Categories */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Categorías</span>
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-[11px] text-primary font-medium"
              >
                Ver todo
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {activeCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>
          
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <label htmlFor="menu-search" className="sr-only">Buscar platillos</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="menu-search"
                type="search"
                placeholder="Buscar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-secondary border-0 rounded-xl"
              />
            </div>
            <button
              className="w-9 h-9 flex items-center justify-center bg-secondary rounded-xl"
              aria-label="Filtros"
            >
              <SlidersHorizontal className="h-4 w-4 text-foreground" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Menu Items */}
      <main className="flex-1 px-4 pb-4">
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={category} className="mb-4">
            <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <span>{getCategoryEmoji(category)}</span>
              {getCategoryName(category)}
            </h2>
            <div className="space-y-2">
              {items.map((item) => {
                const availability = getItemAvailability(item)
                const isAvailable = availability.canPrepare
                const showLowStock = isAvailable && availability.maxPortions <= 5 && availability.maxPortions > 0
                const unavailableLabel = availability.reason === '86d' ? 'NO DISPONIBLE' : 'AGOTADO'
                
                return (
                  <div
                    key={item.id}
                    role={isAvailable && canOrder ? 'button' : undefined}
                    tabIndex={isAvailable && canOrder ? 0 : undefined}
                    aria-disabled={!isAvailable || !canOrder}
                    aria-label={isAvailable && canOrder ? `${item.nombre}, ${formatPrice(item.precio)}` : `${item.nombre}, no disponible`}
                    className={`flex items-center gap-3 py-2 ${
                      isAvailable && canOrder ? 'cursor-pointer' : 'opacity-60'
                    }`}
                    onClick={() => isAvailable && canOrder && onSelectItem(item)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && isAvailable && canOrder) {
                        e.preventDefault()
                        onSelectItem(item)
                      }
                    }}
                  >
                    {/* Image */}
                    <div className={`w-16 h-16 bg-secondary rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center relative ${
                      !isAvailable ? 'grayscale' : ''
                    }`}>
                      {item.imagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">{getCategoryEmoji(item.categoria)}</span>
                      )}
                      {!isAvailable && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded text-center leading-tight">
                            {unavailableLabel}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-[13px] text-foreground leading-tight">
                          {item.nombre}
                        </h3>
                        {showLowStock && (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                            Últimos {availability.maxPortions}
                          </span>
                        )}
                      </div>
                      {item.descripcion && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {item.descripcion}
                        </p>
                      )}
                      <p className={`text-[13px] font-semibold mt-1 ${
                        isAvailable ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {formatPrice(item.precio)}
                      </p>
                    </div>

                    {/* Add button */}
                    {isAvailable && canOrder && (
                      <button
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`Agregar ${item.nombre}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectItem(item)
                        }}
                      >
                        <Plus className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No se encontraron platillos</p>
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
      {hasActiveOrders && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-border p-3 max-w-md mx-auto">
          <Button
            variant="outline"
            className="w-full gap-2 bg-transparent h-10 text-sm rounded-xl"
            onClick={onViewStatus}
          >
            Ver estado de mis pedidos
          </Button>
        </div>
      )}
    </div>
  )
}
