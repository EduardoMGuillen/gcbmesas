'use client'

import { useState } from 'react'
import { createTable, updateTable, deleteTable } from '@/lib/actions'
import { generateQRCode } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'

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
  const [pdfLoading, setPdfLoading] = useState(false)

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
      // No need to refresh since we're updating local state
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

  const handleGeneratePDF = async () => {
    setError('')
    setPdfLoading(true)

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Generate QR codes and create PDF pages for each table
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i]
        
        // Add new page for each table (except the first one)
        if (i > 0) {
          pdf.addPage()
        }

        // Generate QR code for this table
        let qrCodeDataURL = ''
        if (table.qrUrl) {
          try {
            qrCodeDataURL = await generateQRCode(table.qrUrl)
          } catch (err) {
            console.error(`Error generating QR for table ${table.name}:`, err)
          }
        }

        // Page dimensions
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const centerX = pageWidth / 2

        // Title: Table name (centered, large font, top of page)
        pdf.setFontSize(28)
        pdf.setFont('helvetica', 'bold')
        pdf.text(table.name, centerX, 40, { align: 'center' })

        // QR Code (centered, below title)
        if (qrCodeDataURL) {
          const qrSize = 90 // Size in mm
          const qrX = centerX - qrSize / 2
          const qrY = 60
          pdf.addImage(qrCodeDataURL, 'PNG', qrX, qrY, qrSize, qrSize)
        }

        // Short code and zone (below QR code, side by side)
        const infoY = qrCodeDataURL ? 165 : 100
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'normal')
        
        // Short code (left)
        if (table.shortCode) {
          pdf.text(table.shortCode, 40, infoY, { align: 'left' })
        }

        // Zone (right)
        if (table.zone) {
          pdf.text(table.zone, pageWidth - 40, infoY, { align: 'right' })
        }
      }

      // Save the PDF
      pdf.save('mesas-qr-codes.pdf')
    } catch (err: any) {
      setError('Error al generar PDF: ' + (err.message || 'Error desconocido'))
      console.error('Error generating PDF:', err)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Mesas</h1>
          <p className="text-dark-100">
            Gestiona las mesas del establecimiento. Usa el código corto para
            ingreso manual si no puedes escanear el QR.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGeneratePDF}
            disabled={pdfLoading || tables.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {pdfLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar PDF
              </>
            )}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Crear Mesa
          </button>
        </div>
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
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-xl font-semibold text-white">
                    {table.name}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-dark-50 text-white border border-dark-200">
                    {table.shortCode}
                  </span>
                </div>
                {table.zone && (
                  <p className="text-sm text-white/80">Zona: {table.zone}</p>
                )}
              </div>
              <button
                onClick={() => handleDeleteTable(table)}
                disabled={
                  deleteLoadingId === table.id || (table.accounts?.length ?? 0) > 0
                }
                className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                title={
                  (table.accounts?.length ?? 0) > 0
                    ? 'Cierra las cuentas abiertas antes de eliminar esta mesa'
                    : 'Eliminar mesa'
                }
              >
                {deleteLoadingId === table.id ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Cuentas abiertas:</span>
                <span className="text-white font-semibold">
                  {table.accounts?.length ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Total cuentas:</span>
                <span className="text-white font-semibold">
                  {table._count?.accounts ?? 0}
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
            <p className="text-sm text-dark-100 mb-4 text-center">
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

