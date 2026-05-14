'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { formatTime, type Order } from '@/lib/store'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

interface KDSViewProps {
  onBack: () => void
  onLockProfile?: () => void
}

type KDSTab = 'queue' | 'preparing' | 'ready'

function getMinutes(createdAt: Date | string, now: number) {
  return Math.floor((now - new Date(createdAt).getTime()) / 1000 / 60)
}

function formatTimer(createdAt: Date | string, now: number) {
  const secs = Math.floor((now - new Date(createdAt).getTime()) / 1000)
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function getTicketState(order: Order, tab: KDSTab, now: number) {
  if (tab === 'ready') return 'done'
  if (tab === 'queue') return 'new'
  const min = getMinutes(order.createdAt, now)
  if (min >= 15) return 'crit'
  if (min >= 10) return 'warn'
  return 'normal'
}

function TicketCard({ order, tab, now, onStart, onComplete }: {
  order: Order
  tab: KDSTab
  now: number
  onStart?: () => void
  onComplete?: () => void
}) {
  const state = getTicketState(order, tab, now)
  const min = getMinutes(order.createdAt, now)
  const timer = formatTimer(order.createdAt, now)

  const cardStyle: React.CSSProperties = {
    borderRadius: 14, padding: 18,
    display: 'flex', flexDirection: 'column', height: '100%',
    fontFamily: FONT,
    ...(state === 'new'  ? { background: '#171717', color: '#fff' } :
       state === 'done' ? { background: MINT, color: MINT_DEEP } :
       state === 'crit' ? { background: '#FEF2F2', color: '#000', outline: '3px solid #DC2626', outlineOffset: -3 } :
       state === 'warn' ? { background: '#fff', color: '#000', outline: '3px solid #FBBF24', outlineOffset: -3 } :
                          { background: '#fff', color: '#000' }),
  }

  const timerStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: 30, padding: '0 12px', borderRadius: 999,
    fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
    fontVariantNumeric: 'tabular-nums',
    ...(state === 'new'  ? { background: '#fff', color: '#000', animation: 'kds-blink 1.5s infinite' } :
       state === 'done' ? { background: MINT_DEEP, color: MINT } :
       state === 'crit' ? { background: '#DC2626', color: '#fff', animation: 'kds-blink 1.5s infinite' } :
       state === 'warn' ? { background: '#FEF3C7', color: '#92400E' } :
                          { background: MINT, color: MINT_DEEP }),
  }

  const mesaChipStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    height: 20, padding: '0 8px', borderRadius: 999,
    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    ...(state === 'new'  ? { background: '#fff', color: '#000' } :
       state === 'done' ? { background: MINT_DEEP, color: MINT } :
       state === 'crit' ? { background: '#DC2626', color: '#fff' } :
       state === 'warn' ? { background: '#FEF3C7', color: '#92400E' } :
                          { background: MINT, color: MINT_DEEP }),
  }

  const btnStyle: React.CSSProperties = {
    marginTop: 'auto', width: '100%', height: 54, borderRadius: 14,
    fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    border: 'none', cursor: 'pointer', fontFamily: FONT, transition: 'opacity 0.15s',
    ...(state === 'new'  ? { background: '#fff', color: '#000' } :
       state === 'done' ? { background: MINT_DEEP, color: MINT } :
       state === 'crit' ? { background: '#DC2626', color: '#fff' } :
                          { background: '#000', color: '#fff' }),
  }

  const textMuted = state === 'new' ? 'rgba(255,255,255,0.55)' :
                    state === 'done' ? `${MINT_DEEP}99` :
                    'rgba(0,0,0,0.55)'

  const lineStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'baseline', fontSize: 15, letterSpacing: '-0.01em',
    padding: '5px 0',
    borderBottom: `1px dashed ${state === 'new' ? 'rgba(255,255,255,0.2)' : state === 'done' ? `${MINT_DEEP}40` : 'rgba(0,0,0,0.2)'}`,
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, letterSpacing: '-0.04em' }}>
              #{order.numero}
            </div>
            {order.mesa != null && (
              <span style={mesaChipStyle}>M{order.mesa}</span>
            )}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: textMuted, marginTop: 4 }}>
            {order.mesa ? `Mesa ${order.mesa}` : getChannelLabel(order.canal)} · {formatTime(order.createdAt)}
          </div>
        </div>
        <span style={timerStyle}>{state === 'done' ? '✓ LISTO' : timer}</span>
      </div>

      {/* Items */}
      <div style={{ marginTop: 16, flex: 1 }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: textMuted, marginBottom: 8, fontFamily: FONT }}>
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </div>
        <div>
          {order.items.map((item, i) => (
            <div key={i} style={lineStyle}>
              <span style={{ fontWeight: 700, fontFamily: MONO, width: 32, flexShrink: 0 }}>{item.cantidad}×</span>
              <span style={{ flex: 1 }}>{item.menuItem.nombre}</span>
            </div>
          ))}
          {order.notas && (
            <div style={{ ...lineStyle, fontSize: 12, color: textMuted, fontStyle: 'italic' }}>
              <span style={{ width: 32, flexShrink: 0 }} />
              <span>→ {order.notas}</span>
            </div>
          )}
        </div>

        {state === 'warn' && (
          <div style={{ marginTop: 12, fontSize: 11.5, fontFamily: MONO, padding: '10px 12px', borderRadius: 10, background: '#FEF3C7', color: '#92400E' }}>
            ⚠ Alerta SLA · {min}m transcurridos
          </div>
        )}
        {state === 'crit' && (
          <div style={{ marginTop: 12, fontSize: 11.5, fontFamily: MONO, padding: '10px 12px', borderRadius: 10, background: '#DC2626', color: '#fff', fontWeight: 700 }}>
            🔥 Crítico · {min}m — escalar a chef
          </div>
        )}
      </div>

      {/* Action button */}
      <div style={{ marginTop: 16 }}>
        {tab === 'queue' && (
          <button style={btnStyle} onClick={onStart}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 9l3 3 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Tomar ticket
          </button>
        )}
        {tab === 'preparing' && (
          <button style={btnStyle} onClick={onComplete}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 9l3 3 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {state === 'crit' ? 'Atender ahora' : 'Marcar listo'}
          </button>
        )}
        {tab === 'ready' && (
          <button style={btnStyle} disabled>
            ✓ Esperando mesero
          </button>
        )}
      </div>
    </div>
  )
}

