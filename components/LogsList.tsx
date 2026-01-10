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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Logs</h1>
          <p className="text-dark-400">
            Registro de todas las actividades del sistema
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
              className="w-full px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="w-full px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        {(filter.action || filter.userSearch) && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-dark-400">
              {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} encontrado{filteredLogs.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setFilter({ action: '', userSearch: '' })}
              className="text-sm text-primary-400 hover:text-primary-300 font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      <div className="bg-dark-100 border border-dark-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-dark-50 border-b border-dark-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Mesa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
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
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-400">
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
  )
}

