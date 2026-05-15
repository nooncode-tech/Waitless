'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

type PingStatus = 'checking' | 'ok' | 'error'

function StatusDot({ status }: { status: 'ok' | 'warn' | 'error' | 'checking' }) {
  if (status === 'checking') return <span style={{ fontSize: 16, color: '#CCC', display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
  if (status === 'ok')       return <span style={{ fontSize: 16, color: MINT_DEEP }}>✓</span>
  if (status === 'warn')     return <span style={{ fontSize: 16, color: '#D97706' }}>⚠</span>
  return <span style={{ fontSize: 16, color: '#DC2626' }}>✕</span>
}

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 99,
      color, background: bg,
    }}>
      {children}
    </span>
  )
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

  const rowStyle: React.CSSProperties = {
    border: '1px solid #E5E5E5',
    borderRadius: 14,
    background: '#fff',
    padding: '12px 16px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, fontFamily: FONT }}>
      {/* Global summary */}
      <div style={{ ...rowStyle, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>◈</span>
          <h2 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Estado general del sistema</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {overallOk ? (
            <>
              <span style={{ fontSize: 32, color: MINT_DEEP, lineHeight: 1 }}>✓</span>
              <div>
                <p style={{ fontWeight: 700, color: MINT_DEEP, fontSize: 13, margin: 0 }}>Sistema operativo</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  Base de datos, Realtime y cola offline funcionan correctamente
                </p>
              </div>
            </>
          ) : (
            <>
              <span style={{ fontSize: 32, color: '#D97706', lineHeight: 1 }}>⚠</span>
              <div>
                <p style={{ fontWeight: 700, color: '#D97706', fontSize: 13, margin: 0 }}>Atención requerida</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  Uno o más indicadores necesitan revisión
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* DB */}
        <div style={rowStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StatusDot status={dbStatus as 'ok' | 'warn' | 'error' | 'checking'} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#111', margin: 0 }}>Conexión a Supabase</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {pingStatus === 'checking' && 'Verificando…'}
                  {pingStatus === 'ok' && lastPingAt && `OK · ${lastPingMs}ms · último ping ${lastPingAt.toLocaleTimeString()}`}
                  {pingStatus === 'error' && lastPingAt && `Sin respuesta · ${lastPingAt.toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            <button
              onClick={pingSupabase}
              title="Verificar ahora"
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'none', border: '1px solid #E5E5E5',
                cursor: 'pointer', fontSize: 15, color: '#6B7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ↺
            </button>
          </div>
        </div>

        {/* Realtime */}
        <div style={rowStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <StatusDot status={realtimeStatus} />
            <span style={{ fontSize: 15, color: realtimeConnected ? MINT_DEEP : '#D97706' }}>
              {realtimeConnected ? '⊞' : '⊟'}
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111', margin: 0 }}>Realtime</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                {realtimeConnected
                  ? 'Suscripción activa — cambios se reflejan en tiempo real'
                  : 'Sin suscripción activa — los cambios pueden no verse al instante'}
              </p>
            </div>
            <Badge
              color={realtimeConnected ? MINT_DEEP : '#6B7280'}
              bg={realtimeConnected ? MINT : '#F3F4F6'}
            >
              {realtimeConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
        </div>

        {/* Offline queue */}
        <div style={rowStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StatusDot status={queueStatus} />
              <span style={{ fontSize: 15, color: offlineQueuePending > 0 ? '#D97706' : MINT_DEEP }}>
                {offlineQueuePending > 0 ? '⏱' : '✓'}
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#111', margin: 0 }}>Cola offline</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {offlineQueuePending === 0 && offlineQueueFailed === 0
                    ? 'Cola vacía — sin operaciones pendientes'
                    : `${offlineQueuePending} pendiente(s)${offlineQueueFailed > 0 ? ` · ${offlineQueueFailed} fallida(s)` : ''}`}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {offlineQueuePending > 0 && (
                <Badge color="#92400E" bg="#FEF3C7">
                  {offlineQueuePending} pendiente
                </Badge>
              )}
              {offlineQueueFailed > 0 && (
                <Badge color="#B91C1C" bg="#FEE2E2">
                  {offlineQueueFailed} fallida
                </Badge>
              )}
              {offlineQueueFailed > 0 && (
                <button
                  onClick={clearOfflineFailedOps}
                  title="Limpiar operaciones fallidas"
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'none', border: '1px solid #FECACA',
                    cursor: 'pointer', fontSize: 14, color: '#DC2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {tenantId && (
        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
          Tenant activo: <span style={{ fontFamily: MONO }}>{tenantId}</span>
        </p>
      )}
      <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
        La conexión a Supabase se verifica automáticamente cada 30 segundos.
      </p>
    </div>
  )
}
