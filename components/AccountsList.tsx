'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { closeAccount } from '@/lib/actions'
import { useRouter } from 'next/navigation'

interface AccountsListProps {
  initialAccounts: any[]
}

export function AccountsList({ initialAccounts }: AccountsListProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCloseAccount = async (accountId: string) => {
    if (!confirm('¿Estás seguro de cerrar esta cuenta?')) {
      return
    }

    setLoading(true)
    try {
      await closeAccount(accountId)
      setAccounts(
        accounts.map((acc) =>
          acc.id === accountId
            ? { ...acc, status: 'CLOSED', closedAt: new Date() }
            : acc
        )
      )
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error al cerrar cuenta')
    } finally {
      setLoading(false)
    }
  }

  const totalConsumed = (account: any) =>
    Number(account.initialBalance) - Number(account.currentBalance)

  const handleExportExcel = async (accountId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/export-account?accountId=${accountId}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al exportar')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Cuenta_${accountId}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      alert(err.message || 'Error al exportar cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Cuentas</h1>
        <p className="text-dark-400">
          Gestiona todas las cuentas del establecimiento
        </p>
      </div>

      <div className="space-y-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="bg-dark-100 border border-dark-200 rounded-xl p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  Mesa: {account.table.name}
                </h3>
                <p className="text-sm text-dark-400">
                  Creada: {formatDate(account.createdAt)}
                </p>
                {account.closedAt && (
                  <p className="text-sm text-dark-400">
                    Cerrada: {formatDate(account.closedAt)}
                  </p>
                )}
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  account.status === 'OPEN'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {account.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-dark-400 mb-1">Saldo Inicial</p>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(account.initialBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-400 mb-1">Total Consumido</p>
                <p className="text-lg font-semibold text-primary-400">
                  {formatCurrency(totalConsumed(account))}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-400 mb-1">Saldo Final</p>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(account.currentBalance)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setSelectedAccount(account)}
                className="text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                Ver {account.orders.length} pedidos
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportExcel(account.id)}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  Exportar Excel
                </button>
                {account.status === 'OPEN' && (
                  <button
                    onClick={() => handleCloseAccount(account.id)}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm"
                  >
                    Cerrar Cuenta
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">
                Pedidos - Mesa {selectedAccount.table.name}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportExcel(selectedAccount.id)}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  Exportar Excel
                </button>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="text-dark-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {selectedAccount.orders.length === 0 ? (
                <p className="text-dark-400 text-center py-8">
                  No hay pedidos registrados
                </p>
              ) : (
                selectedAccount.orders.map((order: any) => (
                  <div
                    key={order.id}
                    className="bg-dark-50 border border-dark-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-white">
                          {order.product.name}
                          {order.rejected === true && (
                            <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                              Rechazado
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-dark-400">
                          {order.quantity}x {formatCurrency(order.product.price)}
                        </p>
                        <p className="text-xs text-dark-500 mt-1">
                          {formatDate(order.createdAt)} por {order.user.username}
                        </p>
                      </div>
                      <p className="font-semibold text-white">
                        {formatCurrency(order.price)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

