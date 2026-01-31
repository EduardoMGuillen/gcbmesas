'use client'

import { useState, useCallback } from 'react'

export function usePushNotifications() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setMessage('Tu navegador no soporta notificaciones push')
      setStatus('error')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      // Register service worker FIRST (required on Android before permission)
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      // Wait for active worker - critical for Android
      const worker = reg.installing || reg.waiting || reg.active
      if (worker) {
        await new Promise<void>((resolve, reject) => {
          if (worker.state === 'activated') {
            resolve()
            return
          }
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') resolve()
          })
          setTimeout(resolve, 3000) // Fallback timeout
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

      // Subscribe to push
      const key = urlBase64ToUint8Array(publicKey)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as BufferSource,
      })

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
      const hint = isAndroid
        ? ' En Android: agrega la app a pantalla de inicio y abre desde ahí. Revisa que las notificaciones estén permitidas en Chrome.'
        : ''
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
