'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  getTaquillaEventEntries,
  markEntryUsed,
  validateEntryByToken,
  type TaquillaHistoryEntry,
} from '@/lib/actions'

type ActiveEvent = {
  id: string
  name: string
  date: string | Date
  venueName: string | null
  venueAddress: string | null
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
    description: string | null
    coverImage: string | null
    venueName: string | null
    venueAddress: string | null
  }
}

export function TaquillaScanClient({ events }: { events: ActiveEvent[] }) {
  const router = useRouter()
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? '')
  const [manualToken, setManualToken] = useState('')
  const [scannedEntry, setScannedEntry] = useState<ScannedEntry | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [scannerError, setScannerError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [histStatus, setHistStatus] = useState<'all' | 'ACTIVE' | 'USED' | 'CANCELLED'>('all')
  const [histSearch, setHistSearch] = useState('')
  const [histSearchDebounced, setHistSearchDebounced] = useState('')
  const [histRows, setHistRows] = useState<TaquillaHistoryEntry[]>([])
  const [histLoading, setHistLoading] = useState(false)
  const [histError, setHistError] = useState('')
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [histMsg, setHistMsg] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setHistSearchDebounced(histSearch), 400)
    return () => clearTimeout(t)
  }, [histSearch])

  useEffect(() => {
    if (!selectedEventId) {
      setHistRows([])
      return
    }
    let cancelled = false
    setHistLoading(true)
    setHistError('')
    getTaquillaEventEntries({
      eventId: selectedEventId,
      status: histStatus,
      search: histSearchDebounced.trim() || undefined,
    })
      .then((rows) => {
        if (!cancelled) setHistRows(rows)
      })
      .catch((e) => {
        if (!cancelled) {
          setHistError(e?.message || 'No se pudo cargar el historial')
          setHistRows([])
        }
      })
      .finally(() => {
        if (!cancelled) setHistLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedEventId, histStatus, histSearchDebounced])

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
            description: entry.event.description ?? null,
            coverImage: entry.event.coverImage ?? null,
            venueName: entry.event.venueName ?? null,
            venueAddress: entry.event.venueAddress ?? null,
          },
        })
      } catch (err: any) {
        setError(err.message || 'Error al validar entrada')
      }
    })
  }

  const refreshHistorial = useCallback(async () => {
    if (!selectedEventId) return
    try {
      const rows = await getTaquillaEventEntries({
        eventId: selectedEventId,
        status: histStatus,
        search: histSearchDebounced.trim() || undefined,
      })
      setHistRows(rows)
    } catch {
      // ignore
    }
  }, [selectedEventId, histStatus, histSearchDebounced])

  const handleMarkUsed = () => {
    if (!scannedEntry || scannedEntry.status !== 'ACTIVE') return
    startTransition(async () => {
      try {
        await markEntryUsed(scannedEntry.id)
        setScannedEntry({ ...scannedEntry, status: 'USED' })
        setSuccessMsg('Entrada marcada como USADA correctamente.')
        router.refresh()
        await refreshHistorial()
      } catch (err: any) {
        setError(err.message || 'No se pudo marcar la entrada')
      }
    })
  }

  const handleResendTaquillaEmail = async (entry: TaquillaHistoryEntry) => {
    if (entry.status === 'CANCELLED' || !selectedEvent) return
    setResendingId(entry.id)
    setHistError('')
    setHistMsg('')
    try {
      const res = await fetch('/api/send-entry-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [{ entryId: entry.id, qrToken: entry.qrToken, clientName: entry.clientName }],
          clientEmail: entry.clientEmail,
          eventName: selectedEvent.name,
          eventDate: String(selectedEvent.date),
          totalPrice: entry.totalPrice,
          venueName: selectedEvent.venueName ?? undefined,
          venueAddress: selectedEvent.venueAddress ?? undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || 'Error al enviar correo')
      setHistMsg(`QR reenviado a ${entry.clientEmail}`)
      router.refresh()
      await refreshHistorial()
    } catch (err: unknown) {
      setHistError(err instanceof Error ? err.message : 'Error al reenviar')
    } finally {
      setResendingId(null)
    }
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
    <div className="min-h-screen pt-safe">
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
              setHistMsg('')
              setHistError('')
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
            <p className="text-sm text-dark-300">
              {new Date(scannedEntry.event.date).toLocaleDateString('es-HN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            </p>
            {[scannedEntry.event.venueName, scannedEntry.event.venueAddress].filter(Boolean).length > 0 ? (
              <p className="text-sm text-dark-400">
                {[scannedEntry.event.venueName, scannedEntry.event.venueAddress].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {scannedEntry.event.coverImage ? (
              <div className="rounded-xl overflow-hidden border border-dark-200 max-h-48">
                <img
                  src={scannedEntry.event.coverImage}
                  alt=""
                  className="w-full h-full max-h-48 object-cover object-top"
                />
              </div>
            ) : null}
            {scannedEntry.event.description ? (
              <p className="text-sm text-dark-300 leading-relaxed whitespace-pre-wrap border-t border-dark-200 pt-3">
                {scannedEntry.event.description}
              </p>
            ) : null}
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

        <section className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Historial del evento</h2>
              <p className="text-xs text-dark-400 mt-1">
                Lista filtrable del evento seleccionado. Puedes reenviar el QR al correo del cliente. No hay revertir
                desde taquilla.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshHistorial()}
              disabled={histLoading || !selectedEventId}
              className="text-sm px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white hover:bg-dark-200 disabled:opacity-50 shrink-0"
            >
              Actualizar lista
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'ACTIVE', 'USED', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setHistStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  histStatus === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-50 border border-dark-200 text-white/70 hover:text-white'
                }`}
              >
                {s === 'all'
                  ? 'Todas'
                  : s === 'ACTIVE'
                    ? 'Activas'
                    : s === 'USED'
                      ? 'Usadas'
                      : 'Canceladas'}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={histSearch}
            onChange={(e) => setHistSearch(e.target.value)}
            placeholder="Filtrar por nombre o correo…"
            disabled={!selectedEventId}
            className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 disabled:opacity-50"
          />

          {histError && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm">
              {histError}
            </div>
          )}
          {histMsg && (
            <div className="bg-green-500/15 border border-green-500/40 text-green-300 px-4 py-3 rounded-lg text-sm">
              {histMsg}
            </div>
          )}

          {!selectedEventId || events.length === 0 ? (
            <p className="text-dark-400 text-sm py-4 text-center">Selecciona un evento para ver el historial.</p>
          ) : histLoading ? (
            <p className="text-dark-400 text-sm py-8 text-center">Cargando historial…</p>
          ) : histRows.length === 0 ? (
            <p className="text-dark-400 text-sm py-8 text-center">No hay entradas con estos filtros.</p>
          ) : (
            <ul className="space-y-2 max-h-[min(420px,50vh)] overflow-y-auto pr-1">
              {histRows.map((row) => (
                <li
                  key={row.id}
                  className="bg-dark-50 border border-dark-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white truncate">{row.clientName}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          row.status === 'ACTIVE'
                            ? 'bg-green-500/20 text-green-300'
                            : row.status === 'USED'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <p className="text-xs text-dark-400 break-all">{row.clientEmail}</p>
                    <p className="text-xs text-dark-500 mt-1">
                      {row.numberOfEntries} entrada{row.numberOfEntries !== 1 ? 's' : ''} · L{' '}
                      {row.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })} ·{' '}
                      {new Date(row.createdAt).toLocaleString('es-HN')}
                      {row.emailSent ? ' · Email enviado' : ''}
                    </p>
                  </div>
                  {row.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => void handleResendTaquillaEmail(row)}
                      disabled={resendingId === row.id}
                      className="shrink-0 text-xs sm:text-sm px-4 py-2 bg-blue-600/25 text-blue-300 hover:bg-blue-600/35 rounded-lg disabled:opacity-50 border border-blue-500/30"
                    >
                      {resendingId === row.id ? 'Enviando…' : 'Reenviar al correo'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

