'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, type MenuItem, type Extra } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'

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
      if (exists) return prev.filter(e => e.id !== extra.id)
      return [...prev, extra]
    })
  }

  const handleAddToCart = () => {
    addToCart(item, cantidad, notas || undefined, selectedExtras.length > 0 ? selectedExtras : undefined)
    onAddToCart()
  }

  return (
    <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>
      {/* Hero Image with overlaid header */}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '100%', aspectRatio: '4/3',
          background: '#f0f0f0', display: 'flex', alignItems: 'center',
          justifyContent: 'center', borderRadius: '0 0 24px 24px', overflow: 'hidden',
        }}>
          {item.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imagen} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 72 }}>🍽️</span>
          )}
        </div>

        {/* Overlaid header */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
        }}>
          <button
            onClick={onBack}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
              border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 20, color: '#000',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}
          >
            ←
          </button>

          <div style={{ position: 'relative' }}>
            <button
              style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 18, color: '#000',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              }}
              aria-label="Ver carrito"
            >
              ⊞
            </button>
            {cartItemCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                background: MINT, color: '#0a3a0a', fontSize: 9, fontWeight: 700,
                borderRadius: '50%', width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cartItemCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <main style={{ flex: 1, padding: '20px 16px 88px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#000', margin: 0 }}>{item.nombre}</h1>
          {item.descripcion && (
            <p style={{ fontSize: 14, color: '#666', marginTop: 6, lineHeight: 1.6 }}>
              {item.descripcion}
            </p>
          )}
        </div>

        {/* Extras */}
        {item.extras && item.extras.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#000', marginBottom: 12 }}>Extras</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {item.extras.map((extra) => {
                const isSelected = selectedExtras.some(e => e.id === extra.id)
                return (
                  <button
                    key={extra.id}
                    onClick={() => handleToggleExtra(extra)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 10, paddingBottom: 10,
                      borderBottom: '1px solid #f0f0f0', background: 'none', border: 'none',
                      borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: '#f0f0f0',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13, color: '#000', fontWeight: isSelected ? 600 : 400, margin: 0 }}>
                        {extra.nombre}
                      </p>
                      <p style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{formatPrice(extra.precio)}</p>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: isSelected ? 'none' : '1.5px solid #ccc',
                      background: isSelected ? MINT : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isSelected && (
                        <span style={{ fontSize: 12, color: '#0a3a0a', fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#000', marginBottom: 8 }}>Notas especiales</h2>
          <textarea
            placeholder="Ej: Sin cebolla, extra salsa..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            disabled={!canOrder}
            style={{
              width: '100%', border: '1.5px solid #e5e5e5', borderRadius: 12,
              padding: '10px 12px', fontSize: 14, fontFamily: FONT, resize: 'none',
              outline: 'none', boxSizing: 'border-box', color: '#000',
              background: canOrder ? '#fff' : '#f5f5f5',
            }}
          />
        </div>

        {/* Quantity */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#000', marginBottom: 8 }}>Cantidad</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setCantidad(Math.max(1, cantidad - 1))}
              disabled={cantidad <= 1 || !canOrder}
              style={{
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid #e5e5e5', borderRadius: 12, background: 'none',
                cursor: cantidad <= 1 || !canOrder ? 'not-allowed' : 'pointer',
                opacity: cantidad <= 1 || !canOrder ? 0.4 : 1, fontSize: 20, color: '#000', fontFamily: FONT,
              }}
            >
              −
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#000', minWidth: 24, textAlign: 'center' }}>
              {cantidad}
            </span>
            <button
              onClick={() => setCantidad(cantidad + 1)}
              disabled={!canOrder}
              style={{
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid #e5e5e5', borderRadius: 12, background: 'none',
                cursor: !canOrder ? 'not-allowed' : 'pointer',
                opacity: !canOrder ? 0.4 : 1, fontSize: 20, color: '#000', fontFamily: FONT,
              }}
            >
              +
            </button>
          </div>
        </div>
      </main>

      {/* Add to Cart Button */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff',
        borderTop: '1px solid #f0f0f0', padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}>
        <button
          style={{
            width: '100%', height: 52, background: canOrder ? '#000' : '#ccc',
            color: '#fff', border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: canOrder ? 'pointer' : 'not-allowed',
            fontFamily: FONT,
          }}
          onClick={handleAddToCart}
          disabled={!canOrder}
        >
          {canOrder ? `Agregar al carrito — ${formatPrice(total)}` : 'No puedes agregar más platillos'}
        </button>
      </div>
    </div>
  )
}
