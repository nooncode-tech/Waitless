'use client'

import { Bell, Check, Clock, Receipt, HelpCircle, Users } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatTime, getTimeDiff } from '@/lib/store'

export function WaiterCallsPanel() {
  const { getPendingCalls, markCallAttended, currentUser, tableSessions } = useApp()
  
  const pendingCalls = getPendingCalls().sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  
  const handleAttendCall = (callId: string) => {
    if (currentUser) {
      markCallAttended(callId, currentUser.id)
    }
  }
  
  const getCallIcon = (tipo: string) => {
    switch (tipo) {
      case 'cuenta': return <Receipt className="h-4 w-4" />
      case 'atencion': return <Bell className="h-4 w-4" />
      default: return <HelpCircle className="h-4 w-4" />
    }
  }
  
  const getCallLabel = (tipo: string) => {
    switch (tipo) {
      case 'cuenta': return 'Pedir cuenta'
      case 'atencion': return 'Atención'
      default: return 'Otro'
    }
  }
  
  const getCallColor = (tipo: string) => {
    switch (tipo) {
      case 'cuenta': return 'bg-warning'
      case 'atencion': return 'bg-black'
      default: return 'bg-accent'
    }
  }
  
  if (pendingCalls.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Llamadas de mesero</h2>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sin llamadas pendientes</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-black animate-pulse" />
          <h2 className="text-sm font-semibold text-foreground">Llamadas de mesero</h2>
        </div>
        <Badge className="bg-black text-white">
          {pendingCalls.length} pendiente{pendingCalls.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {pendingCalls.map((call) => {
          const session = tableSessions.find(s => s.mesa === call.mesa && s.activa)
          
          return (
            <Card 
              key={call.id} 
              className={`border-l-4 ${
                call.tipo === 'cuenta' ? 'border-l-warning bg-kds-preparing' :
                call.tipo === 'atencion' ? 'border-l-black bg-muted' :
                'border-l-accent'
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getCallColor(call.tipo)} text-white`}>
                      {getCallIcon(call.tipo)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          Mesa {call.mesa}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {getCallLabel(call.tipo)}
                        </Badge>
                      </div>
                      {call.mensaje && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          &quot;{call.mensaje}&quot;
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTime(call.createdAt)} ({getTimeDiff(call.createdAt)})
                        </span>
                        {session && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {session.orders.length} pedido{session.orders.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 text-white h-8 text-xs shrink-0"
                    onClick={() => handleAttendCall(call.id)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Atender
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
