'use client'

// P2-4: Push notification subscribe/unsubscribe button for staff
import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPushSubscription,
} from '@/lib/push-client'

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
      try {
        await unsubscribeFromPush()
      } catch {
        // ignore
      }
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
    state === 'subscribed' ? <BellRing className="h-4 w-4 shrink-0 text-green-500" /> :
    state === 'denied' ? <BellOff className="h-4 w-4 shrink-0 text-destructive" /> :
    <Bell className="h-4 w-4 shrink-0" />

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`w-full h-9 text-muted-foreground ${collapsed ? 'justify-center px-0' : 'justify-start gap-3'}`}
      onClick={handleToggle}
      disabled={state === 'loading' || state === 'denied'}
      title={label}
      aria-label={label}
    >
      {icon}
      {!collapsed && <span className="text-sm truncate">{label}</span>}
    </Button>
  )
}
