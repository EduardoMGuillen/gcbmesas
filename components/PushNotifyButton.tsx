'use client'

import { useState } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useSession } from 'next-auth/react'

export function PushNotifyButton() {
  const { data: session } = useSession()
  const { subscribe, status, message, logLines = [] } = usePushNotifications()
  const [testLoading, setTestLoading] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const [logVisible, setLogVisible] = useState(true)

  const handleTest = async () => {
    setTestMsg('')
    setTestLoading(true)
    try {
      const res = await fetch('/api/push-test', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setTestMsg('Enviada. Si no la ves: minimiza Chrome o cambia de pestaña.')
      } else {
        setTestMsg(json.error || 'Error al enviar')
      }
    } catch {
      setTestMsg('Error de conexión')
    } finally {
      setTestLoading(false)
    }
  }

  // Solo mostrar a meseros y admins
  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    return null
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {status === 'success' && (
          <button
            onClick={handleTest}
            disabled={testLoading}
            className="px-3 py-2 text-sm font-medium text-primary-400 hover:text-primary-300 hover:bg-dark-200 rounded-lg transition-colors disabled:opacity-50"
            title="Chrome no muestra notificaciones con la pestaña enfocada. Minimiza o cambia de pestaña."
          >
            {testLoading ? 'Enviando...' : 'Probar'}
          </button>
        )}
        <button
          onClick={() => {
            setLogVisible(true)
            subscribe()
          }}
          disabled={status === 'loading'}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-dark-200 rounded-lg transition-colors disabled:opacity-50"
          title="Recibir notificaciones cuando un cliente agregue pedidos a tus mesas"
        >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {status === 'loading' ? 'Activando...' : 'Notificaciones'}
      </button>
      </div>
      {(message || testMsg) && (
        <span className="block max-w-[280px] text-right">
          <span
            className={`text-xs break-words ${
              status === 'success' && !testMsg ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-white/70'
            }`}
          >
            {testMsg || message}
          </span>
          {status === 'success' && typeof navigator !== 'undefined' && (
            <>
              {!/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && (
                <span className="block text-[10px] text-white/50 mt-0.5">
                  En PC: para ver la notificación, minimiza esta pestaña o cambia de ventana antes de &quot;Probar&quot;. Los pedidos llegarán cuando estés en otra pestaña o app.
                </span>
              )}
              {/Android/i.test(navigator.userAgent) && (
                <span className="block text-[10px] text-white/50 mt-0.5">
                  Si en consola ves error de &quot;OAuth&quot; o &quot;authentication&quot;, puedes ignorarlo si las notis llegan.
                </span>
              )}
            </>
          )}
        </span>
      )}
      {(logLines?.length ?? 0) > 0 && logVisible && (
        <div className="mt-2 w-full max-w-[280px] max-h-32 overflow-y-auto rounded bg-dark-200/80 px-2 py-1.5 text-left">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[10px] text-white/60 font-medium">Registro (para pruebas):</p>
            <button
              type="button"
              onClick={() => setLogVisible(false)}
              className="shrink-0 p-0.5 rounded text-white/50 hover:text-white hover:bg-white/10"
              title="Cerrar registro"
              aria-label="Cerrar registro"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {(logLines || []).map((line, i) => (
            <p key={i} className="text-[10px] text-white/80 font-mono leading-tight break-all">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
