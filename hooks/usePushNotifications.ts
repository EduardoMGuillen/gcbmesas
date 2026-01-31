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
      // Get VAPID public key
      const vapidRes = await fetch('/api/push-vapid')
      if (!vapidRes.ok) {
        throw new Error('Push no disponible')
      }
      const { publicKey } = await vapidRes.json()

      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage('Permiso denegado')
        setStatus('error')
        return
      }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
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
      setMessage(err instanceof Error ? err.message : 'Error al activar notificaciones')
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
