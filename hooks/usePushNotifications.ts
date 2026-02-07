'use client'

import { useState, useCallback } from 'react'

function isCapacitorAndroid(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as any).Capacitor
  return cap?.getPlatform?.() === 'android'
}

export function usePushNotifications() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  const subscribe = useCallback(async () => {
    setStatus('loading')
    setMessage('')

    // Android APK: usar FCM con plugin Capacitor
    if (isCapacitorAndroid()) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        const perm = await PushNotifications.requestPermissions()
        if (perm.receive !== 'granted') {
          setMessage('Permiso denegado. Activa las notificaciones en Ajustes del dispositivo.')
          setStatus('error')
          return
        }
        const tokenPromise = new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Tiempo de espera agotado. En emulador FCM suele fallar: prueba en un móvil real. Si es dispositivo real, revisa que Google Play Services esté actualizado.')),
            45000
          )
          PushNotifications.addListener(
            'registration',
            (ev: { value: string }) => {
              clearTimeout(timeout)
              resolve(ev.value)
              PushNotifications.removeAllListeners().catch(() => {})
            }
          )
          PushNotifications.addListener(
            'registrationError',
            (err: { error: string }) => {
              clearTimeout(timeout)
              reject(new Error(err?.error || 'Error al obtener el token de notificaciones'))
              PushNotifications.removeAllListeners().catch(() => {})
            }
          )
        })
        // Dar un tick para que los listeners estén registrados antes de register() (evita race en Android)
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
          throw new Error(err.error || 'Error al registrar')
        }
        setMessage('Notificaciones activadas')
        setStatus('success')
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        setMessage(errMsg)
        setStatus('error')
      }
      return
    }

    const isAndroidWeb = /Android/i.test(navigator.userAgent)

    // Pedir permiso inmediatamente después del gesto del usuario (tap).
    // iOS Safari pierde el contexto del gesto tras múltiples awaits,
    // así que solicitamos el permiso ANTES de cualquier operación pesada.
    if ('Notification' in window) {
      const permFirst = await Notification.requestPermission()
      if (permFirst !== 'granted') {
        setMessage(
          permFirst === 'denied'
            ? 'Permiso denegado. Activa notificaciones en Ajustes del sitio o dispositivo.'
            : 'Permiso denegado'
        )
        setStatus('error')
        return
      }
    }

    const firebaseWebConfig = (await import('@/lib/firebase-web-config')).getFirebaseWebConfig()

    // Android PWA con Firebase Web: usar FCM en el navegador (mismo envío que APK, más fiable que Web Push)
    if (isAndroidWeb && firebaseWebConfig) {
      try {
        const vapidRes = await fetch('/api/push-vapid')
        if (!vapidRes.ok) throw new Error('Push no disponible (servidor)')
        const { publicKey } = await vapidRes.json()
        if (!publicKey) throw new Error('Clave VAPID vacía')
        let reg = await navigator.serviceWorker.getRegistration('/')
        if (!reg || !reg.active) {
          reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
          await navigator.serviceWorker.ready
        }
        const worker = reg?.installing || reg?.waiting || reg?.active
        if (worker && worker.state !== 'activated') {
          await new Promise<void>((r) => {
            worker.addEventListener('statechange', () => { if (worker.state === 'activated') r() })
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
        if (!token) throw new Error('No se obtuvo token FCM')
        const res = await fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'android', token }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Error al registrar')
        }
        setMessage('Notificaciones activadas')
        setStatus('success')
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        setMessage(errMsg + ' Prueba de nuevo o usa la app instalada (APK).')
        setStatus('error')
      }
      return
    }

    // Web: Web Push (Service Worker + VAPID)
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setMessage('Tu navegador no soporta notificaciones push. Usa Chrome en el móvil (y añade la web a pantalla de inicio) para recibirlas.')
      setStatus('error')
      return
    }

    try {
      let reg = await navigator.serviceWorker.getRegistration('/')
      if (!reg || !reg.active) {
        reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
      }
      const worker = reg.installing || reg.waiting || reg.active
      if (worker) {
        await new Promise<void>((resolve) => {
          if (worker.state === 'activated') {
            resolve()
            return
          }
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') resolve()
          })
          setTimeout(resolve, 8000)
        })
      }
      await navigator.serviceWorker.ready

      const vapidRes = await fetch('/api/push-vapid')
      if (!vapidRes.ok) {
        throw new Error('Push no disponible (servidor)')
      }
      const { publicKey } = await vapidRes.json()
      if (!publicKey) throw new Error('Clave VAPID vacía')

      const key = urlBase64ToUint8Array(publicKey)
      const maxRetries = 3
      let sub: PushSubscription | null = null

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 1500 * attempt))
          }
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key as BufferSource,
          })
          break
        } catch (e) {
          if (attempt === maxRetries - 1) throw e
        }
      }

      if (!sub) throw new Error('No se pudo suscribir a push')

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
        throw new Error(err.error || 'Error al registrar')
      }

      setMessage('Notificaciones activadas')
      setStatus('success')
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
      setMessage(errMsg + hint)
      setStatus('error')
    }
  }, [])

  return { subscribe, status, message }
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
