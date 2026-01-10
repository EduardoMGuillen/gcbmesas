import { useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface UseAutoRefreshOptions {
  interval?: number // Intervalo en milisegundos (default: 30000 = 30 segundos)
  enabled?: boolean // Si está habilitado o no (default: true)
  forceReload?: boolean // Si debe forzar recarga completa en lugar de solo refresh (default: false)
  pauseWhen?: () => boolean // Función que retorna true si debe pausar el autorefresh (default: undefined)
  accountId?: string // ID de la cuenta para verificar nuevos pedidos (default: undefined)
  lastOrderId?: string // Último ID de pedido conocido para comparar (default: undefined)
  lastOrderCount?: number // Último conteo de pedidos para comparar (default: undefined)
}

/**
 * Hook para refrescar automáticamente la página cada X segundos
 * Si se proporciona accountId, verifica si hay nuevos pedidos antes de recargar
 * @param options - Opciones de configuración
 * @returns Función para refrescar manualmente si es necesario
 */
export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
  const { 
    interval = 30000, 
    enabled = true, 
    forceReload = false, 
    pauseWhen,
    accountId,
    lastOrderId,
    lastOrderCount
  } = options
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCheckedRef = useRef<{ orderId: string | null; orderCount: number } | null>(null)

  // Inicializar valores de referencia
  useEffect(() => {
    if (lastOrderId !== undefined || lastOrderCount !== undefined) {
      lastCheckedRef.current = {
        orderId: lastOrderId || null,
        orderCount: lastOrderCount || 0,
      }
    }
  }, [lastOrderId, lastOrderCount])

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Función para verificar y recargar
    const checkAndRefresh = async () => {
      // Pausar si la función pauseWhen retorna true (por ejemplo, cuando hay una acción en curso)
      if (pauseWhen && pauseWhen()) {
        return
      }

      // Si tenemos accountId, verificar si hay nuevos pedidos antes de recargar
      if (accountId && lastCheckedRef.current) {
        try {
          const params = new URLSearchParams({
            accountId,
            lastOrderId: lastCheckedRef.current.orderId || '',
            lastOrderCount: lastCheckedRef.current.orderCount.toString(),
          })

          const response = await fetch(`/api/check-new-orders?${params.toString()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          })

          if (response.ok) {
            const data = await response.json()
            
            // Solo recargar si hay nuevos pedidos
            if (data.hasNewOrders) {
              // Actualizar referencia antes de recargar
              lastCheckedRef.current = {
                orderId: data.latestOrderId,
                orderCount: data.orderCount,
              }

              if (forceReload) {
                const currentUrl = window.location.href
                window.location.href = currentUrl
              } else {
                router.refresh()
              }
            }
          }
        } catch (error) {
          // Si hay error verificando, recargar de todos modos (fallback)
          console.error('[useAutoRefresh] Error verificando nuevos pedidos:', error)
          if (forceReload) {
            const currentUrl = window.location.href
            window.location.href = currentUrl
          } else {
            router.refresh()
          }
        }
      } else {
        // Si no hay accountId, usar refresh tradicional
        if (forceReload) {
          const currentUrl = window.location.href
          window.location.href = currentUrl
        } else {
          router.refresh()
        }
      }
    }

    // Configurar nuevo intervalo
    intervalRef.current = setInterval(checkAndRefresh, interval)

    // Limpiar al desmontar o cuando cambian las opciones
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [router, interval, enabled, forceReload, pathname, searchParams, pauseWhen, accountId])

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
