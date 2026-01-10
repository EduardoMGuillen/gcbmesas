import { useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface UseAutoRefreshOptions {
  interval?: number // Intervalo en milisegundos (default: 30000 = 30 segundos)
  enabled?: boolean // Si está habilitado o no (default: true)
  forceReload?: boolean // Si debe forzar recarga completa en lugar de solo refresh (default: false)
  pauseWhen?: () => boolean // Función que retorna true si debe pausar el autorefresh (default: undefined)
}

/**
 * Hook para refrescar automáticamente la página cada X segundos
 * @param options - Opciones de configuración
 * @returns Función para refrescar manualmente si es necesario
 */
export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
  const { interval = 30000, enabled = true, forceReload = false, pauseWhen } = options
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Configurar nuevo intervalo
    intervalRef.current = setInterval(() => {
      // Pausar si la función pauseWhen retorna true (por ejemplo, cuando hay una acción en curso)
      if (pauseWhen && pauseWhen()) {
        return
      }

      if (forceReload) {
        // Para páginas con query params (como /clientes?tableId=...), forzar recarga completa
        // porque revalidatePath no funciona bien con query params en Next.js
        const currentUrl = window.location.href
        window.location.href = currentUrl
      } else {
        router.refresh()
      }
    }, interval)

    // Limpiar al desmontar o cuando cambian las opciones
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [router, interval, enabled, forceReload, pathname, searchParams, pauseWhen])

  // Función para refrescar manualmente
  const refresh = () => {
    if (forceReload) {
      const currentUrl = window.location.href
      window.location.href = currentUrl
    } else {
      router.refresh()
    }
  }

  return { refresh }
}
