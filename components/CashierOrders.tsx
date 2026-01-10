'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setOrderServed, rejectOrder } from '@/lib/actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

interface CashierOrdersProps {
  pendingOrders: Array<{
    id: string
    createdAt: string | Date
    quantity: number
    served: boolean
    product: { name: string; price: string | number | { toString(): string } }
    account: {
      id: string
      table: { name: string; shortCode: string; zone?: string | null }
    }
    user?: { username: string; name?: string | null }
  }>
  recentServed: Array<{
    id: string
    createdAt: string | Date
    quantity: number
    product: { name: string; price: string | number | { toString(): string } }
    account: {
      id: string
      table: { name: string; shortCode: string; zone?: string | null }
    }
    user?: { username: string; name?: string | null }
  }>
}

export function CashierOrders({
  pendingOrders,
  recentServed,
}: CashierOrdersProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedZone, setSelectedZone] = useState<string>('')
  
  // Auto-refresh cada 15 segundos para ver nuevos pedidos pendientes
  useAutoRefresh({ interval: 15000 })

  // Filtrar pedidos por zona
  const filteredPendingOrders = pendingOrders.filter((order) => {
    if (!selectedZone) return true
    return order.account.table.zone === selectedZone
  })

  const filteredRecentServed = recentServed.filter((order) => {
    if (!selectedZone) return true
    return order.account.table.zone === selectedZone
  })

  // Obtener zonas únicas de ambos listados
  const zones = Array.from(
    new Set([
      ...pendingOrders.map((o) => o.account.table.zone).filter(Boolean),
      ...recentServed.map((o) => o.account.table.zone).filter(Boolean),
    ])
  ).filter((zone): zone is string => Boolean(zone)).sort()

  const handleMarkServed = (orderId: string) => {
    startTransition(async () => {
      await setOrderServed(orderId, true)
      router.refresh()
    })
  }

  const handleRejectOrder = (orderId: string) => {
    if (!confirm('¿Estás seguro de rechazar este pedido? El saldo se revertirá en la cuenta.')) {
      return
    }
    startTransition(async () => {
      try {
        await rejectOrder(orderId)
        router.refresh()
      } catch (error: any) {
        alert(error.message || 'Error al rechazar pedido')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Filtro de zona */}
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-white mb-2">
          Filtrar por Zona
        </label>
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todas las zonas</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Pedidos pendientes
              </h2>
              <p className="text-sm text-white/80">
                Marca como realizado cuando el pedido esté listo.
              </p>
            </div>
            <span className="text-sm text-white/80">
              Total: {filteredPendingOrders.length}
            </span>
          </div>

          {filteredPendingOrders.length === 0 ? (
          <p className="text-white/80">No hay pedidos pendientes.</p>
        ) : (
          <div className="space-y-4">
            {filteredPendingOrders.map((order) => (
              <div
                key={order.id}
                className="border border-dark-200 rounded-lg p-4 bg-dark-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold">
                      Mesa {order.account.table.shortCode} ·{' '}
                      {order.account.table.name}
                      {order.account.table.zone && (
                        <span className="ml-2 text-xs bg-primary-600/20 text-primary-400 px-2 py-1 rounded-full">
                          {order.account.table.zone}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-white/70">
                    {formatDate(order.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white">
                      {order.quantity} × {order.product.name}
                    </p>
                    <p className="text-xs text-white/70">
                      Solicitado por {order.user?.name || order.user?.username}
                    </p>
                  </div>
                  <p className="text-primary-400 font-semibold">
                    {formatCurrency(
                      Number(order.product.price) * order.quantity
                    )}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleMarkServed(order.id)}
                    disabled={isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Actualizando...' : 'Aceptar'}
                  </button>
                  <button
                    onClick={() => handleRejectOrder(order.id)}
                    disabled={isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Actualizando...' : 'Rechazar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Pedidos recientes
            </h2>
            <p className="text-sm text-white/80">
              Últimos pedidos marcados como realizados.
            </p>
          </div>
        </div>

        {filteredRecentServed.length === 0 ? (
          <p className="text-white/80">Aún no hay pedidos completados{selectedZone ? ` en ${selectedZone}` : ''}.</p>
        ) : (
          <div className="space-y-3">
            {filteredRecentServed.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between border-b border-dark-200 pb-3 last:border-b-0"
              >
                <div>
                  <p className="text-white text-sm">
                    {order.quantity} × {order.product.name}
                  </p>
                  <p className="text-xs text-white/70">
                    Mesa {order.account.table.shortCode} ·{' '}
                    {order.account.table.name}
                    {order.account.table.zone && ` · ${order.account.table.zone}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/80">
                    {formatCurrency(
                      Number(order.product.price) * order.quantity
                    )}
                  </p>
                  <p className="text-xs text-white/70">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

