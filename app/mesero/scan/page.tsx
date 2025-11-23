'use client'

import { useState, useRef, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const [tableId, setTableId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!tableId.trim()) {
      setError('Por favor ingresa un ID de mesa')
      return
    }

    // Navigate to table page
    router.push(`/mesa/${tableId.trim()}`)
  }

  const handleQRScan = () => {
    // This would integrate with a QR scanner library
    // For now, we'll use manual input
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // QR scanner implementation would go here
      alert('Funcionalidad de escaneo QR se implementará con una librería como html5-qrcode')
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Escanear Mesa
          </h1>
          <p className="text-dark-400">
            Escanea el código QR o ingresa el ID de la mesa manualmente
          </p>
        </div>

        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="tableId"
                className="block text-sm font-medium text-dark-300 mb-2"
              >
                ID de Mesa
              </label>
              <input
                ref={inputRef}
                id="tableId"
                type="text"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                placeholder="Ingresa o escanea el ID de la mesa"
                className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Acceder a Mesa
              </button>
              <button
                type="button"
                onClick={handleQRScan}
                className="px-6 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Escanear QR
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-dark-200">
            <p className="text-sm text-dark-400 mb-4">
              También puedes acceder directamente a una mesa usando su URL:
            </p>
            <code className="block bg-dark-50 px-4 py-2 rounded text-sm text-primary-400">
              /mesa/[table-id]
            </code>
          </div>
        </div>
      </main>
    </div>
  )
}

