'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { offlineQueue, pendingCount, failedCount } from '@/lib/offline-queue'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState(0)

  const refreshCounts = () => {
    setPending(pendingCount())
    setFailed(failedCount())
  }

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 3000)
      offlineQueue.flush().then(() => refreshCounts())
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
      refreshCounts()
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading navigator.onLine (external API) on mount to initialize online state
    setIsOnline(navigator.onLine)
    refreshCounts()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sprint 4: mostrar banner de operaciones fallidas incluso cuando está online
  if (isOnline && !showReconnected && failed === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
      {/* Banner de sin conexión / reconectado */}
      {(!isOnline || showReconnected) && (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium',
            isOnline ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              Reconectado
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              Sin conexión — los cambios se guardarán al reconectar
              {pending > 0 && (
                <span className="ml-1 bg-white/20 rounded-full px-2 py-0.5 text-xs">
                  {pending} pendiente{pending !== 1 ? 's' : ''}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Sprint 4: banner de operaciones fallidas (requieren intervención) */}
      {failed > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium bg-amber-600 text-white">
          <AlertTriangle className="h-4 w-4" />
          {failed} operación{failed !== 1 ? 'es' : ''} no sincronizada{failed !== 1 ? 's' : ''} — contactá soporte
        </div>
      )}
    </div>
  )
}
