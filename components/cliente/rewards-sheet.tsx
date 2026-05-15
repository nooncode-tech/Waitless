'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

interface RewardsSheetProps {
  sessionId: string
  onClose: () => void
}

export function RewardsSheet({ sessionId, onClose }: RewardsSheetProps) {
  const { rewards, applyReward, getAvailableRewards, appliedRewards } = useApp()
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const availableRewards = getAvailableRewards(sessionId)
  const sessionApplied = appliedRewards.filter(ar => ar.sessionId === sessionId)

  const getRewardSymbol = (accion: string) => {
    switch (accion) {
      case 'seguir_instagram': return '◈'
      case 'primera_visita': return '★'
      case 'referido': return '⊞'
      case 'cumpleanos': return '◫'
      default: return '◈'
    }
  }

  const handleApplyReward = async (rewardId: string, accion: string) => {
    setIsApplying(true)
    if (accion === 'seguir_instagram') {
      window.open('https://instagram.com', '_blank')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    const success = applyReward(sessionId, rewardId)
    if (success) {
      setAppliedId(rewardId)
      setTimeout(onClose, 1500)
    }
    setIsApplying(false)
  }

  const isAlreadyApplied = (rewardId: string) =>
    sessionApplied.some(ar => ar.rewardId === rewardId)

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  }

  const sheetStyle: React.CSSProperties = {
    position: 'relative', background: '#fff',
    width: '100%', maxWidth: 480,
    borderRadius: '24px 24px 0 0',
    fontFamily: FONT,
    paddingBottom: 'env(safe-area-inset-bottom)',
  }

  if (appliedId) {
    return (
      <div style={overlayStyle}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
        <div style={sheetStyle}>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: 64, height: 64, background: MINT, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <span style={{ fontSize: 32, color: MINT_DEEP }}>✓</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#000', margin: '0 0 6px' }}>
              Descuento aplicado
            </h2>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
              Tu descuento ha sido agregado a tu cuenta
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={sheetStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px', borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, color: MINT_DEEP }}>◈</span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#000', margin: 0 }}>Descuentos disponibles</h2>
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

        {/* Rewards list */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
          {availableRewards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>Ø</div>
              <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
                No hay descuentos disponibles en este momento
              </p>
            </div>
          ) : (
            availableRewards.map((reward) => {
              const symbol = getRewardSymbol(reward.accion)
              const applied = isAlreadyApplied(reward.id)

              return (
                <div
                  key={reward.id}
                  style={{
                    padding: 16, borderRadius: 18,
                    border: applied ? `2px solid ${MINT}` : '2px solid #f0f0f0',
                    background: applied ? '#f0fff0' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: applied ? MINT : '#f0f0f0',
                      fontSize: 20, color: applied ? MINT_DEEP : '#666',
                    }}>
                      {symbol}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#000', margin: 0 }}>
                          {reward.nombre}
                        </h3>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: MINT_DEEP,
                          background: MINT, padding: '2px 8px', borderRadius: 8,
                        }}>
                          {reward.tipo === 'porcentaje' ? `${reward.valor}%` : `$${reward.valor}`}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 3, marginBottom: 0 }}>
                        {reward.descripcion}
                      </p>

                      {!applied && (
                        <button
                          style={{
                            marginTop: 10, height: 34, padding: '0 14px',
                            background: '#000', color: '#fff', border: 'none',
                            borderRadius: 10, fontSize: 12, fontWeight: 700,
                            cursor: isApplying ? 'not-allowed' : 'pointer', fontFamily: FONT,
                            opacity: isApplying ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                          disabled={isApplying}
                          onClick={() => handleApplyReward(reward.id, reward.accion)}
                        >
                          {reward.accion === 'seguir_instagram' && (
                            <><span>↗</span> Seguir y aplicar</>
                          )}
                          {reward.accion !== 'seguir_instagram' && 'Aplicar descuento'}
                        </button>
                      )}

                      {applied && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <span style={{ fontSize: 14, color: MINT_DEEP }}>✓</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: MINT_DEEP }}>Aplicado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
          <p style={{ fontSize: 10, color: '#ccc', textAlign: 'center', margin: 0 }}>
            Los descuentos se aplican sobre el subtotal y son controlados por sesión
          </p>
        </div>
      </div>
    </div>
  )
}
