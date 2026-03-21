'use client'

import { useState, useCallback } from 'react'
import { registerStaffPushSubscription } from '@/lib/client-push-subscribe'

export function usePushNotifications() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  const subscribe = useCallback(async () => {
    setStatus('loading')
    setMessage('')

    const result = await registerStaffPushSubscription()
    if (result.ok) {
      setMessage('Notificaciones activadas')
      setStatus('success')
      return
    }
    setMessage(result.message)
    setStatus('error')
  }, [])

  return { subscribe, status, message }
}
