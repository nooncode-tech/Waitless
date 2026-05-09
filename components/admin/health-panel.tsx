'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import {
  CheckCircle2, XCircle, AlertCircle, Wifi, WifiOff, Clock, Inbox,
  AlertTriangle, RefreshCw, Trash2, Activity,
} from 'lucide-react'

type PingStatus = 'checking' | 'ok' | 'error'

function StatusDot({ status }: { status: 'ok' | 'warn' | 'error' | 'checking' }) {
  if (status === 'checking') return <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-[#06C167]" />
  if (status === 'warn') return <AlertCircle className="h-4 w-4 text-amber-500" />
  return <XCircle className="h-4 w-4 text-red-500" />
}

export function HealthPanel() {
  const { realtimeConnected, offlineQueuePending, offlineQueueFailed, clearOfflineFailedOps, tenantId } = useApp()
  const [pingStatus, setPingStatus] = useState<PingStatus>('checking')
  const [lastPingAt, setLastPingAt] = useState<Date | null>(null)
  const [lastPingMs, setLastPingMs] = useState<number | null>(null)

  async function pingSupabase() {
    setPingStatus('checking')
    const t0 = Date.now()
    try {
      const { error } = await supabase.from('menu_items').select('id').limit(1)
      if (error) throw error
      setLastPingMs(Date.now() - t0)
      setLastPingAt(new Date())
      setPingStatus('ok')
    } catch {
      setPingStatus('error')
      setLastPingAt(new Date())
    }
  }

  useEffect(() => {
    pingSupabase()
    const id = setInterval(pingSupabase, 30_000)
    return () => clearInterval(id)
  }, [])

  const dbStatus = pingStatus === 'ok' ? 'ok' : pingStatus === 'error' ? 'error' : 'checking'
  const realtimeStatus = realtimeConnected ? 'ok' : 'warn'
  const queueStatus = offlineQueueFailed > 0 ? 'error' : offlineQueuePending > 0 ? 'warn' : 'ok'
  const overallOk = dbStatus === 'ok' && realtimeConnected && offlineQueueFailed === 0

  return (
    <div className="space-y-4 max-w-2xl" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      {/* Global summary */}
      <div className="border border-gray-100 rounded-2xl bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-gray-900" />
          <h2 className="text-sm font-black text-gray-900">Estado general del sistema</h2>
        </div>
        <div className="flex items-center gap-3">
          {overallOk ? (
            <>
              <CheckCircle2 className="h-8 w-8 text-[#06C167]" />
              <div>
                <p className="font-semibold text-[#06C167] text-sm">Sistema operativo</p>
                <p className="text-xs text-gray-500">Base de datos, Realtime y cola offline funcionan correctamente</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="font-semibold text-amber-600 text-sm">Atención requerida</p>
                <p className="text-xs text-gray-500">Uno o más indicadores necesitan revisión</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div className="space-y-2">
        {/* DB */}
        <div className="border border-gray-100 rounded-2xl bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusDot status={dbStatus as 'ok' | 'warn' | 'error' | 'checking'} />
              <div>
                <p className="font-semibold text-sm text-gray-900">Conexión a Supabase</p>
                <p className="text-xs text-gray-500">
                  {pingStatus === 'checking' && 'Verificando…'}
                  {pingStatus === 'ok' && lastPingAt && `OK · ${lastPingMs}ms · último ping ${lastPingAt.toLocaleTimeString()}`}
                  {pingStatus === 'error' && lastPingAt && `Sin respuesta · ${lastPingAt.toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            <button onClick={pingSupabase} title="Verificar ahora" className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Realtime */}
        <div className="border border-gray-100 rounded-2xl bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <StatusDot status={realtimeStatus} />
            <div className="flex items-center gap-2 flex-1">
              {realtimeConnected
                ? <Wifi className="h-4 w-4 text-[#06C167]" />
                : <WifiOff className="h-4 w-4 text-amber-500" />}
              <div>
                <p className="font-semibold text-sm text-gray-900">Realtime</p>
                <p className="text-xs text-gray-500">
                  {realtimeConnected
                    ? 'Suscripción activa — cambios se reflejan en tiempo real'
                    : 'Sin suscripción activa — los cambios pueden no verse al instante'}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${realtimeConnected ? 'bg-emerald-100 text-[#06C167]' : 'bg-gray-100 text-gray-500'}`}>
              {realtimeConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>

        {/* Offline queue */}
        <div className="border border-gray-100 rounded-2xl bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusDot status={queueStatus} />
              <div className="flex items-center gap-2">
                {offlineQueuePending > 0
                  ? <Clock className="h-4 w-4 text-amber-500" />
                  : <Inbox className="h-4 w-4 text-[#06C167]" />}
                <div>
                  <p className="font-semibold text-sm text-gray-900">Cola offline</p>
                  <p className="text-xs text-gray-500">
                    {offlineQueuePending === 0 && offlineQueueFailed === 0
                      ? 'Cola vacía — sin operaciones pendientes'
                      : `${offlineQueuePending} pendiente(s)${offlineQueueFailed > 0 ? ` · ${offlineQueueFailed} fallida(s)` : ''}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {offlineQueuePending > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {offlineQueuePending} pendiente
                </span>
              )}
              {offlineQueueFailed > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {offlineQueueFailed} fallida
                </span>
              )}
              {offlineQueueFailed > 0 && (
                <button onClick={clearOfflineFailedOps} title="Limpiar operaciones fallidas" className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {tenantId && (
        <p className="text-xs text-gray-400 text-center">
          Tenant activo: <span className="font-mono">{tenantId}</span>
        </p>
      )}
      <p className="text-xs text-gray-400 text-center">
        La conexión a Supabase se verifica automáticamente cada 30 segundos.
      </p>
    </div>
  )
}
