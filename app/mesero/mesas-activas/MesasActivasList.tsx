'use client'

import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

interface MesasActivasListProps {
  accounts: Array<{
    id: string
    initialBalance: string | number | { toString(): string }
    currentBalance: string | number | { toString(): string }
    createdAt: string | Date
    table: {
      id: string
      name: string
      shortCode: string
      zone: string | null
    }
  }>
}

export function MesasActivasList({ accounts }: MesasActivasListProps) {
  useAutoRefresh({ interval: 30000 })

  if (accounts.length === 0) {
    return (
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center">
        <p className="text-white/80 text-lg mb-2">
          No tienes mesas activas
        </p>
        <p className="text-dark-400 text-sm">
          Las mesas que abras aparecerán aquí para acceso rápido
        </p>
        <Link
          href="/mesero/pedidos"
          className="inline-block mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
        >
          Agregar Pedido
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => {
        const totalConsumed =
          Number(account.initialBalance) - Number(account.currentBalance)
        return (
          <div
            key={account.id}
            className="bg-dark-100 border border-dark-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-white">
                Mesa {account.table.shortCode} · {account.table.name}
              </h3>
              {account.table.zone && (
                <p className="text-sm text-white/80">Zona: {account.table.zone}</p>
              )}
              <p className="text-xs text-white/70 mt-1">
                Abierta {formatDate(account.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <div>
                <p className="text-xs text-white/70">Saldo disponible</p>
                <p
                  className={`font-semibold ${
                    Number(account.currentBalance) < 0
                      ? 'text-red-400'
                      : 'text-green-400'
                  }`}
                >
                  {formatCurrency(
                    typeof account.currentBalance === 'object'
                      ? account.currentBalance.toString()
                      : account.currentBalance
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/70">Consumido</p>
                <p className="font-semibold text-primary-400">
                  {formatCurrency(totalConsumed)}
                </p>
              </div>
            </div>
            <Link
              href={`/mesero/pedidos?tableId=${account.table.id}`}
              className="shrink-0 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              Ir a mesa
            </Link>
          </div>
        )
      })}
    </div>
  )
}
