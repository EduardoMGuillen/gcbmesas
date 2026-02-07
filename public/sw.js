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
      // Formato Web Push (VAPID): { title, body, ... }
      // Formato FCM (Firebase Admin → token web): { notification: { title, body }, data: {} }
      const notif = data.notification
      if (notif && (notif.title != null || notif.body != null)) {
        title = (notif.title != null && notif.title !== '') ? notif.title : title
        body = (notif.body != null) ? String(notif.body) : ''
        if (data.data) data = data.data
      } else {
        title = (data.title != null && data.title !== '') ? data.title : title
        body = (data.body != null) ? String(data.body) : ''
      }
    } catch (e) {
      try {
        body = event.data.text() || ''
      } catch (_) {}
    }
  }
  const options = {
    body: body || ' ',
    icon: '/LogoCasaBlanca.png',
    badge: '/LogoCasaBlanca.png',
    tag: (data && data.type) ? data.type : 'default',
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: data || {},
    dir: 'auto',
  }
  const promise = self.registration.showNotification(title, options).catch(function (err) {
    console.error('[sw] showNotification failed', err)
  })
  event.waitUntil(promise)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const type = event.notification.data?.type
  if (type === 'new_order_cajero') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/cajero') && 'focus' in client) {
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/cajero')
        }
      })
    )
  } else if (type === 'new_order' || type === 'test') {
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
