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
  const [selectedZone, setSelectedZone] = useState<string>('')
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

  // Filtrar mesas por zona
  const filteredTables = selectedZone
    ? tables.filter((t) => t.zone === selectedZone)
    : tables

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

  // Helper function to load image as base64
  const loadImageAsBase64 = (imagePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } else {
          reject(new Error('Failed to get canvas context'))
        }
      }
      img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`))
      img.src = imagePath
    })
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

      // Generate QR codes and create PDF pages for each table (use filtered tables if filter is active)
      const tablesToExport = selectedZone ? filteredTables : tables
      for (let i = 0; i < tablesToExport.length; i++) {
        const table = tablesToExport[i]
        
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

        // Load logo based on zone
        let logoDataURL = ''
        try {
          if (table.zone === 'Astronomical') {
            logoDataURL = await loadImageAsBase64('/LogoAstronomical.png')
          } else if (table.zone === 'Studio54') {
            logoDataURL = await loadImageAsBase64('/LogoStudio54.png')
          } else if (table.zone === 'Beer Garden') {
            logoDataURL = await loadImageAsBase64('/LogoCasaBlanca.png')
          }
        } catch (err) {
          console.error(`Error loading logo for zone ${table.zone}:`, err)
        }

        // Page dimensions
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const centerY = pageHeight / 2

        // Layout: QR with logo on left, then name and code on right - all very compact
        const qrSize = 60 // QR size in mm
        const logoSize = 20 // Logo size in mm (overlaid on QR)
        const spacing = 5 // Small space between QR and text
        
        // Calculate starting X to center everything horizontally
        const startX = 30 // Start from left with some margin
        
        // Vertical centering
        const startY = centerY - qrSize / 2

        // Draw QR Code
        if (qrCodeDataURL) {
          pdf.addImage(qrCodeDataURL, 'PNG', startX, startY, qrSize, qrSize)
        }

        // Draw logo overlaid on QR (bottom-right corner of QR)
        if (logoDataURL) {
          const logoX = startX + qrSize - logoSize - 2 // 2mm padding from edge
          const logoY = startY + qrSize - logoSize - 2 // 2mm padding from edge
          
          // Add white background circle for logo
          pdf.setFillColor(255, 255, 255)
          pdf.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F')
          
          pdf.addImage(logoDataURL, 'PNG', logoX, logoY, logoSize, logoSize)
        }

        // Text next to QR - very compact
        const textX = startX + qrSize + spacing
        const textStartY = startY + 20 // Start text about 1/3 down from QR top
        
        // Table name - large and bold
        pdf.setFontSize(28)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(0, 0, 0)
        pdf.text(table.name, textX, textStartY)
        
        // Short code - right below name, slightly smaller
        if (table.shortCode) {
          pdf.setFontSize(20)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(60, 60, 60)
          pdf.text(`Código: ${table.shortCode}`, textX, textStartY + 10)
        }

        // Zone info - even smaller, below code
        if (table.zone) {
          pdf.setFontSize(14)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(100, 100, 100)
          pdf.text(table.zone, textX, textStartY + 18)
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

      {/* Filtro por zona */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-dark-300 whitespace-nowrap">
          Filtrar por zona:
        </label>
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]"
        >
          <option value="">Todas las zonas</option>
          <option value="Astronomical">Astronomical</option>
          <option value="Studio54">Studio54</option>
          <option value="Beer Garden">Beer Garden</option>
        </select>
        {selectedZone && (
          <span className="text-sm text-dark-400">
            ({filteredTables.length} mesa{filteredTables.length !== 1 ? 's' : ''})
          </span>
        )}
      </div>

      {filteredTables.length === 0 ? (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center">
          <p className="text-dark-400 text-lg">
            {selectedZone
              ? `No hay mesas en la zona "${selectedZone}"`
              : 'No hay mesas disponibles'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table) => (
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
      )}

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
                  Zona
                </label>
                <select
                  value={formData.zone}
                  onChange={(e) =>
                    setFormData({ ...formData, zone: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Selecciona una zona</option>
                  <option value="Astronomical">Astronomical</option>
                  <option value="Studio54">Studio54</option>
                  <option value="Beer Garden">Beer Garden</option>
                </select>
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

