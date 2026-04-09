// Client-side helpers to fire transactional push notifications via /api/notifications/trigger

import { supabase } from './supabase'

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function triggerPush(event: string, data: Record<string, unknown>): Promise<void> {
  const token = await getToken()
  if (!token) return // anonymous users don't trigger pushes

  // fire-and-forget — never block the UI for a notification
  fetch('/api/notifications/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ event, data }),
  }).catch(() => {})
}

export const pushTriggers = {
  /** Called when a kitchen marks an order as 'listo' */
  orderReady: (mesa: number | undefined, orderId: string) =>
    triggerPush('order_ready', { mesa, orderId }),

  /** Called when a customer (or mesero) creates a waiter call */
  waiterCall: (mesa: number, tipo: string) =>
    triggerPush('waiter_call', { mesa, tipo }),

  /** Called when a new QR order is placed by a customer */
  newQrOrder: (mesa: number) =>
    triggerPush('new_qr_order', { mesa }),
}
