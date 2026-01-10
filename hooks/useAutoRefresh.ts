import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UseAutoRefreshOptions {
  interval?: number // Intervalo en milisegundos (default: 30000 = 30 segundos)
  enabled?: boolean // Si está habilitado o no (default: true)
}

/**
 * Hook para refrescar automáticamente la página cada X segundos
 * @param options - Opciones de configuración
 * @returns Función para refrescar manualmente si es necesario
 */
export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
  const { interval = 30000, enabled = true } = options
  const router = useRouter()
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
      router.refresh()
    }, interval)

    // Limpiar al desmontar o cuando cambian las opciones
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [router, interval, enabled])

  // Función para refrescar manualmente
  const refresh = () => {
    router.refresh()
  }

  return { refresh }
}
