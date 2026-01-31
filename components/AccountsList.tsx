'use client'

import { useState } from 'react'
import { formatCurrency, formatDate, formatAccountBalance, isOpenAccount } from '@/lib/utils'
import { closeAccount } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

interface AccountsListProps {
  initialAccounts: any[]
}

export function AccountsList({ initialAccounts }: AccountsListProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  // Auto-refresh cada 30 segundos para ver cambios en cuentas
  useAutoRefresh({ interval: 30000 })

  // Función auxiliar para comparar solo fechas (sin hora)
  const isSameOrAfterDate = (date: Date, compareDate: Date) => {
    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const d2 = new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate())
    return d1 >= d2
  }

  const isSameOrBeforeDate = (date: Date, compareDate: Date) => {
    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const d2 = new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate())
    return d1 <= d2
  }

  // Filtrar cuentas por zona, estado y fechas
  const filteredAccounts = accounts.filter((acc) => {
    // Filtro por zona
    if (selectedZone && acc.table?.zone !== selectedZone) {
      return false
    }

    // Filtro por estado
    if (selectedStatus && acc.status !== selectedStatus) {
      return false
    }

    // Filtro por fecha de inicio
    if (startDate) {
      const accDate = new Date(acc.createdAt)
      const filterDate = new Date(startDate)
      if (!isSameOrAfterDate(accDate, filterDate)) {
        return false
      }
    }

    // Filtro por fecha de fin
    if (endDate) {
      const accDate = new Date(acc.createdAt)
      const filterDate = new Date(endDate)
      if (!isSameOrBeforeDate(accDate, filterDate)) {
        return false
      }
    }

    return true
  })

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

      {/* Filtros */}
      <div className="mb-6 bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 -mx-4 sm:mx-0">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Filtros</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtro por zona */}
          <div className="min-w-0 w-full">
            <label className="block text-xs sm:text-sm font-medium text-dark-300 mb-2">
              Zona
            </label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas las zonas</option>
              <option value="Astronomical">Astronomical</option>
              <option value="Studio54">Studio54</option>
              <option value="Beer Garden">Beer Garden</option>
            </select>
          </div>

          {/* Filtro por estado */}
          <div className="min-w-0 w-full">
            <label className="block text-xs sm:text-sm font-medium text-dark-300 mb-2">
              Estado
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas</option>
              <option value="OPEN">Abiertas</option>
              <option value="CLOSED">Cerradas</option>
            </select>
          </div>

          {/* Filtro fecha desde */}
          <div className="min-w-0 w-full overflow-hidden">
            <label className="block text-xs sm:text-sm font-medium text-dark-300 mb-2">
              Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Filtro fecha hasta */}
          <div className="min-w-0 w-full overflow-hidden">
            <label className="block text-xs sm:text-sm font-medium text-dark-300 mb-2">
              Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Botón para limpiar filtros */}
        {(selectedZone || selectedStatus || startDate || endDate) && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-dark-400">
              {filteredAccounts.length} cuenta{filteredAccounts.length !== 1 ? 's' : ''} encontrada{filteredAccounts.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => {
                setSelectedZone('')
                setSelectedStatus('')
                setStartDate('')
                setEndDate('')
              }}
              className="text-sm text-primary-400 hover:text-primary-300 font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center">
          <p className="text-dark-400 text-lg">
            {selectedZone
              ? `No hay cuentas en la zona "${selectedZone}"`
              : 'No hay cuentas disponibles'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => (
          <div
            key={account.id}
            className="bg-dark-100 border border-dark-200 rounded-xl p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  Mesa: {account.table.name}
                </h3>
                {account.table.zone && (
                  <p className="text-sm text-white/80 mb-1">
                    Zona: {account.table.zone}
                  </p>
                )}
                {account.openedBy && (
                  <p className="text-sm text-primary-400 font-medium mb-1">
                    Mesero: {account.openedBy.name || account.openedBy.username}
                  </p>
                )}
                {account.clientName && (
                  <p className="text-sm text-white/90 mb-1">Cliente: {account.clientName}</p>
                )}
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
                  {isOpenAccount(account.initialBalance) ? 'Cuenta Abierta' : formatCurrency(account.initialBalance)}
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
                  {formatAccountBalance(account.initialBalance, account.currentBalance)}
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
      )}

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

