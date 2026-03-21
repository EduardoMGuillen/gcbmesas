'use client'

/**
 * Registro push compartido (mesero / admin / cajero): misma lógica que el panel mesero.
 * - Android APK: Capacitor FCM
 * - Android Chrome PWA: Firebase getToken + fcm: endpoint
 * - Resto: Web Push VAPID + toJSON() al servidor
 */

export type RegisterStaffPushResult =
  | { ok: true }
  | { ok: false; message: string; denied?: boolean; unsupported?: boolean }

function isCapacitorAndroid(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  return cap?.getPlatform?.() === 'android'
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerStaffPushSubscription(): Promise<RegisterStaffPushResult> {
  // Android APK: FCM Capacitor
  if (isCapacitorAndroid()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      const perm = await PushNotifications.requestPermissions()
      if (perm.receive !== 'granted') {
        return {
          ok: false,
          denied: true,
          message: 'Permiso denegado. Activa las notificaciones en Ajustes del dispositivo.',
        }
      }
      const tokenPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(
              new Error(
                'Tiempo de espera agotado. En emulador FCM suele fallar: prueba en un móvil real. Si es dispositivo real, revisa que Google Play Services esté actualizado.'
              )
            ),
          45000
        )
        PushNotifications.addListener('registration', (ev: { value: string }) => {
          clearTimeout(timeout)
          resolve(ev.value)
          PushNotifications.removeAllListeners().catch(() => {})
        })
        PushNotifications.addListener('registrationError', (err: { error: string }) => {
          clearTimeout(timeout)
          reject(new Error(err?.error || 'Error al obtener el token de notificaciones'))
          PushNotifications.removeAllListeners().catch(() => {})
        })
      })
      await new Promise((r) => setTimeout(r, 150))
      await PushNotifications.register()
      const token = await tokenPromise
      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'android', token }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: (err as { error?: string }).error || 'Error al registrar' }
      }
      return { ok: true }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return { ok: false, message: errMsg }
    }
  }

  const isAndroidWeb = /Android/i.test(navigator.userAgent)

  if ('Notification' in window) {
    const permFirst = await Notification.requestPermission()
    if (permFirst !== 'granted') {
      return {
        ok: false,
        denied: true,
        message:
          permFirst === 'denied'
            ? 'Permiso denegado. Activa notificaciones en Ajustes del sitio o dispositivo.'
            : 'Permiso denegado',
      }
    }
  }

  const firebaseWebConfig = (await import('@/lib/firebase-web-config')).getFirebaseWebConfig()

  if (isAndroidWeb && firebaseWebConfig) {
    try {
      const vapidRes = await fetch('/api/push-vapid')
      if (!vapidRes.ok) return { ok: false, message: 'Push no disponible (servidor)' }
      const { publicKey } = await vapidRes.json()
      if (!publicKey) return { ok: false, message: 'Clave VAPID vacía' }
      let reg = await navigator.serviceWorker.getRegistration('/')
      if (!reg || !reg.active) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        await navigator.serviceWorker.ready
      }
      const worker = reg?.installing || reg?.waiting || reg?.active
      if (worker && worker.state !== 'activated') {
        await new Promise<void>((r) => {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') r()
          })
          setTimeout(r, 8000)
        })
      }
      const { getApp, initializeApp } = await import('firebase/app')
      const { getMessaging, getToken } = await import('firebase/messaging')
      let app
      try {
        app = getApp()
      } catch {
        app = initializeApp(firebaseWebConfig)
      }
      const messaging = getMessaging(app)
      const token = await getToken(messaging, {
        vapidKey: publicKey,
        serviceWorkerRegistration: reg ?? undefined,
      })
      if (!token) return { ok: false, message: 'No se obtuvo token FCM' }
      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'android', token }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, message: (err as { error?: string }).error || 'Error al registrar' }
      }
      return { ok: true }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return { ok: false, message: errMsg + ' Prueba de nuevo o usa la app instalada (APK).' }
    }
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      ok: false,
      unsupported: true,
      message:
        'Tu navegador no soporta notificaciones push. Usa Chrome en el móvil (y añade la web a pantalla de inicio) para recibirlas.',
    }
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration('/')
    if (!reg || !reg.active) {
      reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
    }
    const swWorker = reg.installing || reg.waiting || reg.active
    if (swWorker) {
      await new Promise<void>((resolve) => {
        if (swWorker.state === 'activated') {
          resolve()
          return
        }
        swWorker.addEventListener('statechange', () => {
          if (swWorker.state === 'activated') resolve()
        })
        setTimeout(resolve, 8000)
      })
    }
    await navigator.serviceWorker.ready

    const vapidRes = await fetch('/api/push-vapid')
    if (!vapidRes.ok) return { ok: false, message: 'Push no disponible (servidor)' }
    const { publicKey } = await vapidRes.json()
    if (!publicKey) return { ok: false, message: 'Clave VAPID vacía' }

    const key = urlBase64ToUint8Array(publicKey)
    const maxRetries = 3
    let sub: PushSubscription | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt))
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key as BufferSource,
        })
        break
      } catch (e) {
        if (attempt === maxRetries - 1) throw e
      }
    }

    if (!sub) return { ok: false, message: 'No se pudo suscribir a push' }

    const subscription = sub.toJSON()
    const res = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, message: (err as { error?: string }).error || 'Error al registrar' }
    }

    return { ok: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isPushServiceError = /push service|Registration failed.*push/i.test(errMsg)

    let hint = ''
    if (isAndroid) {
      if (isPushServiceError) {
        hint =
          ' Prueba: 1) Agregar la app a pantalla de inicio y abrir desde ahí 2) Usar WiFi en lugar de datos 3) Actualizar Chrome y Google Play Services 4) Cerrar otras pestañas y reintentar.'
      } else {
        hint =
          ' En Android: agrega la app a pantalla de inicio y abre desde ahí. Revisa que las notificaciones estén permitidas en Chrome.'
      }
    }
    return { ok: false, message: errMsg + hint }
  }
}

