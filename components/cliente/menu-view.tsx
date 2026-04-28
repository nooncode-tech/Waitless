'use client'

import { useState } from 'react'
import { Search, Plus, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/context'
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
  canOrder = true,
}: MenuViewProps) {
  const { menuItems, ingredients, categories, config } = useApp()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredItems = menuItems.filter((item) => {
    if (search && !item.nombre.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedCategory && item.categoria !== selectedCategory) return false
    return true
  })

  const activeCategories = categories.filter(c => c.activa).sort((a, b) => a.orden - b.orden)

  const itemsByCategory = selectedCategory
    ? { [selectedCategory]: filteredItems }
    : activeCategories.reduce((acc, cat) => {
        const items = filteredItems.filter(item => item.categoria === cat.id)
        if (items.length > 0) acc[cat.id] = items
        return acc
      }, {} as Record<string, MenuItem[]>)

  const getItemAvailability = (item: MenuItem) => {
    if (!item.disponible) return { canPrepare: false, maxPortions: 0, reason: '86d' as const }
    const result = canPrepareItem(item, ingredients)
    return { ...result, reason: result.canPrepare ? 'ok' as const : 'agotado' as const }
  }

  const getCategoryEmoji = (categoriaId: string) => {
    const name = activeCategories.find(c => c.id === categoriaId)?.nombre?.toLowerCase() ?? ''
    if (/taco|antoj|mexic/.test(name)) return '🌮'
    if (/sand|torta|burger|hambur/.test(name)) return '🫓'
    if (/bebida|drink|agua|refresc|jugo/.test(name)) return '🥤'
    if (/postre|dulce|pastel|helado/.test(name)) return '🍮'
    if (/pizza/.test(name)) return '🍕'
    if (/sushi|japan/.test(name)) return '🍱'
    if (/ensalada|salad/.test(name)) return '🥗'
    if (/carne|steak|rib/.test(name)) return '🥩'
    if (/pasta|spaghetti/.test(name)) return '🍝'
    return '🍽️'
  }

  const getCategoryName = (categoriaId: string) =>
    activeCategories.find(c => c.id === categoriaId)?.nombre ?? categoriaId

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border/50">
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Restaurant hero text */}
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">
              {config.restaurantName ?? `Mesa ${mesa}`}
            </h1>
            {config.descripcion && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                {config.descripcion}
              </p>
            )}
          </div>

          {/* Ordering blocked banner */}
          {!canOrder && (
            <div className="flex items-center gap-2 p-2.5 bg-warning/10 border border-warning/30 rounded-xl">
              <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
              <p className="text-xs text-warning font-medium">
                Pago en proceso — no puedes agregar más platillos.
              </p>
            </div>
          )}

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                !selectedCategory
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Todo
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <label htmlFor="menu-search" className="sr-only">Buscar platillos</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="menu-search"
              type="search"
              placeholder="Buscar en el menú..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm bg-secondary border-0 rounded-xl"
            />
          </div>
        </div>
      </header>

      {/* Menu content */}
      <main className="flex-1 px-4 py-4 pb-36">
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <section key={category} className="mb-8">
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <span aria-hidden="true">{getCategoryEmoji(category)}</span>
              {getCategoryName(category)}
            </h2>

            <div className="space-y-3">
              {items.map((item) => {
                const availability = getItemAvailability(item)
                const isAvailable = availability.canPrepare
                const showLowStock = isAvailable && availability.maxPortions <= 5 && availability.maxPortions > 0
                const unavailableLabel = availability.reason === '86d' ? 'No disponible' : 'Agotado'

                return (
                  <div
                    key={item.id}
                    role={isAvailable && canOrder ? 'button' : undefined}
                    tabIndex={isAvailable && canOrder ? 0 : undefined}
                    aria-disabled={!isAvailable || !canOrder}
                    aria-label={
                      isAvailable && canOrder
                        ? `${item.nombre}, ${formatPrice(item.precio)}`
                        : `${item.nombre}, ${unavailableLabel}`
                    }
                    className={`flex items-center gap-4 p-3 rounded-2xl transition-colors ${
                      isAvailable && canOrder
                        ? 'cursor-pointer hover:bg-secondary/60 active:bg-secondary'
                        : 'opacity-50'
                    }`}
                    onClick={() => isAvailable && canOrder && onSelectItem(item)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && isAvailable && canOrder) {
                        e.preventDefault()
                        onSelectItem(item)
                      }
                    }}
                  >
                    {/* Image — bigger and more prominent */}
                    <div className={`w-24 h-24 rounded-2xl flex-shrink-0 overflow-hidden bg-secondary flex items-center justify-center relative ${
                      !isAvailable ? 'grayscale' : ''
                    }`}>
                      {item.imagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-4xl" aria-hidden="true">{getCategoryEmoji(item.categoria)}</span>
                      )}
                      {!isAvailable && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-2xl">
                          <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-lg text-center leading-tight">
                            {unavailableLabel}
                          </span>
                        </div>
                      )}
                      {showLowStock && (
                        <div className="absolute bottom-1 left-1 right-1">
                          <span className="block text-center text-[9px] font-bold text-warning bg-warning/10 rounded px-1 py-0.5 leading-tight">
                            ¡Últimos {availability.maxPortions}!
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content — stronger hierarchy */}
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="font-semibold text-[16px] text-foreground leading-tight">
                        {item.nombre}
                      </h3>
                      {item.descripcion && (
                        <p className="text-[13px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {item.descripcion}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-[16px] font-bold ${
                          isAvailable ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {formatPrice(item.precio)}
                        </p>

                        {/* Add button — 44px touch target */}
                        {isAvailable && canOrder && (
                          <button
                            className="w-9 h-9 flex items-center justify-center bg-foreground text-background rounded-xl hover:bg-foreground/90 active:scale-95 transition-all"
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
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl" aria-hidden="true">🔍</span>
            <p className="text-sm text-muted-foreground mt-3">No se encontraron platillos</p>
          </div>
        )}
      </main>
    </div>
  )
}
