'use client'

import { useState } from 'react'
import { X, Gift, Instagram, Star, Users, Cake, Check, ExternalLink } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'

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
  
  const getRewardIcon = (accion: string) => {
    switch (accion) {
      case 'seguir_instagram': return Instagram
      case 'primera_visita': return Star
      case 'referido': return Users
      case 'cumpleanos': return Cake
      default: return Gift
    }
  }
  
  const handleApplyReward = async (rewardId: string, accion: string) => {
    setIsApplying(true)
    
    // For Instagram follow, simulate opening Instagram
    if (accion === 'seguir_instagram') {
      // In production, would verify follow via API
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
  
  const isAlreadyApplied = (rewardId: string) => {
    return sessionApplied.some(ar => ar.rewardId === rewardId)
  }
  
  if (appliedId) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-background w-full max-w-md rounded-t-2xl p-6 animate-in slide-in-from-bottom">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Descuento aplicado
            </h2>
            <p className="text-sm text-muted-foreground">
              Tu descuento ha sido agregado a tu cuenta
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-md rounded-t-2xl animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Descuentos disponibles</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Rewards List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {availableRewards.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay descuentos disponibles en este momento
              </p>
            </div>
          ) : (
            availableRewards.map((reward) => {
              const Icon = getRewardIcon(reward.accion)
              const applied = isAlreadyApplied(reward.id)
              
              return (
                <div
                  key={reward.id}
                  className={`p-4 rounded-xl border-2 ${
                    applied
                      ? 'border-success/30 bg-success/10'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      applied ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[13px] text-foreground">
                          {reward.nombre}
                        </h3>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {reward.tipo === 'porcentaje' ? `${reward.valor}%` : `$${reward.valor}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {reward.descripcion}
                      </p>
                      
                      {!applied && (
                        <Button
                          size="sm"
                          className="mt-2 h-8 text-xs bg-foreground hover:bg-foreground/90"
                          disabled={isApplying}
                          onClick={() => handleApplyReward(reward.id, reward.accion)}
                        >
                          {reward.accion === 'seguir_instagram' && (
                            <>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Seguir y aplicar
                            </>
                          )}
                          {reward.accion === 'primera_visita' && 'Aplicar descuento'}
                          {reward.accion === 'referido' && 'Aplicar descuento'}
                          {reward.accion === 'cumpleanos' && 'Aplicar descuento'}
                        </Button>
                      )}
                      
                      {applied && (
                        <div className="flex items-center gap-1 mt-2 text-success">
                          <Check className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Aplicado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        
        {/* Info */}
        <div className="p-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            Los descuentos se aplican sobre el subtotal y son controlados por sesión
          </p>
        </div>
        
        {/* Safe area */}
        <div className="h-6" />
      </div>
    </div>
  )
}
