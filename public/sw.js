/* Service Worker - Push Notifications */
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    const title = data.title || 'Casa Blanca'
    const options = {
      body: data.body || '',
      icon: '/LogoCasaBlanca.png',
      badge: '/LogoCasaBlanca.png',
      tag: data.type || 'default',
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
      data: data,
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch (e) {
    console.error('[SW] Push parse error:', e)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const type = event.notification.data?.type
  if (type === 'new_order' || type === 'test') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/mesero') && 'focus' in client) {
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/mesero/mesas-activas')
        }
      })
    )
  }
})
