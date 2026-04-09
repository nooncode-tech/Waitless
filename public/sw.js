// Service Worker — offline-first para pedido y cocina
const CACHE_NAME = 'app-v2'
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
]

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// P2-4: Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Notificación', body: event.data.text(), url: '/', icon: '/icon-192.png' }
  }

  const { title, body, url, icon } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon ?? '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: url ?? '/' },
      vibrate: [100, 50, 100],
    })
  )
})

// P2-4: Click on push notification — open/focus the target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a tab with this URL is already open, focus it
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})

// Fetch: network-first with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET and Supabase/external requests
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.hostname !== self.location.hostname) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful page navigations
        if (response.ok && event.request.mode === 'navigate') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  )
})
