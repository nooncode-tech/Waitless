'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, type MenuItem, canPrepareItem } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'

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
    <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>
      {/* Sticky header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '16px 16px 12px',
      }}>
        {/* Restaurant name */}
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#000', margin: 0, lineHeight: 1.2 }}>
            {config.restaurantName ?? `Mesa ${mesa}`}
          </h1>
          {config.descripcion && (
            <p style={{ fontSize: 12, color: '#888', marginTop: 3, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {config.descripcion}
            </p>
          )}
        </div>

        {/* Ordering blocked banner */}
        {!canOrder && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', background: '#fff8e1',
            border: '1px solid #ffe082', borderRadius: 12, marginBottom: 12,
          }}>
            <span style={{ fontSize: 15 }}>⚠</span>
            <p style={{ fontSize: 12, color: '#b45309', fontWeight: 600, margin: 0 }}>
              Pago en proceso — no puedes agregar más platillos.
            </p>
          </div>
        )}

        {/* Category chips */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
          marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16, marginBottom: 12,
        }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: FONT,
              background: !selectedCategory ? '#000' : '#f0f0f0',
              color: !selectedCategory ? '#fff' : '#666',
              transition: 'background 0.15s',
            }}
          >
            Todo
          </button>
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: FONT,
                background: selectedCategory === cat.id ? '#000' : '#f0f0f0',
                color: selectedCategory === cat.id ? '#fff' : '#666',
                transition: 'background 0.15s',
              }}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <label htmlFor="menu-search" style={{ position: 'absolute', left: -9999 }}>Buscar platillos</label>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: '#aaa', pointerEvents: 'none',
          }} aria-hidden="true">⌕</span>
          <input
            id="menu-search"
            type="search"
            placeholder="Buscar en el menú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', height: 40, paddingLeft: 36, paddingRight: 12,
              background: '#f5f5f5', border: 'none', borderRadius: 12,
              fontSize: 14, fontFamily: FONT, outline: 'none',
              color: '#000', boxSizing: 'border-box',
            }}
          />
        </div>
      </header>

      {/* Menu content */}
      <main style={{ flex: 1, padding: '16px 16px 144px' }}>
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <section key={category} style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 15, fontWeight: 700, color: '#000',
              marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span aria-hidden="true">{getCategoryEmoji(category)}</span>
              {getCategoryName(category)}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: 12, borderRadius: 18,
                      cursor: isAvailable && canOrder ? 'pointer' : 'default',
                      opacity: !isAvailable ? 0.5 : 1,
                      transition: 'background 0.12s',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => { if (isAvailable && canOrder) (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    onClick={() => isAvailable && canOrder && onSelectItem(item)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && isAvailable && canOrder) {
                        e.preventDefault()
                        onSelectItem(item)
                      }
                    }}
                  >
                    {/* Image */}
                    <div style={{
                      width: 96, height: 96, borderRadius: 18, flexShrink: 0,
                      overflow: 'hidden', background: '#f0f0f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', filter: !isAvailable ? 'grayscale(1)' : 'none',
                    }}>
                      {item.imagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      ) : (
                        <span style={{ fontSize: 36 }} aria-hidden="true">{getCategoryEmoji(item.categoria)}</span>
                      )}
                      {!isAvailable && (
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 18,
                        }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: '#dc2626',
                            background: '#fef2f2', padding: '4px 8px', borderRadius: 8,
                            textAlign: 'center', lineHeight: 1.3,
                          }}>
                            {unavailableLabel}
                          </span>
                        </div>
                      )}
                      {showLowStock && (
                        <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4 }}>
                          <span style={{
                            display: 'block', textAlign: 'center', fontSize: 9, fontWeight: 700,
                            color: '#b45309', background: '#fef3c7', borderRadius: 6,
                            padding: '2px 4px', lineHeight: 1.3,
                          }}>
                            ¡Últimos {availability.maxPortions}!
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 4, paddingBottom: 4 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#000', margin: 0, lineHeight: 1.2 }}>
                        {item.nombre}
                      </h3>
                      {item.descripcion && (
                        <p style={{
                          fontSize: 13, color: '#888', marginTop: 4, lineHeight: 1.5,
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {item.descripcion}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color: isAvailable ? '#000' : '#aaa', margin: 0 }}>
                          {formatPrice(item.precio)}
                        </p>
                        {isAvailable && canOrder && (
                          <button
                            style={{
                              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#000', color: '#fff', border: 'none', borderRadius: 12,
                              fontSize: 20, cursor: 'pointer', transition: 'opacity 0.15s', fontFamily: FONT,
                            }}
                            aria-label={`Agregar ${item.nombre}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectItem(item)
                            }}
                          >
                            +
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
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>Ø</div>
            <p style={{ fontSize: 14, color: '#888' }}>No se encontraron platillos</p>
          </div>
        )}
      </main>
    </div>
  )
}
