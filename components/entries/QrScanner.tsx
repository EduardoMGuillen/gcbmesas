'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createScanGate } from '@/lib/entry-scan'

/** Tras procesar un QR, se ignora el mismo texto este tiempo (sigue frente a la cámara). */
const SAME_CODE_COOLDOWN_MS = 4000
const BACK_LABELS = ['back', 'rear', 'trasera', 'posterior', 'environment']

type Html5QrcodeLike = { stop: () => Promise<void>; clear: () => void }

/**
 * Cámara continua para leer QR de entradas.
 * - Solo una lectura se procesa a la vez (candado síncrono); el resto se descarta.
 * - Mientras `paused` es true (p. ej. mostrando un resultado) se ignoran lecturas.
 */
export function QrScanner({
  onDecode,
  paused = false,
  className = '',
}: {
  onDecode: (text: string) => Promise<void> | void
  paused?: boolean
  className?: string
}) {
  const containerId = useRef(`qr-${Math.random().toString(36).slice(2)}`).current
  const scannerRef = useRef<Html5QrcodeLike | null>(null)
  const gateRef = useRef(createScanGate())
  const pausedRef = useRef(paused)
  const onDecodeRef = useRef(onDecode)
  const lastCodeRef = useRef<{ text: string; at: number } | null>(null)
  const camerasRef = useRef<{ id: string; label: string }[]>([])
  const cameraIdxRef = useRef(-1)
  /** Cada arranque recibe un número; si cambia a mitad de camino, ese arranque se aborta. */
  const startSeqRef = useRef(0)
  const [state, setState] = useState<'idle' | 'starting' | 'on' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [canSwitch, setCanSwitch] = useState(false)

  onDecodeRef.current = onDecode
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  const stop = useCallback(async () => {
    const sc = scannerRef.current
    scannerRef.current = null
    if (!sc) return
    try {
      await sc.stop()
    } catch {
      // ya detenido
    }
    try {
      sc.clear()
    } catch {
      // no-op
    }
  }, [])

  const handleDecoded = useCallback(async (text: string) => {
    if (pausedRef.current) return
    const last = lastCodeRef.current
    if (last && last.text === text && Date.now() - last.at < SAME_CODE_COOLDOWN_MS) return
    if (!gateRef.current.tryAcquire()) return
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30)
      await onDecodeRef.current(text)
    } finally {
      lastCodeRef.current = { text, at: Date.now() }
      gateRef.current.release()
    }
  }, [])

  const start = useCallback(async () => {
    const seq = ++startSeqRef.current
    const stale = () => seq !== startSeqRef.current
    await stop()
    if (stale()) return
    setState('starting')
    setErrorMsg('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este dispositivo no permite usar la cámara.')
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!camerasRef.current.length) {
        camerasRef.current = await Html5Qrcode.getCameras()
      }
      if (stale()) return
      const cams = camerasRef.current
      if (!cams.length) throw new Error('No se encontró cámara.')
      if (cameraIdxRef.current < 0) {
        const back = cams.findIndex((c) => BACK_LABELS.some((l) => c.label.toLowerCase().includes(l)))
        cameraIdxRef.current = back >= 0 ? back : cams.length >= 2 ? 1 : 0
      }
      setCanSwitch(cams.length > 1)

      const el = document.getElementById(containerId)
      if (!el) return
      el.innerHTML = ''
      const sc = new Html5Qrcode(containerId, { verbose: false })
      scannerRef.current = sc
      await sc.start(
        cams[cameraIdxRef.current].id,
        {
          fps: 10,
          qrbox: (w: number, h: number) => {
            const size = Math.floor(Math.min(w, h) * 0.7)
            return { width: size, height: size }
          },
          aspectRatio: 1.0,
        },
        (text: string) => void handleDecoded(text),
        () => {}
      )
      if (stale()) {
        try {
          await sc.stop()
          sc.clear()
        } catch {
          // no-op
        }
        return
      }
      setState('on')
    } catch (err) {
      if (stale()) return
      await stop()
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(
        /permission|denied|notallowed/i.test(msg)
          ? 'Permite el acceso a la cámara en el navegador y vuelve a intentar.'
          : msg || 'No se pudo iniciar la cámara.'
      )
      setState('error')
    }
  }, [containerId, handleDecoded, stop])

  useEffect(() => {
    void start()
    return () => {
      startSeqRef.current++
      void stop()
    }
  }, [start, stop])

  const switchCamera = async () => {
    const n = camerasRef.current.length
    if (n <= 1) return
    cameraIdxRef.current = (cameraIdxRef.current + 1) % n
    await start()
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-black aspect-square ${className}`}>
      <div id={containerId} className="absolute inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />

      {state === 'on' && (
        <>
          <div className="pointer-events-none absolute inset-[15%] rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          <div className="pointer-events-none absolute inset-x-[15%] top-1/2 h-0.5 bg-primary-400/80 animate-pulse" />
        </>
      )}

      {state !== 'on' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          {state === 'starting' || state === 'idle' ? (
            <p className="text-sm text-white/70">Abriendo cámara…</p>
          ) : (
            <>
              <p className="text-sm text-white/80">{errorMsg}</p>
              <button
                type="button"
                onClick={() => void start()}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black"
              >
                Activar cámara
              </button>
            </>
          )}
        </div>
      )}

      {paused && state === 'on' && <div className="absolute inset-0 bg-black/40" />}

      {canSwitch && state === 'on' && (
        <button
          type="button"
          onClick={() => void switchCamera()}
          aria-label="Cambiar cámara"
          className="absolute right-3 top-3 rounded-full bg-black/60 p-2.5 text-white backdrop-blur"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  )
}
