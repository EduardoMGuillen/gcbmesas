/**
 * Detecta si la app se abre como PWA instalada (sin barra del navegador).
 * - Android Chrome / Edge: `display-mode: standalone` cuando está instalada.
 * - iOS Safari "Añadir a pantalla de inicio": `navigator.standalone === true` (legacy).
 *
 * Solo tiene sentido en el cliente (typeof window !== 'undefined').
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false

  if (window.matchMedia('(display-mode: standalone)').matches) return true

  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true

  return false
}

/** Variantes de PWA / pantalla completa (opcional para analytics) */
export function getDisplayMode(): 'browser' | 'standalone' | 'fullscreen' | 'minimal-ui' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown'

  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone'
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen'
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui'

  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return 'standalone'

  return 'browser'
}
