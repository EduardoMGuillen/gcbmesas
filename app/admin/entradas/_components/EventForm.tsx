'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEvent, updateEvent } from '@/lib/actions'
import type { EventItem } from './types'

/**
 * Crear / editar evento. Validaciones y llamadas iguales a las del antiguo EventosTab;
 * solo cambia cómo se abre (panel) y se cierra (onDone).
 */
export function EventForm({ event, onDone }: { event: EventItem | null; onDone: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const editingId = event?.id ?? null
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [coverPrice, setCoverPrice] = useState('')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [onlinePrice, setOnlinePrice] = useState('')
  const [maxEntriesLimit, setMaxEntriesLimit] = useState('')
  const [publishOnLcb, setPublishOnLcb] = useState(true)
  const [publishOnCbtickets, setPublishOnCbtickets] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const resetForm = () => {
    setName('')
    setDate('')
    setCoverPrice('')
    setDescription('')
    setCoverImage('')
    setOnlinePrice('')
    setMaxEntriesLimit('')
    setPublishOnLcb(true)
    setPublishOnCbtickets(false)
    setIsFeatured(false)
    setVenueName('')
    setVenueAddress('')
    setError('')
    onDone()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imagenes'); return }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5MB'); return }

    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir imagen')
      setCoverImage(data.url)
    } catch (err: any) {
      setError(err.message || 'Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  const loadEvent = (ev: EventItem) => {
    setName(ev.name)
    setDate(new Date(ev.date).toISOString().split('T')[0])
    setCoverPrice(ev.coverPrice.toString())
    setDescription(ev.description || '')
    setCoverImage(ev.coverImage || '')
    setOnlinePrice(ev.paypalPrice ? ev.paypalPrice.toString() : '')
    setMaxEntriesLimit(ev.maxEntries != null && ev.maxEntries >= 1 ? String(ev.maxEntries) : '')
    setPublishOnLcb(ev.publishOnLcb !== false)
    setPublishOnCbtickets(ev.publishOnCbtickets === true)
    setIsFeatured(ev.isFeatured === true)
    setVenueName(ev.venueName?.trim() || '')
    setVenueAddress(ev.venueAddress?.trim() || '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Ingresa el nombre del evento'); return }
    if (!date) { setError('Selecciona una fecha'); return }
    const coverTrim = coverPrice.trim()
    const coverN = parseFloat(coverTrim)
    if (coverTrim === '' || !Number.isFinite(coverN) || coverN < 0) {
      setError('Ingresa un precio de cover válido (0 o más)')
      return
    }

    const onlineTrim = onlinePrice.trim()
    let paypalResolved: number | null
    if (onlineTrim === '') {
      paypalResolved = null
    } else {
      const on = parseFloat(onlineTrim)
      if (!Number.isFinite(on) || on < 0) {
        setError('Precio online inválido')
        return
      }
      paypalResolved = on === 0 ? null : on
    }

    const limitTrim = maxEntriesLimit.trim()
    let maxEntries: number | null | undefined
    if (limitTrim === '') {
      maxEntries = editingId ? null : undefined
    } else {
      const n = parseInt(limitTrim, 10)
      if (!Number.isFinite(n) || n < 1) {
        setError('Límite de entradas debe ser un número entero mayor o igual a 1')
        return
      }
      maxEntries = n
    }

    startTransition(async () => {
      try {
        const eventData = {
          name: name.trim(),
          date,
          coverPrice: coverN,
          description: description.trim() || undefined,
          coverImage: coverImage.trim() || undefined,
          paypalPrice: paypalResolved,
          publishOnLcb,
          publishOnCbtickets,
          isFeatured,
          venueName: venueName.trim() || null,
          venueAddress: venueAddress.trim() || null,
          ...(maxEntries !== undefined ? { maxEntries } : {}),
        }
        if (editingId) {
          await updateEvent(editingId, eventData)
        } else {
          await createEvent(eventData)
        }
        resetForm()
        router.refresh()
      } catch (err: any) { setError(err.message || 'Error al guardar evento') }
    })
  }


  useEffect(() => {
    if (event) loadEvent(event)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id])

  return (
    <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{editingId ? 'Editar Evento' : 'Nuevo Evento'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Nombre</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Noche de Reggaeton" className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Fecha</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Precio Cover (L)</label>
                <input type="number" step="0.01" min="0" value={coverPrice} onChange={(e) => setCoverPrice(e.target.value)} placeholder="200.00" className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverPrice('0')
                    setOnlinePrice('')
                    setError('')
                  }}
                  className="mt-2 text-xs font-medium text-cyan-400/90 hover:text-cyan-300 underline underline-offset-2"
                >
                  Cover gratuito (sin venta web)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Descripcion <span className="text-white/30 font-normal">(opcional - lugar, hora, detalles)</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Ej: Doors open 9PM. Dress code: casual elegante." className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Lugar <span className="text-white/30 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Ej: Casa Blanca"
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Dirección <span className="text-white/30 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Ej: San Pedro Sula"
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 p-4 rounded-xl bg-dark-50/50 border border-dark-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={publishOnLcb} onChange={(e) => setPublishOnLcb(e.target.checked)} className="w-4 h-4 rounded border-dark-200" />
                <span className="text-sm text-white">Publicar en La Gran Casa Blanca (/eventos)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={publishOnCbtickets} onChange={(e) => setPublishOnCbtickets(e.target.checked)} className="w-4 h-4 rounded border-dark-200" />
                <span className="text-sm text-white">Publicar en GCBTickets (gcbtickets.com)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="w-4 h-4 rounded border-dark-200" />
                <span className="text-sm text-white">Destacar en portada</span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Imagen / Flyer <span className="text-white/30 font-normal">(opcional)</span></label>
                {coverImage ? (
                  <div className="flex items-center gap-3">
                    <img src={coverImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-dark-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-dark-300 truncate mb-2">{coverImage.length > 40 ? '...' + coverImage.slice(-35) : coverImage}</p>
                      <button type="button" onClick={() => setCoverImage('')} className="text-xs text-red-400 hover:text-red-300">Quitar imagen</button>
                    </div>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploading ? 'border-primary-500/50 bg-primary-600/5' : 'border-dark-200 hover:border-primary-500/50 hover:bg-dark-50'}`}>
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-primary-400">Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-sm text-dark-300">Subir flyer</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Precio Online (LPS) <span className="text-white/30 font-normal">(opcional - para venta en linea)</span></label>
                <input type="number" step="0.01" min="0" value={onlinePrice} onChange={(e) => setOnlinePrice(e.target.value)} placeholder="200.00" className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Límite de entradas <span className="text-white/30 font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxEntriesLimit}
                  onChange={(e) => setMaxEntriesLimit(e.target.value)}
                  placeholder="Sin límite"
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-dark-300 mt-1">Vacío = sin límite. Suma cover + online (excluye canceladas).</p>
              </div>
            </div>
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
            <div className="flex gap-3">
              <button type="submit" disabled={isPending || uploading} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors">{isPending ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Evento'}</button>
              <button type="button" onClick={resetForm} className="bg-dark-50 hover:bg-dark-200 text-white/80 font-medium py-2.5 px-6 rounded-lg transition-colors">Cancelar</button>
            </div>
          </form>
    </div>
  )
}
