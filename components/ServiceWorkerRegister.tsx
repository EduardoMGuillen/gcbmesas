'use client'

import { useEffect } from 'react'

/**
 * Registra el Service Worker al cargar la app.
 * Necesario en Android/Chrome: el SW debe estar activo antes de pedir permiso de notificaciones
 * y antes de pushManager.subscribe(), sobre todo cuando la PWA se abre desde "Añadir a pantalla de inicio".
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(() => {})
      .catch(() => {})
  }, [])
  return null
}
