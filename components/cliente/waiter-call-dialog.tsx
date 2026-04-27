'use client'

import { useState } from 'react'
import { X, Bell, MessageSquare, Receipt, HelpCircle, Check } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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
      icon: Bell,
    },
    {
      type: 'cuenta' as CallType,
      label: 'Pedir la cuenta',
      description: 'Solicitar el cierre de tu cuenta',
      icon: Receipt,
    },
    {
      type: 'otro' as CallType,
      label: 'Otra solicitud',
      description: 'Especifica tu necesidad',
      icon: HelpCircle,
    },
  ]
  
  const handleSend = () => {
    if (!selectedType) return
    
    const mensaje = selectedType === 'otro' && customMessage 
      ? customMessage 
      : undefined
    
    createWaiterCall(mesa, selectedType, mensaje)
    setIsSent(true)
    
    setTimeout(onClose, 2000)
  }
  
  if (isSent) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-background w-full max-w-md rounded-t-2xl p-6 animate-in slide-in-from-bottom">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Mesero notificado
            </h2>
            <p className="text-sm text-muted-foreground">
              Un mesero se acercará a tu mesa en breve
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
          <div>
            <h2 className="text-base font-semibold text-foreground">Llamar mesero</h2>
            <p className="text-xs text-muted-foreground">Mesa {mesa}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Options */}
        <div className="p-4 space-y-2">
          {callTypes.map((item) => {
            const Icon = item.icon
            const isSelected = selectedType === item.type
            
            return (
              <button
                key={item.type}
                onClick={() => setSelectedType(item.type)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-[13px] text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            )
          })}
          
          {/* Custom Message */}
          {selectedType === 'otro' && (
            <div className="mt-3">
              <label className="text-xs font-medium text-foreground">Mensaje (opcional)</label>
              <div className="relative mt-1">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="¿En qué podemos ayudarte?"
                  className="pl-9 text-sm h-20"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Action Button */}
        <div className="p-4 border-t border-border">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-sm font-semibold rounded-xl"
            disabled={!selectedType}
            onClick={handleSend}
          >
            <Bell className="h-4 w-4 mr-2" />
            Enviar solicitud
          </Button>
        </div>
        
        {/* Safe area */}
        <div className="h-6" />
      </div>
    </div>
  )
}
