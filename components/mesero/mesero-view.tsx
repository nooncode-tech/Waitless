'use client'

import React, { useEffect, useRef } from "react"
import { useState } from 'react'
import { useApp } from '@/lib/context'
import { toast } from 'sonner'
import { TablesGrid } from './tables-grid'
import { TableSession } from './table-session'
import { DeliveryBoard } from './delivery-board'
import { WaiterCallsPanel } from './waiter-calls-panel'
import { WaitlistManager } from '@/components/admin/waitlist-manager'
import { PushSubscribeButton } from '@/components/shared/push-subscribe-button'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

type MeseroScreen = 'tables' | 'session' | 'deliveries' | 'calls' | 'waitlist'

interface MeseroViewProps {
  onBack: () => void
  onLockProfile?: () => void
}

export function MeseroView({ onBack, onLockProfile }: MeseroViewProps) {
  const { getPendingCalls, orders, waitlist, config, currentUser } = useApp()
  const [screen, setScreen] = useState<MeseroScreen>('tables')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const pendingCallsCount = getPendingCalls().length
  const waitingCount = waitlist.filter(e => e.estado === 'esperando').length

  const readyDeliveryCount = orders.filter(o =>
    o.status === 'listo' &&
    (o.canal === 'mesa' || o.canal === 'para_llevar' || o.canal === 'delivery' || o.canal === 'mesero')
  ).length

  const prevReadyRef = useRef(readyDeliveryCount)
  useEffect(() => {
    if (readyDeliveryCount > prevReadyRef.current) {
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } catch { /* AudioContext not available */ }
      toast.success('¡Pedido listo para entregar!', {
        description: `${readyDeliveryCount} pedido${readyDeliveryCount > 1 ? 's' : ''} esperando entrega`,
        duration: 6000,
      })
    }
    prevReadyRef.current = readyDeliveryCount
  }, [readyDeliveryCount])

  const handleSelectTable = (mesa: number) => {
    setSelectedTable(mesa)
    setScreen('session')
  }

  const handleBackFromSession = () => {
    setSelectedTable(null)
    setScreen('tables')
  }

  const navItems = [
    { id: 'tables' as const, label: 'Mesas', icon: '⊞', badge: undefined, badgeType: undefined },
    { id: 'calls' as const, label: 'Llamadas', icon: '◉', badge: pendingCallsCount > 0 ? pendingCallsCount : undefined, badgeType: 'err' as const },
    { id: 'deliveries' as const, label: 'Entregas', icon: '↑', badge: readyDeliveryCount > 0 ? readyDeliveryCount : undefined, badgeType: 'warn' as const },
    { id: 'waitlist' as const, label: 'Espera', icon: '≡', badge: waitingCount > 0 ? waitingCount : undefined, badgeType: 'default' as const },
  ]

  const activeNavId = screen === 'session' ? 'tables' : screen

  return (
    <>
      {/* ─── Mobile layout ─── */}
      <div className="flex flex-col md:hidden" style={{ minHeight: '100vh', background: '#000', fontFamily: FONT }}>
        {/* Mobile header */}
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#000', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onLockProfile ?? onBack} style={{ height: 36, padding: '0 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 999, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
              ← {onLockProfile ? 'Cerrar perfil' : 'Salir'}
            </button>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ width: 24, height: 24, background: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: 12, letterSpacing: '-0.04em', flexShrink: 0 }}>W</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              {config.restaurantName ?? 'Waitless'} · {currentUser?.nombre ?? 'Sala'}
            </span>
          </div>

          {/* Nav tabs */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {navItems.map(item => {
              const isActive = activeNavId === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => { setScreen(item.id); if (item.id === 'tables') setSelectedTable(null) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                    border: 'none', cursor: 'pointer', fontFamily: FONT, position: 'relative',
                    background: isActive ? '#fff' : 'rgba(255,255,255,0.1)',
                    color: isActive ? '#000' : '#fff',
                    flexShrink: 0,
                  }}
                >
                  <span>{item.icon}</span>
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <span style={{
                      fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 999, marginLeft: 2,
                      background: isActive ? '#000' : item.badgeType === 'err' ? '#991B1B' : '#92400E',
                      color: '#fff',
                    }}>{item.badge}</span>
                  )}
                </button>
              )
            })}
          </div>
        </header>

        {/* Mobile content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 10 }}>
          <div style={{ background: '#fff', borderRadius: 14, minHeight: '100%' }}>
            {screen === 'session' && selectedTable ? (
              <TableSession mesa={selectedTable} onBack={handleBackFromSession} />
            ) : screen === 'deliveries' ? (
              <DeliveryBoard />
            ) : screen === 'calls' ? (
              <WaiterCallsPanel />
            ) : screen === 'waitlist' ? (
              <div style={{ padding: 12 }}><WaitlistManager /></div>
            ) : (
              <TablesGrid onSelectTable={handleSelectTable} />
            )}
          </div>
        </main>
      </div>

      {/* ─── Desktop layout ─── */}
      <div className="hidden md:flex" style={{ height: '100vh', width: '100%', overflow: 'hidden', background: '#F7F7F5', fontFamily: FONT }}>
        {/* Sidebar */}
        <aside style={{
          display: 'flex', flexDirection: 'column', height: '100%',
          borderRight: '1px solid #E5E5E5', background: '#fff',
          width: sidebarCollapsed ? 60 : 220, transition: 'width 0.25s ease', flexShrink: 0,
        }}>
          {/* Brand */}
          <div style={{ height: 60, display: 'flex', alignItems: 'center', borderBottom: '1px solid #E5E5E5', padding: '0 14px' }}>
            {!sidebarCollapsed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{ width: 30, height: 30, background: '#000', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.04em', flexShrink: 0 }}>W</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{config.restaurantName ?? 'Waitless'}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#909090' }}>Sala & Mesas</div>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 28, height: 28, background: '#000', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.04em' }}>W</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map(item => {
              const isActive = activeNavId === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => { setScreen(item.id); if (item.id === 'tables') setSelectedTable(null) }}
                  title={sidebarCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: sidebarCollapsed ? '0 0' : '0 12px',
                    height: 42, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: FONT,
                    background: isActive ? '#000' : 'transparent', color: isActive ? '#fff' : '#333',
                    fontWeight: isActive ? 700 : 500, fontSize: 14, width: '100%',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start', position: 'relative',
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                      {item.badge !== undefined && (
                        <span style={{
                          fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                          background: isActive ? 'rgba(255,255,255,0.2)' : item.badgeType === 'err' ? '#FEE2E2' : '#FEF3C7',
                          color: isActive ? '#fff' : item.badgeType === 'err' ? '#991B1B' : '#92400E',
                        }}>{item.badge}</span>
                      )}
                    </>
                  )}
                  {sidebarCollapsed && item.badge !== undefined && (
                    <span style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: item.badgeType === 'err' ? '#991B1B' : '#92400E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#fff' }}>{item.badge}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #E5E5E5', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Collapse toggle */}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: sidebarCollapsed ? '0' : '0 12px', height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#909090', fontSize: 13, fontFamily: FONT, width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
              <span style={{ fontSize: 16 }}>{sidebarCollapsed ? '→' : '←'}</span>
              {!sidebarCollapsed && <span>Colapsar</span>}
            </button>

            {/* Push notifications */}
            <PushSubscribeButton collapsed={sidebarCollapsed} />

            {/* Lock / logout */}
            {onLockProfile && (
              <button onClick={onLockProfile} title={sidebarCollapsed ? 'Cerrar perfil' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: sidebarCollapsed ? '0' : '0 12px', height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#909090', fontSize: 13, fontFamily: FONT, width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
                <span style={{ fontSize: 14 }}>←</span>
                {!sidebarCollapsed && <span>Cerrar perfil</span>}
              </button>
            )}
            {!onLockProfile && (
              <button onClick={onBack} title={sidebarCollapsed ? 'Cerrar sesión' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: sidebarCollapsed ? '0' : '0 12px', height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#991B1B', fontSize: 13, fontFamily: FONT, width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
                <span style={{ fontSize: 14 }}>←</span>
                {!sidebarCollapsed && <span>Cerrar sesión</span>}
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Calls alert bar */}
          {pendingCallsCount > 0 && screen !== 'calls' && (
            <div style={{ flexShrink: 0, borderBottom: '1px solid #FEE2E2', background: '#FEF2F2', padding: '8px 16px' }}>
              <button onClick={() => setScreen('calls')} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#991B1B', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}>
                <span style={{ fontSize: 14 }}>◉</span>
                {pendingCallsCount} llamada{pendingCallsCount !== 1 ? 's' : ''} pendiente{pendingCallsCount !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Content area */}
          <div style={{ flex: 1, overflowY: 'auto', background: '#fff', borderTopLeftRadius: pendingCallsCount > 0 && screen !== 'calls' ? 0 : 14 }}>
            {screen === 'session' && selectedTable ? (
              <TableSession mesa={selectedTable} onBack={handleBackFromSession} />
            ) : screen === 'deliveries' ? (
              <DeliveryBoard />
            ) : screen === 'calls' ? (
              <WaiterCallsPanel />
            ) : screen === 'waitlist' ? (
              <div style={{ padding: 24 }}><WaitlistManager /></div>
            ) : (
              <TablesGrid onSelectTable={handleSelectTable} />
            )}
          </div>
        </main>
      </div>
    </>
  )
}
