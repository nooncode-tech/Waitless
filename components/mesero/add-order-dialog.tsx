'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice, type MenuItem } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

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
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c)
      return [...prev, { item, cantidad: 1 }]
    })
  }

  const removeItem = (itemId: string) => {
    setLocalCart(prev => {
      const existing = prev.find(c => c.item.id === itemId)
      if (existing && existing.cantidad > 1) return prev.map(c => c.item.id === itemId ? { ...c, cantidad: c.cantidad - 1 } : c)
      return prev.filter(c => c.item.id !== itemId)
    })
  }

  const getItemQuantity = (itemId: string) => localCart.find(c => c.item.id === itemId)?.cantidad || 0

  const total = localCart.reduce((sum, c) => sum + c.item.precio * c.cantidad, 0)

  const handleConfirm = () => {
    if (localCart.length === 0) return
    pendingItemCount.current = localCart.length
    localCart.forEach(({ item, cantidad }) => { addToCart(item, cantidad) })
    setPendingOrder(true)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Agregar pedido</h2>
            <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0', fontFamily: MONO }}>Mesa {mesa}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid #E5E5E5', background: '#FAFAFA', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>×</button>
        </div>

        {/* Seat selector */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Asiento (opcional)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: tableCapacity }, (_, i) => i + 1).map((seat) => (
              <button
                key={seat}
                onClick={() => setSeatNumber(prev => prev === seat ? null : seat)}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: `1px solid ${seatNumber === seat ? '#000' : '#E5E5E5'}`,
                  background: seatNumber === seat ? '#000' : '#FAFAFA',
                  color: seatNumber === seat ? '#fff' : '#333',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: MONO,
                }}
              >
                {seat}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
          <input
            type="search"
            placeholder="Buscar platillo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #E5E5E5', fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Menu items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredItems.map((item) => {
              const qty = getItemQuantity(item.id)
              const is86d = !item.disponible
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 10,
                    background: is86d ? '#F5F5F5' : '#FAFAFA',
                    opacity: is86d ? 0.55 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#000', textDecoration: is86d ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.nombre}
                      </span>
                      {is86d && <span style={{ fontSize: 9, fontWeight: 700, color: '#991B1B', background: '#FEE2E2', padding: '1px 4px', borderRadius: 4, flexShrink: 0 }}>86</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0', fontFamily: MONO }}>
                      {formatPrice(item.precio)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {qty > 0 && !is86d && (
                      <>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}
                        >−</button>
                        <span style={{ width: 20, textAlign: 'center', fontSize: 13, fontWeight: 700, fontFamily: MONO }}>{qty}</span>
                      </>
                    )}
                    <button
                      onClick={() => !is86d && addItem(item)}
                      disabled={is86d}
                      style={{
                        width: 26, height: 26, borderRadius: 7,
                        border: `1px solid ${qty > 0 ? '#E5E5E5' : '#000'}`,
                        background: qty > 0 ? '#fff' : '#000',
                        cursor: is86d ? 'default' : 'pointer',
                        fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: qty > 0 ? '#333' : '#fff',
                      }}
                    >+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        {localCart.length > 0 && (
          <div style={{ borderTop: '1px solid #E5E5E5', padding: '14px 20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
                  {localCart.reduce((sum, c) => sum + c.cantidad, 0)} artículos
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, margin: '2px 0 0', fontFamily: MONO }}>
                  Total: {formatPrice(total)}
                </p>
              </div>
              <button
                onClick={handleConfirm}
                style={{ height: 42, padding: '0 20px', borderRadius: 10, border: 'none', background: '#000', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
              >
                Confirmar pedido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
