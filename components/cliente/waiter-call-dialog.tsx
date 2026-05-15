'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

interface WaiterCallDialogProps {
  mesa: number
  onClose: () => void
}

type CallType = 'atencion' | 'cuenta' | 'otro'

export function WaiterCallDialog({ mesa, onClose }: WaiterCallDialogProps) {
  const { createWaiterCall } = useApp()
  const [selectedType, setSelectedType] = useState<CallType | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [isSent, setIsSent] = useState(false)

  const callTypes = [
    {
      type: 'atencion' as CallType,
      label: 'Necesito atención',
      description: 'El mesero se acercará a tu mesa',
      symbol: '◈',
    },
    {
      type: 'cuenta' as CallType,
      label: 'Pedir la cuenta',
      description: 'Solicitar el cierre de tu cuenta',
      symbol: '$',
    },
    {
      type: 'otro' as CallType,
      label: 'Otra solicitud',
      description: 'Especifica tu necesidad',
      symbol: '≡',
    },
  ]

  const handleSend = () => {
    if (!selectedType) return
    const mensaje = selectedType === 'otro' && customMessage ? customMessage : undefined
    createWaiterCall(mesa, selectedType, mensaje)
    setIsSent(true)
    setTimeout(onClose, 2000)
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }

  const backdropStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
  }

  const sheetStyle: React.CSSProperties = {
    position: 'relative', background: '#fff',
    width: '100%', maxWidth: 480,
    borderRadius: '24px 24px 0 0',
    fontFamily: FONT,
    paddingBottom: 'env(safe-area-inset-bottom)',
  }

  if (isSent) {
    return (
      <div style={overlayStyle}>
        <div style={backdropStyle} onClick={onClose} />
        <div style={sheetStyle}>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: 64, height: 64, background: '#f0fdf0', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <span style={{ fontSize: 32, color: '#166534' }}>✓</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#000', margin: '0 0 6px' }}>
              Mesero notificado
            </h2>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
              Un mesero se acercará a tu mesa en breve
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle}>
      <div style={backdropStyle} onClick={onClose} />
      <div style={sheetStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 14px', borderBottom: '1px solid #f0f0f0',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#000', margin: 0 }}>Llamar mesero</h2>
            <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Mesa {mesa}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, background: '#f0f0f0', border: 'none',
              borderRadius: '50%', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#666', fontFamily: FONT,
            }}
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {callTypes.map((item) => {
            const isSelected = selectedType === item.type
            return (
              <button
                key={item.type}
                onClick={() => setSelectedType(item.type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                  borderRadius: 16, cursor: 'pointer', textAlign: 'left', width: '100%',
                  fontFamily: FONT, transition: 'all 0.12s',
                  border: isSelected ? `2px solid ${MINT_DEEP}` : '2px solid #e5e5e5',
                  background: isSelected ? MINT : '#fff',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSelected ? MINT_DEEP : '#f0f0f0',
                  fontSize: 20,
                  color: isSelected ? '#fff' : '#666',
                }}>
                  {item.symbol}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#000', margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item.description}</p>
                </div>
                {isSelected && (
                  <div style={{
                    width: 20, height: 20, background: MINT_DEEP, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>✓</span>
                  </div>
                )}
              </button>
            )
          })}

          {/* Custom message */}
          {selectedType === 'otro' && (
            <div style={{ marginTop: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#000', display: 'block', marginBottom: 6 }}>
                Mensaje (opcional)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: 12, fontSize: 16, color: '#aaa',
                }} aria-hidden="true">≡</span>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="¿En qué podemos ayudarte?"
                  style={{
                    width: '100%', minHeight: 80, paddingLeft: 36, paddingTop: 12,
                    paddingRight: 12, paddingBottom: 12,
                    border: '1.5px solid #e5e5e5', borderRadius: 12,
                    fontSize: 14, fontFamily: FONT, outline: 'none', resize: 'none',
                    color: '#000', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div style={{ padding: '8px 16px 16px', borderTop: '1px solid #f0f0f0' }}>
          <button
            style={{
              width: '100%', height: 52, background: selectedType ? '#000' : '#e5e5e5',
              color: selectedType ? '#fff' : '#aaa', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700, cursor: selectedType ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: FONT, transition: 'background 0.15s',
            }}
            disabled={!selectedType}
            onClick={handleSend}
          >
            <span>◈</span> Enviar solicitud
          </button>
        </div>
      </div>
    </div>
  )
}
