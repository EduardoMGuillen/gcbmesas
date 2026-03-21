'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

function base64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replaceAll('-', '+').replaceAll('_', '/')
  const raw = atob(b64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output.buffer as ArrayBuffer
}

type Status = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'error'

const STAFF_ROLES = ['MESERO', 'ADMIN', 'CAJERO'] as const

export function PushSubscriptionButton() {
  const { data: session } = useSession()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testMsg, setTestMsg] = useState('')

  const canTest =
    session?.user?.role && STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])

  const handleTest = async () => {
    setTestMsg('')
    setTestLoading(true)
    try {
      const res = await fetch('/api/push-test', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setTestMsg('Enviada. Si no la ves: minimiza la app o cambia de pestaña.')
      } else {
        setTestMsg(json.error || 'Error al enviar')
      }
    } catch {
      setTestMsg('Error de conexión')
    } finally {
      setTestLoading(false)
    }
  }

  // On mount: check if already subscribed or permission denied
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    const perm = Notification.permission
    if (perm === 'denied') { setStatus('denied'); return }
    if (perm === 'granted') {
      // Check if we actually have an active subscription
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription()
      ).then(sub => {
        if (sub) setStatus('granted')
      }).catch(() => {})
    }
  }, [])

  async function enable() {
    setStatus('loading')
    setMessage(null)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported')
        return
      }

      // 1. Pedir permiso
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        setMessage('Debes permitir notificaciones en la configuración del navegador.')
        return
      }

      // 2. Obtener clave pública VAPID del servidor
      const vapidRes = await fetch('/api/push-vapid')
      if (!vapidRes.ok) {
        setStatus('error')
        setMessage('Notificaciones push no configuradas en el servidor.')
        return
      }
      const { publicKey } = await vapidRes.json()
      if (!publicKey) {
        setStatus('error')
        setMessage('Falta VAPID_PUBLIC_KEY en las variables de entorno.')
        return
      }

      // 3. Registrar service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // 4. Suscribirse al PushManager
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(publicKey),
        })
      }

      // 5. Enviar suscripción al servidor
      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setStatus('error')
        setMessage(err.error || 'Error al registrar el dispositivo.')
        return
      }

      setStatus('granted')
      setMessage('✓ Notificaciones activadas')
    } catch (err: any) {
      console.error('[PushSubscription]', err)
      setStatus('error')
      setMessage('Error activando notificaciones. Intenta nuevamente.')
    }
  }

  // Suscripción activa: estado + probar (igual que el antiguo PushNotifyButton en admin)
  if (status === 'granted') {
    return (
      <div className="flex flex-col items-end gap-1 max-w-[min(100%,280px)]">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green-400/90 font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block shrink-0" />
            Notificaciones activas
          </span>
          {canTest && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testLoading}
              className="px-2.5 py-1 text-xs font-medium text-primary-400 hover:text-primary-300 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 border border-primary-500/30"
              title="Chrome no muestra notificación con la pestaña enfocada; minimiza o cambia de app."
            >
              {testLoading ? 'Enviando…' : 'Probar'}
            </button>
          )}
        </div>
        {testMsg && <p className="text-[11px] text-right text-green-400/90 break-words">{testMsg}</p>}
        {typeof navigator !== 'undefined' &&
          !/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && (
            <p className="text-[10px] text-right text-white/45 max-w-[260px]">
              En PC: minimiza esta ventana o cambia de pestaña antes de pulsar Probar.
            </p>
          )}
      </div>
    )
  }

  // Navegador no soporta push — ocultar
  if (status === 'unsupported') return null

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={enable}
        disabled={status === 'loading'}
        className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
        style={{
          background: status === 'denied' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.2)',
          border: `1px solid ${status === 'denied' ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
          color: status === 'denied' ? '#f87171' : '#a5b4fc',
        }}
      >
        {status === 'loading' ? (
          <>
            <span className="w-3 h-3 rounded-full border border-indigo-400 border-t-transparent animate-spin" />
            Activando…
          </>
        ) : status === 'denied' ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            Notificaciones bloqueadas
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            Activar notificaciones push
          </>
        )}
      </button>
      {message && status !== 'denied' && (
        <p className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
