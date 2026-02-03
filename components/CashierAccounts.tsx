'use client'

import { useState } from 'react'
import { formatCurrency, formatDate, formatAccountBalance, isOpenAccount } from '@/lib/utils'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

interface CashierAccountsProps {
  accounts: Array<{
    id: string
    table: { name: string; shortCode: string; zone?: string | null }
    initialBalance: string | number | { toString(): string }
    currentBalance: string | number | { toString(): string }
    createdAt: string | Date
    openedBy?: { name: string | null; username: string } | null
    clientName?: string | null
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
  /** Zona seleccionada (filtro compartido con Pedidos) */
  selectedZone?: string
}

function pendingCount(orders: CashierAccountsProps['accounts'][0]['orders']) {
  return orders.filter((o) => !o.served && o.rejected !== true).length
}

export function CashierAccounts({ accounts, selectedZone = '' }: CashierAccountsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (accountId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(accountId)) next.delete(accountId)
      else next.add(accountId)
      return next
    })
  }

  // Auto-refresh cada 30 segundos para ver cambios en cuentas
  useAutoRefresh({ interval: 30000 })

  // Filtrar cuentas por zona (filtro compartido desde el padre)
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
        const pending = pendingCount(account.orders)
        const isExpanded = expandedIds.has(account.id)
        return (
          <div
            key={account.id}
            className="bg-dark-100 border border-dark-200 rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleExpanded(account.id)}
              className="w-full text-left p-6 hover:bg-dark-50/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                {pending > 0 && (
                  <span
                    className="flex h-3 w-3 shrink-0 mt-1.5 rounded-full bg-amber-400 ring-2 ring-amber-400/40"
                    title={`${pending} pedido(s) pendiente(s) sin aceptar`}
                  />
                )}
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
                  {account.clientName && (
                    <p className="text-sm text-white/90">Cliente: {account.clientName}</p>
                  )}
                  <p className="text-xs text-white/70">
                    Abierta {formatDate(account.createdAt)}
                  </p>
                  {account.orders.length > 0 && (
                    <p className="text-xs text-white/60 mt-1">
                      {account.orders.length} pedido(s)
                      {pending > 0 && (
                        <span className="text-amber-400 font-medium"> · {pending} pendiente(s)</span>
                      )}
                      <span className="ml-1 text-white/50">
                        {isExpanded ? ' ▼ cerrar' : ' ▶ ver listado'}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div>
                  <p className="text-xs text-white/70">Inicial</p>
                  <p className="text-white font-semibold">
                    {isOpenAccount(account.initialBalance)
                      ? 'Cuenta Abierta'
                      : formatCurrency(
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
                      !isOpenAccount(account.initialBalance) && Number(account.currentBalance) < 0
                        ? 'text-red-400'
                        : 'text-green-400'
                    }`}
                  >
                    {formatAccountBalance(account.initialBalance, account.currentBalance)}
                  </p>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-dark-200 px-6 pb-6 pt-2">
                <h4 className="text-sm font-semibold text-white/80 mb-2">
                  Listado de pedidos
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
            )}
          </div>
        )
      })
      )}
    </div>
  )
}

