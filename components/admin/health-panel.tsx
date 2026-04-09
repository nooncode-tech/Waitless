'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  Inbox,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Activity,
} from 'lucide-react'

type PingStatus = 'checking' | 'ok' | 'error'

function StatusDot({ status }: { status: 'ok' | 'warn' | 'error' | 'checking' }) {
  if (status === 'checking')
    return <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === 'warn') return <AlertCircle className="h-4 w-4 text-yellow-500" />
  return <XCircle className="h-4 w-4 text-red-500" />
}

export function HealthPanel() {
  const { realtimeConnected, offlineQueuePending, offlineQueueFailed, clearOfflineFailedOps, tenantId } =
    useApp()

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

  // Ping al montar y cada 30 segundos
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
    <div className="p-4 space-y-4 max-w-2xl">
      {/* Resumen global */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Estado general del sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {overallOk ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-semibold text-green-600">Sistema operativo</p>
                  <p className="text-sm text-muted-foreground">
                    Base de datos, Realtime y cola offline funcionan correctamente
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="font-semibold text-yellow-600">Atención requerida</p>
                  <p className="text-sm text-muted-foreground">
                    Uno o más indicadores necesitan revisión
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Indicadores detallados */}
      <div className="grid gap-3">
        {/* Base de datos */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusDot status={dbStatus as 'ok' | 'warn' | 'error' | 'checking'} />
                <div>
                  <p className="font-medium text-sm">Conexión a Supabase</p>
                  <p className="text-xs text-muted-foreground">
                    {pingStatus === 'checking' && 'Verificando…'}
                    {pingStatus === 'ok' &&
                      lastPingAt &&
                      `OK · ${lastPingMs}ms · último ping ${lastPingAt.toLocaleTimeString()}`}
                    {pingStatus === 'error' &&
                      lastPingAt &&
                      `Sin respuesta · ${lastPingAt.toLocaleTimeString()}`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={pingSupabase} title="Verificar ahora">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Realtime */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <StatusDot status={realtimeStatus} />
              <div className="flex items-center gap-2 flex-1">
                {realtimeConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium text-sm">Realtime</p>
                  <p className="text-xs text-muted-foreground">
                    {realtimeConnected
                      ? 'Suscripción activa — cambios se reflejan en tiempo real'
                      : 'Sin suscripción activa — los cambios pueden no verse al instante'}
                  </p>
                </div>
              </div>
              <Badge
                variant={realtimeConnected ? 'default' : 'secondary'}
                className={realtimeConnected ? 'bg-green-100 text-green-700' : ''}
              >
                {realtimeConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Cola offline */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusDot status={queueStatus} />
                <div className="flex items-center gap-2">
                  {offlineQueuePending > 0 ? (
                    <Clock className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Inbox className="h-4 w-4 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">Cola offline</p>
                    <p className="text-xs text-muted-foreground">
                      {offlineQueuePending === 0 && offlineQueueFailed === 0
                        ? 'Cola vacía — sin operaciones pendientes'
                        : `${offlineQueuePending} pendiente(s)${offlineQueueFailed > 0 ? ` · ${offlineQueueFailed} fallida(s)` : ''}`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {offlineQueuePending > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    {offlineQueuePending} pendiente
                  </Badge>
                )}
                {offlineQueueFailed > 0 && (
                  <Badge variant="destructive">{offlineQueueFailed} fallida</Badge>
                )}
                {offlineQueueFailed > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearOfflineFailedOps}
                    title="Limpiar operaciones fallidas"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant activo */}
      {tenantId && (
        <p className="text-xs text-muted-foreground text-center">
          Tenant activo: <span className="font-mono">{tenantId}</span>
        </p>
      )}

      {/* Info adicional */}
      <p className="text-xs text-muted-foreground text-center">
        La conexión a Supabase se verifica automáticamente cada 30 segundos.
      </p>
    </div>
  )
}
