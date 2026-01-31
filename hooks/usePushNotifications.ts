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
  const [logLines, setLogLines] = useState<string[]>([])

  const log = useCallback((line: string) => {
    setLogLines((prev) => [...prev, line])
    if (typeof window !== 'undefined') console.log('[Push]', line)
  }, [])

  const subscribe = useCallback(async () => {
    setStatus('loading')
    setMessage('')
    setLogLines([])

    // Android APK: usar FCM con plugin Capacitor
    if (isCapacitorAndroid()) {
      try {
        log('1. Cargando plugin Capacitor Push...')
        const { PushNotifications } = await import('@capacitor/push-notifications')
        log('2. Solicitando permiso de notificaciones...')
        const perm = await PushNotifications.requestPermissions()
        log(`3. Permiso: ${perm.receive}`)
        if (perm.receive !== 'granted') {
          setMessage('Permiso denegado. Activa las notificaciones en Ajustes del dispositivo.')
          setStatus('error')
          return
        }
        log('4. Añadiendo listeners (registration, registrationError)...')
        const tokenPromise = new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Tiempo de espera agotado. En emulador FCM suele fallar: prueba en un móvil real. Si es dispositivo real, revisa que Google Play Services esté actualizado.')),
            30000
          )
          PushNotifications.addListener(
            'registration',
            (ev: { value: string }) => {
              clearTimeout(timeout)
              PushNotifications.removeAllListeners().catch(() => {})
              log('5. Token FCM recibido (primeros 20 chars: ' + (ev.value || '').slice(0, 20) + '...)')
              resolve(ev.value)
            }
          )
          PushNotifications.addListener(
            'registrationError',
            (err: { error: string }) => {
              clearTimeout(timeout)
              PushNotifications.removeAllListeners().catch(() => {})
              log('5. Error FCM: ' + (err?.error || 'desconocido'))
              reject(new Error(err?.error || 'Error al obtener el token de notificaciones'))
            }
          )
        })
        log('5. Llamando register() y esperando token (máx 30s)...')
        await PushNotifications.register()
        const token = await tokenPromise
        log('6. Enviando token al servidor...')
        const res = await fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'android', token }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Error al registrar')
        }
        log('7. Servidor OK. Notificaciones activadas.')
        setMessage('Notificaciones activadas')
        setStatus('success')
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        log('ERROR: ' + errMsg)
        setMessage(errMsg)
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
      // Use existing registration if SW already active (e.g. from ServiceWorkerRegister), else register
      let reg = await navigator.serviceWorker.getRegistration('/')
      if (!reg || !reg.active) {
        reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
      }
      // Wait for active worker - critical for Android/Chrome
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
          setTimeout(resolve, 5000) // Android puede tardar más
        })
      }
      await navigator.serviceWorker.ready

      // Get VAPID public key
      const vapidRes = await fetch('/api/push-vapid')
      if (!vapidRes.ok) {
        throw new Error('Push no disponible')
      }
      const { publicKey } = await vapidRes.json()

      // Request permission (must be after SW registration on Android)
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage(permission === 'denied' ? 'Permiso denegado. Revisa la configuración de notificaciones del navegador.' : 'Permiso denegado')
        setStatus('error')
        return
      }

      // Subscribe to push - con reintentos (Chrome Android puede fallar intermitentemente)
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

  return { subscribe, status, message, logLines }
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
