/* Service Worker - Push Notifications */
// Chrome Android exige un fetch handler para que el SW controle la PWA (aunque sea vacío)
self.addEventListener('fetch', function () {})

self.addEventListener('push', (event) => {
  let title = 'Casa Blanca'
  let body = ''
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
      title = data.title || title
      body = data.body || ''
    } catch (e) {
      body = event.data.text() || ''
    }
  }
  const options = {
    body: body,
    icon: '/LogoCasaBlanca.png',
    badge: '/LogoCasaBlanca.png',
    tag: data.type || 'default',
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: data,
    dir: 'auto',
  }
  event.waitUntil(self.registration.showNotification(title, options))
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