/**
 * Re-sincroniza la suscripción actual con el usuario de sesión (mismo dispositivo, otro login).
 */
export async function resyncStaffPushSubscriptionIfGranted(): Promise<void> {
  if (typeof window === 'undefined') return
  if (Notification.permission !== 'granted') return
  await refreshAndroidWebFcmTokenIfPossible()
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    const json = sub.toJSON()
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      }),
    })
  } catch {
    // silencioso
  }
}

/**
 * Android PWA (FCM web): no siempre hay PushSubscription; re-envía el token al servidor.
 */
export async function refreshAndroidWebFcmTokenIfPossible(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const isAndroidWeb = /Android/i.test(navigator.userAgent)
  if (!isAndroidWeb) return false
  const firebaseWebConfig = (await import('@/lib/firebase-web-config')).getFirebaseWebConfig()
  if (!firebaseWebConfig) return false
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  try {
    const vapidRes = await fetch('/api/push-vapid')
    if (!vapidRes.ok) return false
    const { publicKey } = await vapidRes.json()
    if (!publicKey) return false
    let reg = await navigator.serviceWorker.getRegistration('/')
    if (!reg || !reg.active) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      await navigator.serviceWorker.ready
    }
    const worker = reg?.installing || reg?.waiting || reg?.active
    if (worker && worker.state !== 'activated') {
      await new Promise<void>((r) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') r()
        })
        setTimeout(r, 8000)
      })
    }
    const { getApp, initializeApp } = await import('firebase/app')
    const { getMessaging, getToken } = await import('firebase/messaging')
    let app
    try {
      app = getApp()
    } catch {
      app = initializeApp(firebaseWebConfig)
    }
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: publicKey,
      serviceWorkerRegistration: reg ?? undefined,
    })
    if (!token) return false
    const res = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'android', token }),
    })
    return res.ok
  } catch {
    return false
  }
}
