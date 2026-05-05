'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, AlertTriangle, RefreshCw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { offlineQueue, pendingCount, failedCount } from '@/lib/offline-queue'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [retrySuccess, setRetrySuccess] = useState(false)

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

    // Auto-retry failed ops on mount if online
    if (navigator.onLine && failedCount() > 0) {
      offlineQueue.retryFailedOps().then(() => refreshCounts())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = async () => {
    setRetrying(true)
    await offlineQueue.retryFailedOps({
      onFlushComplete: (count) => {
        refreshCounts()
        if (count > 0 && failedCount() === 0) {
          setRetrySuccess(true)
          setTimeout(() => setRetrySuccess(false), 3000)
        }
      },
      onFlushError: () => refreshCounts(),
    })
    refreshCounts()
    setRetrying(false)
  }

  // Mostrar banner de operaciones fallidas incluso cuando está online
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

      {/* Banner de operaciones fallidas */}
      {failed > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium bg-amber-600 text-white">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {failed} operación{failed !== 1 ? 'es' : ''} no sincronizada{failed !== 1 ? 's' : ''}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="ml-1 flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors rounded-full px-2.5 py-0.5 text-xs font-semibold disabled:opacity-60"
          >
            <RefreshCw className={cn('h-3 w-3', retrying && 'animate-spin')} />
            {retrying ? 'Sincronizando...' : 'Reintentar'}
          </button>
          <button
            onClick={() => { offlineQueue.clearFailedOps(); setFailed(0) }}
            className="text-white/60 hover:text-white text-xs underline underline-offset-2 transition-colors"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Confirmación de sync exitoso */}
      {retrySuccess && failed === 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium bg-green-600 text-white">
          <Check className="h-4 w-4" />
          Operaciones sincronizadas correctamente
        </div>
      )}
    </div>
  )
}
