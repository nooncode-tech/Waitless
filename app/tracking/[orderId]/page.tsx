'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import '../tracking.css'

type OrderStatus = 'recibido' | 'preparando' | 'listo' | 'en_camino' | 'entregado' | 'cancelado'

interface TrackingData {
  id: string
  numero: number
  status: OrderStatus
  canal: string
  nombreCliente?: string
  direccion?: string
  zonaReparto?: string
  updatedAt: string
  createdAt: string
}

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

interface StepDef {
  status: OrderStatus
  label: string
  etaLabel: string
}

const STEPS: StepDef[] = [
  { status: 'recibido',   label: 'Recibido',      etaLabel: 'Confirmado' },
  { status: 'preparando', label: 'Cocinando',      etaLabel: 'En preparación' },
  { status: 'listo',      label: 'Listo',          etaLabel: 'Listo para servir' },
  { status: 'en_camino',  label: 'En camino',      etaLabel: 'En camino' },
  { status: 'entregado',  label: 'Entregado',      etaLabel: 'Entregado' },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  recibido: 0, preparando: 1, listo: 2, en_camino: 3, entregado: 4, cancelado: -1,
}

const STATUS_HEADLINE: Record<OrderStatus, string> = {
  recibido:   'Tu pedido\nestá confirmado.',
  preparando: 'Tu pedido\nestá al fuego.',
  listo:      'Tu pedido\nestá listo.',
  en_camino:  'Tu pedido\nestá en camino.',
  entregado:  'Tu pedido\nfue entregado.',
  cancelado:  'Pedido\ncancelado.',
}

const STATUS_SUB: Record<OrderStatus, string> = {
  recibido:   'El restaurante ya lo recibió · en preparación pronto',
  preparando: 'Cocina trabajando · llegará pronto a tu mesa',
  listo:      'El mesero lo llevará en instantes',
  en_camino:  'Ya salió hacia tu dirección',
  entregado:  '¡Buen provecho!',
  cancelado:  'Contacta al restaurante si tienes dudas',
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return '--:--' }
}

export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [data, setData]       = useState<TrackingData | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tracking/${orderId}`)
      if (!res.ok) { setError('Pedido no encontrado'); setLoading(false); return }
      const json = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError('Error al cargar el estado del pedido')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F4F4F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="trk-spinner" />
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', fontFamily: FONT, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Cargando pedido…
          </p>
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#F4F4F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: FONT }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>!</div>
          <p style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em' }}>{error ?? 'Pedido no encontrado'}</p>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>Verifica que el link sea correcto.</p>
        </div>
      </div>
    )
  }

  /* ── Cancelled ── */
  if (data.status === 'cancelado') {
    return (
      <div style={{ minHeight: '100vh', background: '#F4F4F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: FONT }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, color: 'rgba(0,0,0,0.35)' }}>×</div>
          <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.04em' }}>Pedido cancelado</p>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', marginTop: 8 }}>Contacta al restaurante si tienes dudas.</p>
        </div>
      </div>
    )
  }

  const currentIdx = STATUS_ORDER[data.status]

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F2', fontFamily: FONT }}>

      {/* ── Top nav ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.045em' }}>WAITLESS</span>
        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', fontFamily: FONT, letterSpacing: '0.01em' }}>
          Pedido #{data.numero}
        </span>
      </div>

      <div style={{ maxWidth: 420, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* ── Status card ── */}
        <div style={{ background: '#000', borderRadius: 20, padding: '18px 20px 14px', marginBottom: 20, position: 'relative', overflow: 'hidden', minHeight: 110 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: data.direccion ? 14 : 0 }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Estado actual</div>
              <div style={{ fontSize: 26, lineHeight: 1, color: '#fff', fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.04em' }}>
                {STEPS[Math.max(currentIdx, 0)]?.label ?? '—'}
              </div>
            </div>
            <div style={{ background: MINT, color: MINT_DEEP, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>En vivo</div>
          </div>
          {data.direccion && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(data.direccion)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', textDecoration: 'none', color: '#fff' }}
            >
              <span style={{ fontSize: 13 }}>📍</span>
              <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.direccion}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>Maps →</span>
            </a>
          )}
          <div style={{ position: 'absolute', bottom: 10, right: 14, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'ui-monospace, monospace' }}>mapa · próximamente</div>
        </div>

        {/* ── Live status ── */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div className="trk-live-dot" />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(0,0,0,0.5)' }}>
              {data.canal ? `Canal · ${data.canal}` : 'En tiempo real'}
            </span>
          </div>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, letterSpacing: '-0.045em', lineHeight: 1.1, whiteSpace: 'pre-line' }}>
            {STATUS_HEADLINE[data.status]}
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 6, fontFamily: FONT }}>
            {STATUS_SUB[data.status]}
          </p>
        </div>

        {/* ── Timeline ── */}
        <div className="trk-rail" style={{ marginTop: 24, paddingTop: 4 }}>
          {STEPS.map((step, idx) => {
            const done    = idx < currentIdx
            const live    = idx === currentIdx
            const pending = idx > currentIdx
            const stepClass = done ? 'trk-step trk-step-done' : live ? 'trk-step trk-step-live' : 'trk-step'

            return (
              <div key={step.status} className={stepClass}>
                <div className="trk-step-node">
                  {done && '✓'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: pending ? 'rgba(0,0,0,0.4)' : '#000' }}>
                  {step.label}
                </div>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 10.5, color: pending ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.5)', marginTop: 2 }}>
                  {done && idx === 0 ? `${formatTime(data.createdAt)} · #${data.numero} confirmado` :
                   done             ? `${step.etaLabel} ✓` :
                   live             ? `Ahora · actualiza cada 15s` :
                   `ETA pronto`}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Delivery address if any ── */}
        {data.direccion && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', padding: '14px 16px', marginTop: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 2, flexShrink: 0 }}>
              <path d="M8 1C5.8 1 4 2.8 4 5c0 3.1 4 9 4 9s4-5.9 4-9c0-2.2-1.8-4-4-4Z" stroke="rgba(0,0,0,0.4)" strokeWidth="1.4"/>
            </svg>
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, color: 'rgba(0,0,0,0.4)', marginBottom: 3 }}>Dirección de entrega</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{data.direccion}</div>
              {data.zonaReparto && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{data.zonaReparto}</div>}
            </div>
          </div>
        )}

        {/* ── Customer name ── */}
        {data.nombreCliente && (
          <div className="trk-staff-card" style={{ marginTop: 16 }}>
            <div className="trk-staff-avatar">{data.nombreCliente.slice(0,2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{data.nombreCliente}</div>
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 10.5, color: 'rgba(0,0,0,0.5)' }}>
                Pedido #{data.numero} · {data.canal || 'mesa'}
              </div>
            </div>
          </div>
        )}

        {/* ── Auto-refresh notice ── */}
        <div className="trk-status-bar" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11 }}>
            <div className="trk-live-dot" style={{ width: 6, height: 6 }} />
            <span>Actualiza cada 15s · en tiempo real</span>
          </div>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            WAITLESS · v10.2
          </span>
        </div>

      </div>
    </div>
  )
}
