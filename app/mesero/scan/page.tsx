'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [manualLoading, setManualLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<any>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        // Detener el escáner de forma segura
        const scanner = scannerRef.current
        
        // Intentar detener con mejor manejo de errores
        try {
          // Verificar si el escáner tiene el método stop
          if (typeof scanner.stop === 'function') {
            await scanner.stop().catch((err: any) => {
              console.debug('[QR Scanner] Scanner already stopped or error:', err)
            })
          }
        } catch (error) {
          console.debug('[QR Scanner] Error in stop:', error)
        }

        // Limpiar el DOM
        try {
          if (typeof scanner.clear === 'function') {
            await scanner.clear().catch((err: any) => {
              console.debug('[QR Scanner] Error clearing scanner:', err)
            })
          }
        } catch (error) {
          console.debug('[QR Scanner] Error in clear:', error)
        }

        // Limpiar el contenedor manualmente
        if (scannerContainerRef.current) {
          scannerContainerRef.current.innerHTML = ''
        }
      } catch (error) {
        console.warn('[QR Scanner] Error stopping scanner:', error)
      } finally {
        scannerRef.current = null
      }
    }

    // Nota: html5-qrcode debería detener los tracks de medios automáticamente
    // pero si hay algún problema, los métodos stop() y clear() deberían manejarlo

    if (isMountedRef.current) {
      setIsScanning(false)
      setScannerError('')
    }
  }, [])

  // Limpieza completa al desmontar
  useEffect(() => {
    inputRef.current?.focus()
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      stopScanner()
    }
  }, [stopScanner])

  // Detener escáner cuando la página pierde visibilidad
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopScanner()
      }
    }

    const handleBeforeUnload = () => {
      stopScanner()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [stopScanner])

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!manualCode.trim()) {
      setError('Por favor ingresa un ID o código corto de mesa')
      return
    }

    setManualLoading(true)
    try {
      const response = await fetch('/api/table-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: manualCode.trim() }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'No encontramos una mesa con ese código.')
      }

      const data = await response.json()
      router.push(`/mesero/pedidos?tableId=${data.id}`)
    } catch (err: any) {
      setError(err.message || 'No encontramos una mesa con ese código.')
    } finally {
      setManualLoading(false)
    }
  }

  const parseTableId = (scannedText: string) => {
    try {
      const url = new URL(scannedText)
      const parts = url.pathname.split('/').filter(Boolean)
      const mesaIndex = parts.findIndex((part) => part === 'mesa')
      if (mesaIndex !== -1 && parts[mesaIndex + 1]) {
        return parts[mesaIndex + 1]
      }
      return parts.pop() || scannedText
    } catch (error) {
      return scannedText
    }
  }

  const startScanner = async () => {
    // Primero detener cualquier escáner activo
    await stopScanner()

    // Pequeña pausa para asegurar limpieza completa
    await new Promise(resolve => setTimeout(resolve, 100))

    setScannerError('')

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setScannerError('Tu dispositivo no soporta el acceso a la cámara desde el navegador.')
      return
    }

    try {
      const permissionStatus = await navigator.mediaDevices.getUserMedia({ video: true })
      permissionStatus.getTracks().forEach((track) => track.stop())
      setCameraPermission('granted')
    } catch (permissionError) {
      console.error('[QR Scanner] Camera permission denied:', permissionError)
      setCameraPermission('denied')
      setScannerError('No pudimos acceder a la cámara. Por favor, otorga permisos en la configuración del navegador.')
      return
    }

    // Establecer isScanning primero para que React renderice el contenedor
    setIsScanning(true)

    // Esperar a que React renderice el contenedor usando requestAnimationFrame para asegurar que el DOM esté listo
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 200) // Aumentado a 200ms para dar más tiempo
        })
      })
    })

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      
      // Esperar y verificar múltiples veces que el contenedor esté disponible
      let attempts = 0
      const maxAttempts = 10
      while (!scannerContainerRef.current && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50))
        attempts++
      }
      
      // Verificar nuevamente después de esperar
      if (!scannerContainerRef.current) {
        console.error('[QR Scanner] Container not available after multiple attempts')
        setScannerError('Error: El contenedor del escáner no está disponible. Por favor, intenta nuevamente.')
        setIsScanning(false)
        return
      }

      // Asegurar que el contenedor tenga un ID
      if (!scannerContainerRef.current.id) {
        scannerContainerRef.current.id = 'qr-reader'
      }

      // Limpiar el contenedor antes de crear una nueva instancia
      scannerContainerRef.current.innerHTML = ''

      const cameras = await Html5Qrcode.getCameras()
      if (!cameras.length) {
        setScannerError('No encontramos una cámara disponible en este dispositivo.')
        setIsScanning(false)
        return
      }

      const preferredCamera = cameras.find((camera) => camera.label.toLowerCase().includes('back')) || cameras[0]

      // Crear nueva instancia del escáner
      const html5QrCode = new Html5Qrcode(scannerContainerRef.current.id, {
        verbose: false,
      })
      
      // Verificar que no haya otra instancia activa
      if (scannerRef.current) {
        console.warn('[QR Scanner] Ya existe una instancia activa, limpiando...')
        await stopScanner()
      }
      
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        preferredCamera.id,
        {
          fps: 10,
          qrbox: window.innerWidth < 640 ? { width: 220, height: 220 } : { width: 300, height: 300 },
          aspectRatio: 1.0,
        },
                (decodedText: string) => {
          if (!isMountedRef.current) return
          
                  const parsedId = parseTableId(decodedText)
                  setManualCode(parsedId)
                  stopScanner()
          router.push(`/mesero/pedidos?tableId=${parsedId}`)
                },
        (errorMessage: string) => {
          // Solo loggear errores de escaneo, no son críticos
          console.debug('[QR Scanner] Scanning:', errorMessage)
        }
      )
    } catch (error: any) {
      console.error('[QR Scanner] Error initializing scanner:', error)
      setScannerError(error?.message || 'Error al iniciar el escáner. Intenta nuevamente.')
      
      // Asegurar limpieza en caso de error
      await stopScanner()
      
      if (isMountedRef.current) {
      setIsScanning(false)
      }
    }
  }

  const handleQRScan = () => {
    if (isScanning) {
      stopScanner()
    } else {
      startScanner()
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
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="manualCode"
                className="block text-sm font-medium text-dark-300 mb-2"
              >
                ID o Código de Mesa
              </label>
              <input
                ref={inputRef}
                id="manualCode"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej. M001 o copia/pega la URL"
                className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <button
                type="submit"
                disabled={manualLoading}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {manualLoading ? 'Buscando...' : 'Acceder a Mesa'}
              </button>
              <button
                type="button"
                onClick={handleQRScan}
                className={`flex-1 px-6 font-semibold py-3 rounded-lg transition-colors ${
                  isScanning
                    ? 'bg-red-500/20 border border-red-500/40 text-red-200'
                    : 'bg-dark-200 hover:bg-dark-300 text-white'
                }`}
              >
                {isScanning ? 'Detener escaneo' : 'Escanear QR'}
              </button>
            </div>

            {scannerError && (
              <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 px-4 py-3 rounded-lg text-sm">
                {scannerError}
              </div>
            )}

            {cameraPermission === 'denied' && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-200 px-4 py-3 rounded-lg text-sm">
                Debes otorgar permisos de cámara desde la configuración del navegador para poder escanear códigos QR.
              </div>
            )}

            {isScanning && (
              <div className="space-y-3">
                <div className="text-sm text-dark-300">
                  Apunta la cámara al código QR de la mesa. El escaneo se detendrá automáticamente cuando lo detectemos.
                </div>
                <div
                  id="qr-reader"
                  ref={scannerContainerRef}
                  className="w-full bg-dark-50 rounded-xl overflow-hidden border border-dark-200 min-h-[260px]"
                ></div>
              </div>
            )}
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
      <Footer />
    </div>
  )
}