function getChannelLabel(canal: string) {
  const map: Record<string, string> = { para_llevar: 'Para llevar', delivery: 'Delivery', mesa: 'QR', mesero: 'Mesero' }
  return map[canal] ?? canal
}

export function KDSView({ onBack, onLockProfile }: KDSViewProps) {
  const { orders, updateKitchenStatus, config } = useApp()
  const [now, setNow] = useState(Date.now())
  const [activeTab, setActiveTab] = useState<KDSTab>('queue')
  const [pacingBlocked, setPacingBlocked] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(interval)
  }, [])

  const relevantOrders = orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')

  const sortBySLA = (list: Order[]) => [...list].sort((a, b) => {
    const minA = getMinutes(a.createdAt, now)
    const minB = getMinutes(b.createdAt, now)
    const score = (m: number) => m >= 15 ? 2 : m >= 10 ? 1 : 0
    const diff = score(minB) - score(minA)
    return diff !== 0 ? diff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const queueOrders    = sortBySLA(relevantOrders.filter(o => o.cocinaStatus === 'en_cola'))
  const preparingOrders = [...relevantOrders.filter(o => o.cocinaStatus === 'preparando')]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const readyOrders    = [...relevantOrders.filter(o => o.cocinaStatus === 'listo')]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const activeOrders = activeTab === 'queue' ? queueOrders : activeTab === 'preparing' ? preparingOrders : readyOrders

  const handleStart = (id: string) => {
    const max = config?.pacingMaxPreparando
    if (max && max > 0 && preparingOrders.length >= max) {
      setPacingBlocked(true)
      setTimeout(() => setPacingBlocked(false), 3000)
      return
    }
    updateKitchenStatus(id, 'preparando')
  }

  const tablesWithQueue = Array.from(new Set(queueOrders.filter(o => o.mesa != null).map(o => o.mesa as number))).sort((a,b) => a-b)

  const timeStr = new Date(now).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const restaurantName = config.restaurantName ?? 'WAITLESS'

  const tabs: { id: KDSTab; label: string; count: number }[] = [
    { id: 'queue',     label: 'En cola',    count: queueOrders.length },
    { id: 'preparing', label: 'Preparando', count: preparingOrders.length },
    { id: 'ready',     label: 'Listos',     count: readyOrders.length },
    { id: 'ready',     label: 'Todo',       count: relevantOrders.length },
  ].filter((t, i, arr) => arr.findIndex(x => x.label === t.label) === i) as { id: KDSTab; label: string; count: number }[]

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: FONT, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh' }}>

      {/* ── TOPBAR ── */}
      <header style={{ height: 72, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', background: '#000', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: MINT, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, letterSpacing: '-0.04em', color: MINT_DEEP }}>W</div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.035em' }}>KDS · Cocina</div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>{restaurantName}</div>
          </div>
        </div>

        {/* Station tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 24 }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id && (tab.label !== 'Todo')
            const isTodo = tab.label === 'Todo'
            return (
              <button
                key={tab.label}
                onClick={() => !isTodo && setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 999,
                  border: `1px solid ${isActive ? '#fff' : 'rgba(255,255,255,0.15)'}`,
                  fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.01em',
                  background: isActive ? '#fff' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#000' : 'rgba(255,255,255,0.7)',
                  cursor: isTodo ? 'default' : 'pointer', fontFamily: FONT,
                }}
              >
                {tab.label}
                <span style={{ fontFamily: MONO, fontSize: 11, padding: '1px 6px', borderRadius: 999, background: isActive ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', color: isActive ? '#000' : '#fff' }}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Stats */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 32 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Hora</div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1, marginTop: 2 }}>{timeStr}</div>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Preparando</div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, letterSpacing: '-0.03em', color: MINT, lineHeight: 1, marginTop: 2 }}>{preparingOrders.length}</div>
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>En cola</div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1, marginTop: 2 }}>{queueOrders.length}</div>
          </div>

          {pacingBlocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', fontSize: 12.5, fontWeight: 700, animation: 'kds-pulse 1s infinite' }}>
              ⚠ Pacing: límite alcanzado
            </div>
          )}

          <button
            onClick={onLockProfile ?? onBack}
            style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
            title={onLockProfile ? 'Cerrar perfil' : 'Salir'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M10 11l4-4-4-4M14 7H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </header>

      {/* ── Fire by table (queue only) ── */}
      {activeTab === 'queue' && tablesWithQueue.length > 0 && (
        <div style={{ padding: '10px 24px', background: 'rgba(251,191,36,0.1)', borderBottom: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#FBBF24', fontWeight: 700 }}>Fuego por mesa</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {tablesWithQueue.map(mesa => (
              <button key={mesa} onClick={() => queueOrders.filter(o => o.mesa === mesa).forEach(o => updateKitchenStatus(o.id, 'preparando'))}
                style={{ height: 36, padding: '0 16px', borderRadius: 999, background: '#FBBF24', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: FONT }}>
                Mesa {mesa}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TICKET GRID ── */}
      <main style={{ flex: 1, padding: 20, overflow: 'auto' }}>
        {activeOrders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(48px,8vw,96px)', letterSpacing: '-0.045em', color: 'rgba(255,255,255,0.05)', lineHeight: 1 }}>
              {activeTab === 'queue' ? 'VACÍO' : activeTab === 'preparing' ? 'LIMPIO' : 'CERO'}
            </div>
            <p style={{ fontFamily: MONO, fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
              {activeTab === 'queue' ? 'Sin órdenes en cola' : activeTab === 'preparing' ? 'Nada preparándose' : 'Sin órdenes listas'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, alignItems: 'start' }}>
            {activeOrders.map(order => (
              <div key={order.id} style={{ minHeight: 280 }}>
                <TicketCard
                  order={order}
                  tab={activeTab}
                  now={now}
                  onStart={activeTab === 'queue' ? () => handleStart(order.id) : undefined}
                  onComplete={activeTab === 'preparing' ? () => updateKitchenStatus(order.id, 'listo') : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, fontFamily: MONO, fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: MINT, display: 'inline-block', animation: 'kds-pulse-dot 1.8s infinite' }} />
          Conectado · Tiempo real
        </div>
        <span>WAITLESS KDS · {restaurantName}</span>
      </footer>

      <style>{`
        @keyframes kds-blink { 50% { opacity: 0.3; } }
        @keyframes kds-pulse { 50% { opacity: 0.6; } }
        @keyframes kds-pulse-dot {
          0%   { box-shadow: 0 0 0 0 rgba(190,235,190,0.8); }
          70%  { box-shadow: 0 0 0 8px rgba(190,235,190,0); }
          100% { box-shadow: 0 0 0 0 rgba(190,235,190,0); }
        }
      `}</style>
    </div>
  )
}
