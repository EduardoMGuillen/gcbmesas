'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { LogAction } from '@prisma/client'

interface LogsListProps {
  initialLogs: any[]
}

const actionLabels: Record<LogAction, string> = {
  ACCOUNT_OPENED: 'Cuenta Abierta',
  ACCOUNT_CLOSED: 'Cuenta Cerrada',
  ORDER_CREATED: 'Pedido Creado',
  ORDER_CANCELLED: 'Pedido Cancelado',
  ORDER_REJECTED: 'Pedido Rechazado',
  PRODUCT_ADDED: 'Producto Agregado',
  PRODUCT_UPDATED: 'Producto Actualizado',
  PRODUCT_ACTIVATED: 'Producto Activado',
  PRODUCT_DEACTIVATED: 'Producto Desactivado',
  PRODUCT_DELETED: 'Producto Eliminado',
  TABLE_CREATED: 'Mesa Creada',
  TABLE_UPDATED: 'Mesa Actualizada',
  TABLE_DELETED: 'Mesa Eliminada',
  USER_CREATED: 'Usuario Creado',
  USER_UPDATED: 'Usuario Actualizado',
  USER_DELETED: 'Usuario Eliminado',
  LOGIN: 'Inicio de Sesión',
  LOGOUT: 'Cierre de Sesión',
}

function getActionLabel(action: string): string {
  return actionLabels[action as LogAction] || action
}

export function LogsList({ initialLogs }: LogsListProps) {
  const [logs] = useState(initialLogs)
  const [filter, setFilter] = useState({
    action: '',
    userSearch: '',
  })

  const filteredLogs = logs.filter((log) => {
    if (filter.action && log.action !== filter.action) return false
    if (filter.userSearch) {
      const username = log.user?.username || ''
      const searchLower = filter.userSearch.toLowerCase()
      if (!username.toLowerCase().includes(searchLower)) return false
    }
    return true
  })

  const exportToCSV = () => {
    const headers = ['Fecha', 'Acción', 'Usuario', 'Mesa', 'Detalles']
    const rows = filteredLogs.map((log) => [
      formatDate(log.createdAt),
      getActionLabel(log.action),
      log.user?.username || 'N/A',
      log.table?.name || 'N/A',
      JSON.stringify(log.details || {}),
    ])

    const csvContent =
      headers.join(',') +
      '\n' +
      rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `logs-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Logs</h1>
          <p className="text-sm sm:text-base text-dark-400">
            Registro de todas las actividades del sistema
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
        >
          Exportar CSV
        </button>
      </div>

      <div className="mb-6 bg-dark-100 border border-dark-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Filtrar por Acción
            </label>
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base touch-manipulation"
            >
              <option value="">Todas las acciones</option>
              {Object.entries(actionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Buscar por Usuario
            </label>
            <input
              type="text"
              value={filter.userSearch}
              onChange={(e) => setFilter({ ...filter, userSearch: e.target.value })}
              placeholder="Escribe el nombre de usuario..."
              className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
            />
          </div>
        </div>
        {(filter.action || filter.userSearch) && (
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-sm text-dark-400">
              {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} encontrado{filteredLogs.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setFilter({ action: '', userSearch: '' })}
              className="text-sm text-primary-400 hover:text-primary-300 font-medium touch-manipulation py-2"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Vista móvil - Cards */}
      <div className="block md:hidden space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 text-center text-dark-400">
            No hay logs disponibles
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-dark-100 border border-dark-200 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-400 whitespace-nowrap">
                      {getActionLabel(log.action)}
                    </span>
                    <span className="text-xs text-dark-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-white">
                      <span className="text-dark-400">Usuario: </span>
                      {log.user?.username || 'N/A'}
                    </div>
                    {log.table?.name && (
                      <div className="text-sm text-white">
                        <span className="text-dark-400">Mesa: </span>
                        {log.table.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <details className="cursor-pointer border-t border-dark-200 pt-3 mt-2 touch-manipulation">
                  <summary className="text-primary-400 hover:text-primary-300 active:text-primary-500 text-sm font-medium list-none touch-manipulation select-none py-2 -mx-1 px-1 rounded hover:bg-dark-50/50 transition-colors">
                    <span className="flex items-center justify-between">
                      <span>Ver detalles</span>
                      <svg className="w-4 h-4 inline-block ml-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <div className="mt-2 pt-2">
                    <pre className="text-xs bg-dark-50 p-3 rounded overflow-auto max-h-40 text-dark-300 whitespace-pre-wrap break-words">
                      {JSON.stringify(log.details || {}, null, 2)}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          ))
        )}
      </div>

      {/* Vista desktop - Tabla */}
      <div className="hidden md:block relative -mx-4 sm:mx-0">
        <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="inline-block min-w-full sm:min-w-0 sm:w-full px-4 sm:px-0">
            <div className="bg-dark-100 border border-dark-200 rounded-xl overflow-hidden">
              <table className="w-full table-auto">
            <thead className="bg-dark-50 border-b border-dark-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                  Acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                  Mesa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                  Detalles
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-dark-400">
                    No hay logs disponibles
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-400">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-400 whitespace-nowrap">
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {log.user?.username || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {log.table?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-400">
                      <details className="cursor-pointer">
                        <summary className="text-primary-400 hover:text-primary-300">
                          Ver detalles
                        </summary>
                        <pre className="mt-2 text-xs bg-dark-50 p-2 rounded overflow-auto">
                          {JSON.stringify(log.details || {}, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

