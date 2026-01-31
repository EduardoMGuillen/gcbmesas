'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useSession } from 'next-auth/react'

export function PushNotifyButton() {
  const { data: session } = useSession()
  const { subscribe, status, message } = usePushNotifications()

  // Solo mostrar a meseros y admins
  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    return null
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={subscribe}
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
      {message && (
        <span
          className={`text-xs max-w-[240px] text-right break-words ${
            status === 'success' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-white/70'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  )
}
