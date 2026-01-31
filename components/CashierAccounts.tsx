'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

interface CashierAccountsProps {
  accounts: Array<{
    id: string
    table: { name: string; shortCode: string; zone?: string | null }
    initialBalance: string | number | { toString(): string }
    currentBalance: string | number | { toString(): string }
    createdAt: string | Date
    openedBy?: { name: string | null; username: string } | null
    orders: Array<{
      id: string
      createdAt: string | Date
      served: boolean
      rejected?: boolean
      quantity: number
      product: { name: string }
      user?: { username: string; name?: string | null }
    }>
  }>
}

export function CashierAccounts({ accounts }: CashierAccountsProps) {
  const [selectedZone, setSelectedZone] = useState<string>('')
  
  // Auto-refresh cada 30 segundos para ver cambios en cuentas
  useAutoRefresh({ interval: 30000 })

  // Filtrar cuentas por zona
  const filteredAccounts = accounts.filter((acc) => {
    if (selectedZone && acc.table?.zone !== selectedZone) {
      return false
    }
    return true
  })

  if (!accounts.length) {
    return (
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
        <p className="text-white/80">No hay cuentas abiertas en este momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtro por zona */}
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-white mb-2">
          Filtrar por zona
        </label>
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="w-full md:w-auto px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todas las zonas</option>
          <option value="Astronomical">Astronomical</option>
          <option value="Studio54">Studio54</option>
          <option value="Beer Garden">Beer Garden</option>
        </select>
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <p className="text-white/80">
            {selectedZone
              ? `No hay cuentas abiertas en la zona "${selectedZone}"`
              : 'No hay cuentas abiertas en este momento.'}
          </p>
        </div>
      ) : (
        filteredAccounts.map((account) => {
        const totalConsumed =
          Number(account.initialBalance) - Number(account.currentBalance)
        return (
          <div
            key={account.id}
            className="bg-dark-100 border border-dark-200 rounded-xl p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Mesa {account.table.shortCode} · {account.table.name}
                </h3>
                {account.table.zone && (
                  <p className="text-sm text-white/80">Zona: {account.table.zone}</p>
                )}
                <p className="text-sm text-primary-400 font-medium">
                  Mesero: {account.openedBy?.name || account.openedBy?.username || '—'}
                </p>
                <p className="text-xs text-white/70">
                  Abierta {formatDate(account.createdAt)}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 sm:mt-0">
                <div>
                  <p className="text-xs text-white/70">Inicial</p>
                  <p className="text-white font-semibold">
                    {formatCurrency(
                      typeof account.initialBalance === 'object'
                        ? account.initialBalance.toString()
                        : account.initialBalance
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/70">Consumido</p>
                  <p className="text-primary-400 font-semibold">
                    {formatCurrency(Number(totalConsumed))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/70">Disponible</p>
                  <p
                    className={`font-semibold ${
                      Number(account.currentBalance) < 0
                        ? 'text-red-400'
                        : 'text-green-400'
                    }`}
                  >
                    {formatCurrency(Number(account.currentBalance))}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white/80 mb-2">
                Pedidos recientes
              </h4>
              {account.orders.length === 0 ? (
                <p className="text-white/70 text-sm">
                  Esta cuenta aún no tiene pedidos.
                </p>
              ) : (
                <div className="space-y-2">
                  {account.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-2 border-b border-dark-200 last:border-b-0"
                    >
                      <div>
                        <p className="text-white text-sm">
                          {order.quantity} × {order.product.name}
                        </p>
                        <p className="text-xs text-white/70">
                          {formatDate(order.createdAt)} ·{' '}
                          {order.user?.name || order.user?.username || '—'}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          order.rejected === true
                            ? 'bg-red-500/20 text-red-300'
                            : order.served
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-amber-500/20 text-amber-200'
                        }`}
                      >
                        {order.rejected === true ? 'Rechazado' : order.served ? 'Realizado' : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })
      )}
    </div>
  )
}

