'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { signOut } from 'next-auth/react'
import { markEntryUsed, validateEntryByToken } from '@/lib/actions'

type ActiveEvent = {
  id: string
  name: string
  date: string | Date
}

type ScannedEntry = {
  id: string
  clientName: string
  clientEmail: string
  numberOfEntries: number
  status: 'ACTIVE' | 'USED' | 'CANCELLED'
  event: {
    id: string
    name: string
    date: string | Date
  }
}

export function TaquillaScanClient({ events }: { events: ActiveEvent[] }) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? '')
  const [manualToken, setManualToken] = useState('')
  const [scannedEntry, setScannedEntry] = useState<ScannedEntry | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [scannerError, setScannerError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isPending, startTransition] = useTransition()

  const scannerRef = useRef<any>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)
  const camerasRef = useRef<{ id: string; label: string }[]>([])
  const currentCameraIndexRef = useRef(0)
  const switchingCameraRef = useRef(false)
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  )

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current
        if (typeof scanner.stop === 'function') await scanner.stop().catch(() => {})
        if (typeof scanner.clear === 'function') await scanner.clear().catch(() => {})
        if (scannerContainerRef.current) scannerContainerRef.current.innerHTML = ''
      } catch {
        // no-op
      }
      scannerRef.current = null
    }

    if (isMountedRef.current) {
      setIsScanning(false)
      setScannerError('')
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      stopScanner()
    }
  }, [stopScanner])

  const parseTokenFromUrl = (text: string): string => {
    const cleaned = text.trim()
    if (!cleaned) return ''
    try {
      const url = new URL(cleaned)
      const parts = url.pathname.split('/').filter(Boolean)
      const validarIdx = parts.findIndex((p) => p === 'validar')
      if (validarIdx !== -1 && parts[validarIdx + 1]) return parts[validarIdx + 1]
      return parts.pop() || cleaned
    } catch {
      return cleaned
    }
  }

  const lookupEntry = async (tokenInput: string) => {
    const token = parseTokenFromUrl(tokenInput)
    if (!token) {
      setError('Ingresa un token o URL válida.')
      return
    }

    if (!selectedEventId) {
      setError('Selecciona un evento antes de escanear.')
      return
    }

    setError('')
    setSuccessMsg('')
    setScannedEntry(null)

    startTransition(async () => {
      try {
        const entry = await validateEntryByToken(token)
        if (!entry) {
          setError('Entrada no encontrada. Verifica el código.')
          return
        }

        if (entry.event.id !== selectedEventId) {
          setError(`Esta entrada pertenece a "${entry.event.name}", no al evento seleccionado.`)
          return
        }

        setManualToken(token)
        setScannedEntry({
          id: entry.id,
          clientName: entry.clientName,
          clientEmail: entry.clientEmail,
          numberOfEntries: entry.numberOfEntries,
          status: entry.status,
          event: {
            id: entry.event.id,
            name: entry.event.name,
            date: entry.event.date,
          },
        })
      } catch (err: any) {
        setError(err.message || 'Error al validar entrada')
      }
    })
  }

  const handleMarkUsed = () => {
    if (!scannedEntry || scannedEntry.status !== 'ACTIVE') return
    startTransition(async () => {
      try {
        await markEntryUsed(scannedEntry.id)
        setScannedEntry({ ...scannedEntry, status: 'USED' })
        setSuccessMsg('Entrada marcada como USADA correctamente.')
      } catch (err: any) {
        setError(err.message || 'No se pudo marcar la entrada')
      }
    })
  }

  const startScanner = async () => {
    if (!selectedEventId) {
      setError('Selecciona un evento antes de abrir la cámara.')
      return
    }

    await stopScanner()
    await new Promise((r) => setTimeout(r, 100))
    setScannerError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError('Tu dispositivo no soporta el acceso a la cámara.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      setScannerError('No pudimos acceder a la cámara. Revisa permisos del navegador.')
      return
    }

    setIsScanning(true)
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200)))
    )

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      let attempts = 0
      while (!scannerContainerRef.current && attempts < 10) {
        await new Promise((r) => setTimeout(r, 50))
        attempts++
      }
      if (!scannerContainerRef.current) {
        setScannerError('Error con el contenedor del escáner.')
        setIsScanning(false)
        return
      }

      if (!scannerContainerRef.current.id) {
        scannerContainerRef.current.id = 'taquilla-qr-reader'
      }
      scannerContainerRef.current.innerHTML = ''

      const cameras = await Html5Qrcode.getCameras()
      if (!cameras.length) {
        setScannerError('No se encontró cámara disponible.')
        setIsScanning(false)
        return
      }

      camerasRef.current = cameras
      if (!switchingCameraRef.current) {
        const backLabels = ['back', 'rear', 'trasera', 'posterior', 'environment']
        const backIdx = cameras.findIndex((camera) =>
          backLabels.some((label) => camera.label.toLowerCase().includes(label))
        )
        currentCameraIndexRef.current = backIdx >= 0 ? backIdx : cameras.length >= 2 ? 1 : 0
      }
      switchingCameraRef.current = false
      setCanSwitchCamera(cameras.length > 1)

      const html5QrCode = new Html5Qrcode(scannerContainerRef.current.id, { verbose: false })
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        cameras[currentCameraIndexRef.current].id,
        {
          fps: 10,
          qrbox: window.innerWidth < 640 ? { width: 220, height: 220 } : { width: 300, height: 300 },
          aspectRatio: 1.0,
        },
        async (decodedText: string) => {
          if (!isMountedRef.current) return
          await stopScanner()
          await lookupEntry(decodedText)
        },
        () => {}
      )
    } catch (err: any) {
      setScannerError(err?.message || 'Error al iniciar escáner.')
      await stopScanner()
      if (isMountedRef.current) setIsScanning(false)
    }
  }

  const handleSwitchCamera = async () => {
    if (camerasRef.current.length <= 1) return
    switchingCameraRef.current = true
    currentCameraIndexRef.current = (currentCameraIndexRef.current + 1) % camerasRef.current.length
    await stopScanner()
    await new Promise((r) => setTimeout(r, 300))
    await startScanner()
  }

  const statusPill =
    scannedEntry?.status === 'ACTIVE'
      ? 'bg-green-500/20 border-green-500/40 text-green-300'
      : scannedEntry?.status === 'USED'
      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
      : 'bg-red-500/20 border-red-500/40 text-red-300'

  return (
    <div className="min-h-screen bg-dark-300 pt-safe">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <header className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Taquilla</h1>
            <p className="text-sm text-dark-400 mt-1">Escaneo de entradas por evento</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-dark-200 hover:bg-dark-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Cerrar Sesion
          </button>
        </header>

        <section className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 space-y-4">
          <label className="block text-sm font-medium text-dark-300">Evento activo</label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value)
              setError('')
              setSuccessMsg('')
              setScannedEntry(null)
            }}
            className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {events.length === 0 && <option value="">No hay eventos activos</option>}
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {new Date(event.date).toLocaleDateString('es-HN')}
              </option>
            ))}
          </select>
          {selectedEvent && (
            <p className="text-xs text-dark-400">
              Validando entradas para: <span className="text-white/90">{selectedEvent.name}</span>
            </p>
          )}
        </section>

        <section className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => (isScanning ? stopScanner() : startScanner())}
              disabled={!selectedEventId || events.length === 0}
              className={`flex-1 font-semibold py-3 px-4 rounded-lg transition-colors ${
                isScanning ? 'bg-red-500/20 border border-red-500/40 text-red-200' : 'bg-primary-600 hover:bg-primary-700 text-white'
              } disabled:opacity-50`}
            >
              {isScanning ? 'Detener escaneo' : 'Escanear QR'}
            </button>
            {canSwitchCamera && isScanning && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="px-4 py-3 bg-dark-200 hover:bg-dark-50 text-white rounded-lg text-sm font-medium"
              >
                Cambiar camara
              </button>
            )}
          </div>

          {isScanning && (
            <div>
              <div id="taquilla-qr-reader" ref={scannerContainerRef} className="w-full bg-dark-50 rounded-xl overflow-hidden border border-dark-200 min-h-[260px]" />
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              lookupEntry(manualToken)
            }}
            className="flex gap-2 sm:gap-3"
          >
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Pega URL o token de entrada..."
              className="flex-1 min-w-0 px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={isPending || !selectedEventId}
              className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-3 rounded-lg disabled:opacity-50"
            >
              {isPending ? '...' : 'Validar'}
            </button>
          </form>

          {scannerError && <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 px-4 py-3 rounded-lg text-sm">{scannerError}</div>}
          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">{error}</div>}
          {successMsg && <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg text-sm">{successMsg}</div>}
        </section>

        {scannedEntry && (
          <section className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 space-y-4">
            <div className={`inline-flex items-center border px-3 py-1 rounded-full text-xs font-semibold ${statusPill}`}>
              {scannedEntry.status}
            </div>
            <h2 className="text-xl font-semibold text-white">{scannedEntry.event.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-dark-50 border border-dark-200 rounded-lg p-3">
                <p className="text-dark-400">Cliente</p>
                <p className="text-white font-medium">{scannedEntry.clientName}</p>
              </div>
              <div className="bg-dark-50 border border-dark-200 rounded-lg p-3">
                <p className="text-dark-400">Correo</p>
                <p className="text-white font-medium break-all">{scannedEntry.clientEmail}</p>
              </div>
              <div className="bg-dark-50 border border-dark-200 rounded-lg p-3">
                <p className="text-dark-400">Cantidad</p>
                <p className="text-white font-medium">{scannedEntry.numberOfEntries}</p>
              </div>
              <div className="bg-dark-50 border border-dark-200 rounded-lg p-3">
                <p className="text-dark-400">Fecha evento</p>
                <p className="text-white font-medium">{new Date(scannedEntry.event.date).toLocaleDateString('es-HN')}</p>
              </div>
            </div>

            {scannedEntry.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={handleMarkUsed}
                disabled={isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                Marcar como usada
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

