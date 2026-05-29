'use client'

import { useApp } from '@/lib/context'
import { getTimeDiff } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

/**
 * Aviso flotante persistente para el dashboard del admin.
 * Muestra las mesas que pidieron la cuenta (waiter_calls tipo 'cuenta' sin atender).
 * Las llamadas llegan en tiempo real por el canal `db-waiter-calls` (lib/context.tsx).
 * Visible en cualquier pantalla del panel; se cierra al marcar "Atender".
 */
export function BillRequestAlerts() {
  const { waiterCalls, markCallAttended, currentUser } = useApp()

  const billCalls = waiterCalls
    .filter(c => !c.atendido && c.tipo === 'cuenta')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  if (billCalls.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 70,
        display: 'flex', flexDirection: 'column', gap: 8,
        width: 'calc(100% - 24px)', maxWidth: 330, pointerEvents: 'none',
      }}
    >
      {billCalls.map(call => (
        <div
          key={call.id}
          style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#000', color: '#fff', borderRadius: 14, padding: '12px 14px',
            boxShadow: '0 10px 32px rgba(0,0,0,0.28)', fontFamily: FONT,
          }}
        >
          <span
            style={{
              width: 34, height: 34, borderRadius: 9, background: MINT, color: MINT_DEEP,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}
          >
            {String(call.mesa).padStart(2, '0')}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Mesa {call.mesa} pidió la cuenta
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              {getTimeDiff(call.createdAt)}
              {call.mensaje ? ` · "${call.mensaje}"` : null}
            </div>
          </div>
          <button
            onClick={() => currentUser && markCallAttended(call.id, currentUser.id)}
            style={{
              background: MINT, color: MINT_DEEP, border: 'none', borderRadius: 999,
              height: 32, padding: '0 14px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0, fontFamily: FONT,
            }}
          >
            Atender
          </button>
        </div>
      ))}
    </div>
  )
}
