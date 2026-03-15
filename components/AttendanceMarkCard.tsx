'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type MarkType = 'IN' | 'OUT'

type TodayResponse = {
  ok: boolean
  status: 'IN' | 'OUT'
  canMarkIn: boolean
  canMarkOut: boolean
  latest: {
    id: string
    type: MarkType
    markedAt: string
    accuracyMeters: number
    selfieUrl: string
  } | null
  todayMarks: Array<{
    id: string
    type: MarkType
    markedAt: string
    accuracyMeters: number
    selfieUrl: string
  }>
}

export function AttendanceMarkCard({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT')
  const [latest, setLatest] = useState<TodayResponse['latest']>(null)
  const [todayMarks, setTodayMarks] = useState<TodayResponse['todayMarks']>([])
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  const [locationError, setLocationError] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')
  const [message, setMessage] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const desiredType: MarkType = useMemo(() => (status === 'IN' ? 'OUT' : 'IN'), [status])

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraOn(false)
  }, [])

  const loadToday = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance/today', { cache: 'no-store' })
      const data = (await res.json()) as TodayResponse | { error?: string }
      if (!res.ok || !('ok' in data)) {
        throw new Error((data as any)?.error || 'No se pudo cargar estado de marcaje')
      }
      setStatus(data.status)
      setLatest(data.latest)
      setTodayMarks(data.todayMarks)
    } catch (error: any) {
      setMessage(error?.message || 'No se pudo cargar estado de marcaje')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadToday()
    return () => {
      cleanupStream()
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestLocation = useCallback(async () => {
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Este navegador no soporta geolocalización')
      return
    }
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          })
          resolve()
        },
        (err) => {
          setLocationError(err.message || 'No se pudo obtener ubicación')
          resolve()
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      )
    })
  }, [])

  const startCamera = useCallback(async () => {
    setMessage('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraOn(true)
    } catch (error: any) {
      setMessage(error?.message || 'No se pudo abrir la cámara')
    }
  }, [])

  const takePhoto = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (!video.videoWidth || !video.videoHeight) {
      setMessage('La cámara aún no está lista')
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) {
      setMessage('No se pudo capturar la selfie')
      return
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoBlob(blob)
    setPhotoPreviewUrl(URL.createObjectURL(blob))
    cleanupStream()
  }, [cleanupStream, photoPreviewUrl])

  const submitMark = useCallback(async () => {
    setMessage('')
    setLocationError('')

    if (!photoBlob) {
      setMessage('Debes tomar una selfie antes de marcar')
      return
    }
    if (!location) {
      setMessage('Debes obtener geolocalización antes de marcar')
      return
    }

    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('type', desiredType)
      form.append('latitude', String(location.latitude))
      form.append('longitude', String(location.longitude))
      form.append('accuracyMeters', String(location.accuracy))
      form.append('selfie', new File([photoBlob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' }))

      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        body: form,
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.error || 'No se pudo guardar el marcaje')
      }

      setMessage(desiredType === 'IN' ? 'Entrada registrada correctamente' : 'Salida registrada correctamente')
      setPhotoBlob(null)
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
      setPhotoPreviewUrl('')
      setLocation(null)
      await loadToday()
    } catch (error: any) {
      setMessage(error?.message || 'No se pudo guardar el marcaje')
    } finally {
      setSubmitting(false)
    }
  }, [desiredType, loadToday, location, photoBlob, photoPreviewUrl])

  const headerTitle = compact ? 'Marcaje de turno' : 'Marcaje de asistencia'

  return (
    <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{headerTitle}</h2>
          <p className="text-xs sm:text-sm text-dark-400">
            Requiere selfie y geolocalización para marcar {desiredType === 'IN' ? 'entrada' : 'salida'}.
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            status === 'IN' ? 'bg-green-600/20 text-green-300' : 'bg-orange-600/20 text-orange-300'
          }`}
        >
          Estado: {status === 'IN' ? 'Dentro' : 'Fuera'}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-white/70">Cargando estado...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-dark-50 border border-dark-200 rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium text-white">1) Selfie</p>

              {!cameraOn && !photoPreviewUrl && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                >
                  Activar cámara
                </button>
              )}

              {cameraOn && (
                <div className="space-y-2">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg border border-dark-200" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={takePhoto}
                      className="px-3 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                    >
                      Tomar selfie
                    </button>
                    <button
                      type="button"
                      onClick={cleanupStream}
                      className="px-3 py-2 text-sm rounded-lg bg-dark-200 hover:bg-dark-300 text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {photoPreviewUrl && (
                <div className="space-y-2">
                  <img src={photoPreviewUrl} alt="Selfie capturada" className="w-full rounded-lg border border-dark-200 object-cover" />
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-2 text-sm rounded-lg bg-dark-200 hover:bg-dark-300 text-white transition-colors"
                  >
                    Repetir selfie
                  </button>
                </div>
              )}
            </div>

            <div className="bg-dark-50 border border-dark-200 rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium text-white">2) Geolocalización</p>
              <button
                type="button"
                onClick={requestLocation}
                className="px-3 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                Obtener ubicación
              </button>
              {location && (
                <div className="text-xs text-white/80 space-y-1">
                  <p>Latitud: {location.latitude.toFixed(6)}</p>
                  <p>Longitud: {location.longitude.toFixed(6)}</p>
                  <p>Precisión: {Math.round(location.accuracy)} m</p>
                </div>
              )}
              {locationError && <p className="text-xs text-red-300">{locationError}</p>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={submitMark}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-60"
            >
              {submitting
                ? 'Guardando...'
                : desiredType === 'IN'
                  ? 'Marcar entrada'
                  : 'Marcar salida'}
            </button>
            {latest && (
              <p className="text-xs text-white/60">
                Último marcaje: {latest.type === 'IN' ? 'Entrada' : 'Salida'} -{' '}
                {new Date(latest.markedAt).toLocaleString('es-HN')}
              </p>
            )}
          </div>
        </>
      )}

      {message && <p className="mt-3 text-sm text-white/80">{message}</p>}

      {todayMarks.length > 0 && (
        <div className="mt-4 border-t border-dark-200 pt-3">
          <p className="text-xs font-semibold text-white/80 mb-2">Marcajes de hoy</p>
          <div className="space-y-2">
            {todayMarks.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-dark-50 border border-dark-200 rounded-lg px-3 py-2">
                <span className="text-xs text-white">
                  {item.type === 'IN' ? 'Entrada' : 'Salida'}
                </span>
                <span className="text-xs text-white/60">{new Date(item.markedAt).toLocaleTimeString('es-HN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
