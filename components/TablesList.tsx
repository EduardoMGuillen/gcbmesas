'use client'

import { useState } from 'react'
import { createTable, updateTable, deleteTable } from '@/lib/actions'
import { generateQRCode } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface TablesListProps {
  initialTables: any[]
}

export function TablesList({ initialTables }: TablesListProps) {
  const [tables, setTables] = useState(initialTables)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ name: '', zone: '' })
  const router = useRouter()
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const newTable = await createTable({
        name: formData.name,
        zone: formData.zone || undefined,
      })
      setTables([...tables, newTable])
      setShowCreateModal(false)
      setFormData({ name: '', zone: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al crear mesa')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTable = async (table: any) => {
    if (
      !confirm(
        `¿Eliminar la mesa "${table.name}"? Esta acción eliminará sus datos históricos (excepto pedidos) y no se puede deshacer.`
      )
    ) {
      return
    }

    setError('')
    setDeleteLoadingId(table.id)

    try {
      await deleteTable(table.id)
      setTables(tables.filter((t) => t.id !== table.id))
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar mesa')
    } finally {
      setDeleteLoadingId(null)
    }
  }

  const handleGenerateQR = async (table: any) => {
    if (!table.qrUrl) {
      setError('La mesa no tiene URL de QR')
      return
    }

    try {
      const qr = await generateQRCode(table.qrUrl)
      setQrCode(qr)
      setSelectedTable(table)
      setShowQRModal(true)
    } catch (err: any) {
      setError('Error al generar QR')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Mesas</h1>
          <p className="text-dark-400">Gestiona las mesas del establecimiento</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Crear Mesa
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table) => (
          <div
            key={table.id}
            className="bg-dark-100 border border-dark-200 rounded-xl p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  {table.name}
                </h3>
                {table.zone && (
                  <p className="text-sm text-dark-400">Zona: {table.zone}</p>
                )}
              </div>
              <button
                onClick={() => handleDeleteTable(table)}
                disabled={
                  deleteLoadingId === table.id || table.accounts.length > 0
                }
                className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                title={
                  table.accounts.length > 0
                    ? 'Cierra las cuentas abiertas antes de eliminar esta mesa'
                    : 'Eliminar mesa'
                }
              >
                {deleteLoadingId === table.id ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Cuentas abiertas:</span>
                <span className="text-white font-semibold">
                  {table.accounts.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Total cuentas:</span>
                <span className="text-white font-semibold">
                  {table._count.accounts}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleGenerateQR(table)}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Ver QR
              </button>
              <a
                href={table.qrUrl || `/mesa/${table.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm text-center"
              >
                Abrir Mesa
              </a>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Crear Mesa
            </h2>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Mesa 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Zona (opcional)
                </label>
                <input
                  type="text"
                  value={formData.zone}
                  onChange={(e) =>
                    setFormData({ ...formData, zone: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Terraza, Interior, VIP"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError('')
                  }}
                  className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQRModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-semibold text-white mb-4">
              QR Code - {selectedTable.name}
            </h2>
            <div className="flex justify-center mb-4">
              {qrCode && (
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              )}
            </div>
            <p className="text-sm text-dark-400 mb-4 text-center">
              {selectedTable.qrUrl}
            </p>
            <button
              onClick={() => {
                setShowQRModal(false)
                setSelectedTable(null)
                setQrCode('')
              }}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

