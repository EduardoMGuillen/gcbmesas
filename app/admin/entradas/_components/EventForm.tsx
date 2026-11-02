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

  const isFree = coverPrice.trim() !== '' && parseFloat(coverPrice) === 0 && onlinePrice.trim() === ''

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-staff-muted">
          {editingId ? 'Editar evento' : 'Nuevo evento'}
        </p>
        <h2 className="truncate text-2xl font-bold text-staff-fg">{name.trim() || 'Sin nombre'}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card title="Información">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
              <Field label="Nombre">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Noche de Reggaeton"
                  className={inputCls}
                />
              </Field>
              <Field label="Fecha">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Descripción" hint="opcional: hora, dress code, detalles">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ej: Puertas 9 PM. Dress code: casual elegante."
                className={`${inputCls} resize-none`}
              />
            </Field>
          </Card>

          <Card title="Lugar">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre del lugar" hint="opcional">
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Ej: Casa Blanca"
                  className={inputCls}
                />
              </Field>
              <Field label="Dirección" hint="opcional">
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Ej: San Pedro Sula"
                  className={inputCls}
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Precios y cupo"
            aside={
              <button
                type="button"
                onClick={() => {
                  setCoverPrice('0')
                  setOnlinePrice('')
                  setError('')
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  isFree
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                    : 'border-staff-border text-staff-muted hover:text-staff-fg'
                }`}
              >
                {isFree ? '✓ Cover gratuito' : 'Cover gratuito'}
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Cover en puerta">
                <MoneyInput value={coverPrice} onChange={setCoverPrice} placeholder="200.00" />
              </Field>
              <Field label="Precio online" hint="vacío = sin venta web">
                <MoneyInput value={onlinePrice} onChange={setOnlinePrice} placeholder="200.00" />
              </Field>
              <Field label="Cupo" hint="vacío = sin límite">
                <input
                  type="number"
                  min={1}
                  value={maxEntriesLimit}
                  onChange={(e) => setMaxEntriesLimit(e.target.value)}
                  placeholder="Sin límite"
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="text-xs text-staff-muted">El cupo suma ventas en puerta y online (sin canceladas).</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Afiche">
            {coverImage ? (
              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="Afiche" className="aspect-[3/4] w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <label className="flex-1 cursor-pointer rounded-lg bg-white/90 py-1.5 text-center text-xs font-semibold text-black hover:bg-white">
                    Cambiar
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="flex-1 rounded-lg bg-black/60 py-1.5 text-xs font-semibold text-white hover:bg-black/80"
                  >
                    Quitar
                  </button>
                </div>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
                    Subiendo…
                  </div>
                )}
              </div>
            ) : (
              <label
                className={`flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors ${
                  uploading
                    ? 'border-primary-500/60 bg-primary-500/5'
                    : 'border-staff-border hover:border-primary-500/60 hover:bg-staff-hover'
                }`}
              >
                {uploading ? (
                  <>
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    <span className="text-sm font-medium text-primary-500">Subiendo…</span>
                  </>
                ) : (
                  <>
                    <svg className="h-8 w-8 text-staff-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-staff-fg">Subir afiche</span>
                    <span className="text-xs text-staff-muted">Vertical, hasta 5 MB</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            )}
          </Card>

          <Card title="Publicación">
            <Toggle
              label="La Gran Casa Blanca"
              hint="/eventos"
              checked={publishOnLcb}
              onChange={setPublishOnLcb}
            />
            <Toggle label="GCBTickets" hint="gcbtickets.com" checked={publishOnCbtickets} onChange={setPublishOnCbtickets} />
            <Toggle label="Destacar en portada" hint="★" checked={isFeatured} onChange={setIsFeatured} />
          </Card>
        </div>
      </div>

      {/* Barra de guardado */}
      <div className="sticky bottom-3 z-30 mt-4 rounded-2xl border border-staff-border bg-staff-surface/95 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          {error ? (
            <p className="min-w-0 flex-1 truncate text-sm text-red-500">{error}</p>
          ) : (
            <p className="min-w-0 flex-1 truncate text-sm text-staff-muted">
              {editingId ? 'Los cambios se publican al guardar.' : 'Completa nombre, fecha y cover.'}
            </p>
          )}
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-staff-muted hover:bg-staff-hover hover:text-staff-fg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || uploading}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </div>
      </div>
    </form>
  )
}

const inputCls =
  'w-full rounded-xl border border-staff-border bg-staff-raised px-4 py-2.5 text-sm text-staff-fg placeholder:text-staff-muted focus:outline-none focus:ring-2 focus:ring-primary-500'

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-staff-border bg-staff-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-staff-fg">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-staff-muted">
        {label} {hint && <span className="font-normal opacity-70">· {hint}</span>}
      </span>
      {children}
    </label>
  )
}

function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-staff-muted">L</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} pl-8 tabular-nums`}
      />
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-staff-fg">{label}</span>
        {hint && <span className="block text-xs text-staff-muted">{hint}</span>}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-staff-border'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
