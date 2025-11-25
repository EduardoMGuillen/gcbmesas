'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setOrderServed } from '@/lib/actions'
import { formatCurrency, formatDate } from '@/lib/utils'

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

  const handleMarkServed = (orderId: string) => {
    startTransition(async () => {
      await setOrderServed(orderId, true)
      router.refresh()
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Pedidos pendientes
            </h2>
            <p className="text-sm text-dark-300">
              Marca como realizado cuando el pedido esté listo.
            </p>
          </div>
          <span className="text-sm text-dark-100">
            Total: {pendingOrders.length}
          </span>
        </div>

        {pendingOrders.length === 0 ? (
          <p className="text-dark-300">No hay pedidos pendientes.</p>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="border border-dark-200 rounded-lg p-4 bg-dark-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold">
                      Mesa {order.account.table.shortCode} ·{' '}
                      {order.account.table.name}
                    </p>
                    {order.account.table.zone && (
                      <p className="text-xs text-dark-300">
                        Zona: {order.account.table.zone}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-dark-300">
                    {formatDate(order.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white">
                      {order.quantity} × {order.product.name}
                    </p>
                    <p className="text-xs text-dark-300">
                      Solicitado por {order.user?.name || order.user?.username}
                    </p>
                  </div>
                  <p className="text-primary-400 font-semibold">
                    {formatCurrency(
                      Number(order.product.price) * order.quantity
                    )}
                  </p>
                </div>

                <button
                  onClick={() => handleMarkServed(order.id)}
                  disabled={isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Actualizando...' : 'Marcar como realizado'}
                </button>
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
            <p className="text-sm text-dark-300">
              Últimos pedidos marcados como realizados.
            </p>
          </div>
        </div>

        {recentServed.length === 0 ? (
          <p className="text-dark-300">Aún no hay pedidos completados.</p>
        ) : (
          <div className="space-y-3">
            {recentServed.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between border-b border-dark-200 pb-3 last:border-b-0"
              >
                <div>
                  <p className="text-white text-sm">
                    {order.quantity} × {order.product.name}
                  </p>
                  <p className="text-xs text-dark-300">
                    Mesa {order.account.table.shortCode} ·{' '}
                    {order.account.table.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-dark-100">
                    {formatCurrency(
                      Number(order.product.price) * order.quantity
                    )}
                  </p>
                  <p className="text-xs text-dark-300">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

