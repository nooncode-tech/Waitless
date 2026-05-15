'use client'

import { useApp } from '@/lib/context'
import { getTimeDiff } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

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

  const getCallLabel = (tipo: string) => {
    switch (tipo) {
      case 'cuenta': return 'Pedir cuenta'
      case 'atencion': return 'Atención'
      default: return 'Otro'
    }
  }

  return (
    <div style={{ fontFamily: FONT, minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: '1px solid #E5E5E5',
        position: 'sticky', top: 0, background: '#fff', zIndex: 10,
      }}>
        <div style={{
          width: 30, height: 30, background: '#000', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.04em', flexShrink: 0,
        }}>W</div>
        <div style={{ lineHeight: 1.15, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em' }}>Llamadas de atención</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#909090' }}>{currentUser?.nombre ?? ''}</div>
        </div>
        {pendingCalls.length > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
            color: '#0a3a0a', background: '#BEEBBE', padding: '5px 10px', borderRadius: 999, flexShrink: 0,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#0a3a0a', display: 'inline-block' }} />
            {pendingCalls.length}
          </div>
        )}
      </div>

      {pendingCalls.length === 0 ? (
        <div style={{ padding: '50px 24px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, letterSpacing: '-0.06em', fontSize: 80, color: 'rgba(0,0,0,0.08)', lineHeight: 1 }}>Ø</div>
          <div style={{ fontWeight: 700, letterSpacing: '-0.04em', fontSize: 24, marginTop: 14 }}>Todo tranquilo.</div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#909090', marginTop: 6 }}>Sin llamadas activas en el turno.</div>
        </div>
      ) : (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendingCalls.map((call) => {
            const session = tableSessions.find(s => s.mesa === call.mesa && s.activa)
            return (
              <div key={call.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: 14, background: '#000', color: '#fff', borderRadius: 14,
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8, background: '#BEEBBE', color: '#0a3a0a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {String(call.mesa).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>Mesa {call.mesa}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                    {getCallLabel(call.tipo)} · {getTimeDiff(call.createdAt)}
                    {call.mensaje ? ` · "${call.mensaje}"` : null}
                  </div>
                  {session && (
                    <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {session.orders.length} pedido{session.orders.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAttendCall(call.id)}
                  style={{
                    background: '#BEEBBE', color: '#0a3a0a', height: 34,
                    padding: '0 14px', borderRadius: 999, fontSize: 12,
                    fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Atender
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
