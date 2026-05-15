'use client'

import { useEffect, useState } from 'react'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPushSubscription,
} from '@/lib/push-client'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'

interface PushSubscribeButtonProps {
  collapsed?: boolean
}

export function PushSubscribeButton({ collapsed = false }: PushSubscribeButtonProps) {
  const [state, setState] = useState<PushState>(() => {
    if (!isPushSupported()) return 'unsupported'
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'denied'
    return 'loading'
  })

  useEffect(() => {
    if (state !== 'loading') return
    getCurrentPushSubscription().then((sub) => {
      setState(sub ? 'subscribed' : 'unsubscribed')
    })
  }, [state])

  async function handleToggle() {
    if (state === 'subscribed') {
      setState('loading')
      try { await unsubscribeFromPush() } catch { /* ignore */ }
      setState('unsubscribed')
    } else if (state === 'unsubscribed') {
      setState('loading')
      try {
        const sub = await subscribeToPush()
        if (sub) {
          setState('subscribed')
        } else {
          setState(Notification.permission === 'denied' ? 'denied' : 'unsubscribed')
        }
      } catch {
        setState('unsubscribed')
      }
    }
  }

  if (state === 'unsupported') return null
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return null

  const label =
    state === 'loading' ? 'Cargando...' :
    state === 'denied' ? 'Notificaciones bloqueadas' :
    state === 'subscribed' ? 'Silenciar notificaciones' :
    'Activar notificaciones'

  const icon =
    state === 'subscribed' ? '🔔' :
    state === 'denied' ? '🔕' :
    '🔔'

  const iconColor =
    state === 'subscribed' ? '#4ade80' :
    state === 'denied' ? '#ef4444' :
    '#909090'

  return (
    <button
      onClick={handleToggle}
      disabled={state === 'loading' || state === 'denied'}
      title={label}
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: collapsed ? 0 : '0 12px', height: 36,
        borderRadius: 10, border: 'none', cursor: state === 'loading' || state === 'denied' ? 'default' : 'pointer',
        background: 'transparent', color: '#909090', fontSize: 13,
        fontFamily: FONT, width: '100%',
        justifyContent: collapsed ? 'center' : 'flex-start',
        opacity: state === 'loading' || state === 'denied' ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: 14, color: iconColor }}>{icon}</span>
      {!collapsed && <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
    </button>
  )
}
