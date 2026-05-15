'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { formatPrice } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

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

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [notas, setNotas] = useState('')

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
    const clienteInfo = {
      nombre: nombre.trim() || undefined,
      telefono: telefono.trim() || loyaltyPhone || undefined,
      email: email.trim() || undefined,
      notas: notas.trim() || undefined,
    }
    createOrder('mesa', mesa, clienteInfo, seatNumber ?? undefined)
    onOrderConfirmed(subtotal)
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, fontSize: 13, background: 'transparent',
    outline: 'none', border: 'none', color: '#000', fontFamily: FONT,
  }

  const inputRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center',
    border: '1.5px solid #e5e5e5', borderRadius: 12,
    padding: '0 12px', gap: 8, height: 44,
  }

  if (cart.length === 0) {
    return (
      <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>
        <header style={{ padding: '12px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={onBack} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#000' }}>
              ←
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#000' }}>Tu pedido</span>
            <div style={{ width: 36 }} />
          </div>
        </header>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>Ø</div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#000', margin: 0 }}>Tu carrito está vacío</h2>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Agrega platillos del menú</p>
            <button
              style={{
                marginTop: 20, height: 44, padding: '0 24px',
                background: '#000', color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
              }}
              onClick={onBack}
            >
              Ver menú
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', background: '#fff', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff', padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#000' }}>
            ←
          </button>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#000', display: 'block' }}>Tu pedido</span>
            <span style={{ fontSize: 11, color: '#888' }}>Mesa {mesa}</span>
          </div>
          <div style={{ width: 36 }} />
        </div>
      </header>

      {/* Cart Items */}
      <main style={{ flex: 1, padding: '16px 16px 192px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {cart.map((item) => {
            const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
            const itemTotal = (item.menuItem.precio + extrasTotal) * item.cantidad

            return (
              <div key={item.id} style={{ display: 'flex', gap: 12, paddingTop: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                {/* Image */}
                <div style={{ width: 64, height: 64, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: '#f0f0f0' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.menuItem.imagen || '/placeholder-food.png'}
                    alt={item.menuItem.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#000', margin: 0, lineHeight: 1.3 }}>
                        {item.menuItem.nombre}
                      </h3>
                      {item.extras && item.extras.length > 0 && (
                        <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                          + {item.extras.map(e => e.nombre).join(', ')}
                        </p>
                      )}
                      {item.notas && (
                        <p style={{ fontSize: 11, color: '#888', marginTop: 2, fontStyle: 'italic' }}>
                          &quot;{item.notas}&quot;
                        </p>
                      )}
                    </div>
                    <button
                      style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, lineHeight: 1 }}
                      onClick={() => removeFromCart(item.id)}
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        style={{
                          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1.5px solid #e5e5e5', borderRadius: 8, background: 'none',
                          cursor: 'pointer', fontSize: 16, color: '#000', fontFamily: FONT,
                        }}
                        onClick={() => {
                          if (item.cantidad > 1) {
                            updateCartItem(item.id, item.cantidad - 1)
                          } else {
                            removeFromCart(item.id)
                          }
                        }}
                      >
                        −
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#000', minWidth: 16, textAlign: 'center' }}>
                        {item.cantidad}
                      </span>
                      <button
                        style={{
                          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1.5px solid #e5e5e5', borderRadius: 8, background: 'none',
                          cursor: 'pointer', fontSize: 16, color: '#000', fontFamily: FONT,
                        }}
                        onClick={() => updateCartItem(item.id, item.cantidad + 1)}
                      >
                        +
                      </button>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#000', margin: 0 }}>
                      {formatPrice(itemTotal)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Bottom summary */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff',
        borderTop: '1px solid #f0f0f0', padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 10, boxSizing: 'border-box',
      }}>

        {/* Loyalty widget */}
        {!loyaltyPhone && !showPhoneInput && (
          <button
            onClick={() => setShowPhoneInput(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', border: '1.5px solid #e5e5e5',
              borderRadius: 12, fontSize: 12, color: '#888', background: 'none',
              cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
          >
            <span style={{ fontSize: 14 }}>◈</span>
            <span>Acumula puntos — identifícate con tu teléfono</span>
          </button>
        )}

        {showPhoneInput && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ ...inputRowStyle, flex: 1 }}>
              <span style={{ fontSize: 14, color: '#aaa' }}>✆</span>
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="Número de teléfono"
                style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleIdentify()}
                autoFocus
              />
            </div>
            <button
              onClick={handleIdentify}
              disabled={phoneInput.trim().length < 8}
              style={{
                padding: '0 14px', height: 44, background: phoneInput.trim().length >= 8 ? '#000' : '#ccc',
                color: '#fff', border: 'none', borderRadius: 12, fontSize: 12,
                fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              }}
            >
              OK
            </button>
            <button
              onClick={() => setShowPhoneInput(false)}
              style={{
                padding: '0 12px', height: 44, border: '1.5px solid #e5e5e5',
                borderRadius: 12, fontSize: 14, color: '#888', background: 'none',
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {customer && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', background: '#f0fdf0', border: '1px solid #bbf7b0',
            borderRadius: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>◈</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>
                {customer.puntos} puntos acumulados
              </span>
            </div>
            {puntosGanados > 0 && (
              <span style={{ fontSize: 11, color: '#166534' }}>+{puntosGanados} con este pedido</span>
            )}
          </div>
        )}

        {/* Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: '#888' }}>Subtotal</span>
            <span style={{ fontSize: 14, color: '#888' }}>{formatPrice(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#000' }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#000' }}>{formatPrice(subtotal)}</span>
          </div>
        </div>

        {/* Client data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Tus datos <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
          </p>
          <div style={inputRowStyle}>
            <span style={{ fontSize: 14, color: '#ccc' }}>◉</span>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" style={inputStyle} />
          </div>
          <div style={inputRowStyle}>
            <span style={{ fontSize: 14, color: '#ccc' }}>✆</span>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Teléfono" style={inputStyle} />
          </div>
          <div style={inputRowStyle}>
            <span style={{ fontSize: 14, color: '#ccc' }}>@</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" style={inputStyle} />
          </div>
          <div style={inputRowStyle}>
            <span style={{ fontSize: 14, color: '#ccc' }}>≡</span>
            <input type="text" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas para el restaurante" style={inputStyle} />
          </div>
        </div>

        {/* Seat selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#888' }}>
            <span>⊞</span>
            <span>¿En qué asiento estás? El mesero te lo lleva ahí. <span style={{ opacity: 0.6 }}>(opcional)</span></span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[1,2,3,4,5,6,7,8].map(n => (
              <button
                key={n}
                onClick={() => setSeatNumber(seatNumber === n ? null : n)}
                style={{
                  width: 36, height: 36, borderRadius: 12, fontSize: 14, fontWeight: 700,
                  border: '1.5px solid', cursor: 'pointer', fontFamily: FONT,
                  background: seatNumber === n ? '#000' : '#fff',
                  color: seatNumber === n ? '#fff' : '#000',
                  borderColor: seatNumber === n ? '#000' : '#e5e5e5',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          style={{
            width: '100%', height: 52, background: '#000', color: '#fff',
            border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: FONT,
          }}
          onClick={handleConfirm}
        >
          Confirmar pedido
        </button>

        <button
          style={{
            background: 'none', border: 'none', color: '#888', fontSize: 14,
            cursor: 'pointer', padding: '6px 0', fontFamily: FONT,
          }}
          onClick={onBack}
        >
          Seguir agregando
        </button>
      </div>
    </div>
  )
}
