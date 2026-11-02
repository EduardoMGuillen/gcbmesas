'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEntry, createBulkEntries, markEntryWhatsappSent } from '@/lib/actions'
import { generateQRDataUrl, buildPrintHtml, printHtml, buildWhatsAppUrl } from './entry-delivery'
import type { EventItem } from './types'

/** Venta de entradas (admin / ticketera). La lógica de venta y entrega es la misma de antes; solo cambió la UI. */
export function SellEntry({ events, initialEventId = '' }: { events: EventItem[]; initialEventId?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [eventId, setEventId] = useState(initialEventId)
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [numberOfEntries, setNumberOfEntries] = useState(1)
  const [guestNames, setGuestNames] = useState<string[]>([''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    entries: { entryId: string; qrToken: string; clientName: string }[]
    clientEmail: string
    clientPhone: string
    totalPrice: number
    eventName: string
    eventDate: string
    venueName?: string | null
    venueAddress?: string | null
  } | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [whatsappSent, setWhatsappSent] = useState(false)
  const [printing, setPrinting] = useState(false)

  const resultRef = useRef<HTMLElement>(null)
  // En móvil el resultado queda debajo del formulario: llevar la vista hasta él.
  useEffect(() => {
    if (success && window.innerWidth < 1024) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [success])

  const selectedEvent = events.find((e) => e.id === eventId)
  const totalPrice = selectedEvent ? selectedEvent.coverPrice * numberOfEntries : 0
  const remainingAtDoor =
    selectedEvent && selectedEvent.maxEntries != null && selectedEvent.maxEntries >= 1
      ? Math.max(0, selectedEvent.maxEntries - selectedEvent.entriesSoldSum)
      : null
  const doorSoldOut = remainingAtDoor !== null && remainingAtDoor < 1

  // Keep guestNames array in sync with numberOfEntries
  const updateNumberOfEntries = (n: number) => {
    let newN = Math.max(1, n)
    if (remainingAtDoor != null && remainingAtDoor >= 1) {
      newN = Math.min(newN, remainingAtDoor)
    }
    setNumberOfEntries(newN)
    setGuestNames((prev) => {
      if (newN > prev.length) {
        return [...prev, ...Array(newN - prev.length).fill('')]
      }
      return prev.slice(0, newN)
    })
  }

  const updateGuestName = (index: number, name: string) => {
    setGuestNames((prev) => {
      const next = [...prev]
      next[index] = name
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(null)

    if (!eventId) { setError('Selecciona un evento'); return }
    if (!clientEmail.trim()) { setError('Ingresa el email del cliente'); return }
    if (doorSoldOut) { setError('Cupo agotado para este evento.'); return }
    if (numberOfEntries < 1) { setError('Mínimo 1 entrada'); return }

    // Validate all guest names
    for (let i = 0; i < numberOfEntries; i++) {
      if (!guestNames[i]?.trim()) {
        setError(`Ingresa el nombre para la entrada ${i + 1}`)
        return
      }
    }

    startTransition(async () => {
      try {
        if (numberOfEntries === 1) {
          // Single entry - use original action
          const entry = await createEntry({
            eventId,
            clientName: guestNames[0].trim(),
            clientEmail: clientEmail.trim(),
            clientPhone: clientPhone.trim() || undefined,
            numberOfEntries: 1,
          })
          setSuccess({
            entries: [{
              entryId: entry.id,
              qrToken: entry.qrToken,
              clientName: entry.clientName,
            }],
            clientEmail: entry.clientEmail,
            clientPhone: clientPhone.trim(),
            totalPrice: Number(entry.totalPrice),
            eventName: entry.event.name,
            eventDate: String(entry.event.date),
            venueName: entry.event.venueName ?? null,
            venueAddress: entry.event.venueAddress ?? null,
          })
        } else {
          // Multiple entries - create individual entries
          const entries = await createBulkEntries({
            eventId,
            clientEmail: clientEmail.trim(),
            clientPhone: clientPhone.trim() || undefined,
            guestNames: guestNames.slice(0, numberOfEntries).map((n) => n.trim()),
          })
          const first = entries[0]
          setSuccess({
            entries: entries.map((e: any) => ({
              entryId: e.id,
              qrToken: e.qrToken,
              clientName: e.clientName,
            })),
            clientEmail: first.clientEmail,
            clientPhone: clientPhone.trim(),
            totalPrice: entries.reduce((sum: number, e: any) => sum + Number(e.totalPrice), 0),
            eventName: first.event.name,
            eventDate: String(first.event.date),
            venueName: first.event.venueName ?? null,
            venueAddress: first.event.venueAddress ?? null,
          })
        }
        setClientEmail('')
        setClientPhone('')
        setNumberOfEntries(1)
        setGuestNames([''])
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Error al crear la entrada')
      }
    })
  }

  const handleEmail = async () => {
    if (!success) return
    setSendingEmail(true)
    setError('')
    try {
      await fetch('/api/send-entry-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: success.entries,
          clientEmail: success.clientEmail,
          eventName: success.eventName,
          eventDate: success.eventDate,
          totalPrice: success.totalPrice,
          venueName: success.venueName ?? undefined,
          venueAddress: success.venueAddress ?? undefined,
        }),
      }).then(async (res) => {
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Error al enviar email')
      })
      setEmailSent(true)
    } catch (err: any) {
      setError(err.message || 'Error al enviar email')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleWhatsApp = async () => {
    if (!success || !success.clientPhone) return
    const url = buildWhatsAppUrl({
      phone: success.clientPhone,
      entries: success.entries,
      eventName: success.eventName,
      eventDate: success.eventDate,
      totalPrice: success.totalPrice,
    })
    window.open(url, '_blank')
    // Mark as sent
    try {
      for (const entry of success.entries) {
        await markEntryWhatsappSent(entry.entryId)
      }
      setWhatsappSent(true)
      router.refresh()
    } catch {}
  }

  const handlePrint = async () => {
    if (!success) return
    setPrinting(true)
    try {
      const appUrl = window.location.origin
      const logoUrl = `${appUrl}/LogoCasaBlanca.png`
      // Generate all print pages in one window
      const qrDataUrls = await Promise.all(
        success.entries.map((entry) =>
          generateQRDataUrl(`${appUrl}/entradas/validar/${entry.qrToken}`)
        )
      )
      const pages = success.entries.map((entry, i) =>
        buildPrintHtml({
          entryId: entry.entryId,
          qrToken: entry.qrToken,
          clientName: entry.clientName,
          clientEmail: success.clientEmail,
          numberOfEntries: 1,
          totalPrice: selectedEvent?.coverPrice || success.totalPrice / success.entries.length,
          eventName: success.eventName,
          eventDate: success.eventDate,
          qrDataUrl: qrDataUrls[i],
          logoUrl,
        })
      )
      // Combine all receipts with page breaks and print via iframe
      const combined = pages.map((html, i) => {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/)
        return bodyMatch ? `<div ${i > 0 ? 'style="page-break-before:always"' : ''}>${bodyMatch[1]}</div>` : ''
      }).join('')
      const styleMatch = pages[0].match(/<style>([\s\S]*?)<\/style>/)
      const styles = styleMatch ? styleMatch[1] : ''
      printHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${styles} @media print { div[style*="page-break"] { page-break-before: always; } }</style></head><body>${combined}</body></html>`)
    } finally {
      setPrinting(false)
    }
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-staff-border p-10 text-center">
        <p className="text-lg font-semibold text-staff-fg">No hay eventos activos</p>
        <p className="mt-1 text-sm text-staff-muted">Crea o activa un evento para empezar a vender.</p>
      </div>
    )
  }

  const resetSale = () => {
    setSuccess(null)
    setEmailSent(false)
    setWhatsappSent(false)
    setError('')
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      {/* ── Formulario ── */}
      <form id="sell-entry-form" onSubmit={handleSubmit} className="space-y-4">
        <Section step={1} title="Evento">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {events.map((ev) => {
              const left =
                ev.maxEntries != null && ev.maxEntries >= 1 ? Math.max(0, ev.maxEntries - ev.entriesSoldSum) : null
              const selected = ev.id === eventId
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setEventId(ev.id)
                    if (success) resetSale()
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                    selected
                      ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500'
                      : 'border-staff-border hover:border-primary-500/50 hover:bg-staff-hover'
                  }`}
                >
                  <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-staff-raised">
                    {ev.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg font-black text-staff-muted">
                        {ev.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-staff-fg">{ev.name}</p>
                    <p className="text-xs text-staff-muted">
                      {new Date(ev.date).toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
                    </p>
                    <p className="mt-0.5 text-xs">
                      <span className="font-semibold text-primary-500">L {ev.coverPrice.toFixed(2)}</span>
                      {left != null && (
                        <span className={left < 1 ? 'text-red-500' : 'text-staff-muted'}>
                          {' · '}
                          {left < 1 ? 'Agotado' : `quedan ${left}`}
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
          {doorSoldOut && <p className="mt-2 text-sm text-amber-500">Cupo agotado: no quedan entradas para este evento.</p>}
        </Section>

        <Section step={2} title="Cliente">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Correo">
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className={inputCls}
                autoComplete="off"
              />
            </Field>
            <Field label="WhatsApp" hint="opcional">
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="9999-9999"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        <Section
          step={3}
          title="Entradas"
          aside={
            <div className="flex items-center gap-1 rounded-xl border border-staff-border p-1">
              <button
                type="button"
                onClick={() => updateNumberOfEntries(numberOfEntries - 1)}
                disabled={numberOfEntries <= 1}
                className="h-9 w-9 rounded-lg text-lg font-bold text-staff-fg hover:bg-staff-hover disabled:opacity-30"
                aria-label="Menos"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={numberOfEntries}
                onChange={(e) => updateNumberOfEntries(parseInt(e.target.value) || 1)}
                className="w-12 bg-transparent text-center text-lg font-bold tabular-nums text-staff-fg focus:outline-none"
                aria-label="Cantidad"
              />
              <button
                type="button"
                onClick={() => updateNumberOfEntries(numberOfEntries + 1)}
                disabled={doorSoldOut || (remainingAtDoor != null && numberOfEntries >= remainingAtDoor)}
                className="h-9 w-9 rounded-lg text-lg font-bold text-staff-fg hover:bg-staff-hover disabled:opacity-30"
                aria-label="Más"
              >
                +
              </button>
            </div>
          }
        >
          <div className="space-y-2">
            {guestNames.slice(0, numberOfEntries).map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-bold text-primary-500">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updateGuestName(i, e.target.value)}
                  placeholder={numberOfEntries === 1 ? 'Nombre completo' : `Nombre de la persona ${i + 1}`}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        </Section>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>
        )}

        <button
          type="submit"
          disabled={isPending || doorSoldOut || !!success}
          className="w-full rounded-xl bg-primary-600 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
        >
          {isPending ? 'Procesando…' : `Cobrar L ${totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`}
        </button>
      </form>

      {/* ── Boleto / resultado ── */}
      <aside ref={resultRef} className={`scroll-mt-20 lg:sticky lg:top-24 lg:block lg:self-start ${success ? '' : 'hidden'}`}>
        {success ? (
          <div className="overflow-hidden rounded-2xl border border-emerald-500/40 bg-staff-surface">
            <div className="bg-emerald-600 px-5 py-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Venta registrada</p>
              <p className="truncate text-lg font-bold">{success.eventName}</p>
            </div>
            <div className="space-y-3 p-5">
              <ul className="space-y-1.5">
                {success.entries.map((entry, i) => (
                  <li key={entry.entryId} className="flex items-center gap-2 text-sm text-staff-fg">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-500">
                      {i + 1}
                    </span>
                    <span className="truncate">{entry.clientName}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between border-t border-dashed border-staff-border pt-3">
                <span className="truncate text-xs text-staff-muted">{success.clientEmail}</span>
                <span className="text-xl font-bold text-primary-500">
                  L {success.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <DeliveryTile
                  label={emailSent ? 'Enviado' : sendingEmail ? 'Enviando…' : 'Correo'}
                  done={emailSent}
                  disabled={sendingEmail || emailSent}
                  onClick={handleEmail}
                  icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
                <DeliveryTile
                  label={!success.clientPhone ? 'Sin número' : whatsappSent ? 'Enviado' : 'WhatsApp'}
                  done={whatsappSent}
                  disabled={!success.clientPhone}
                  onClick={handleWhatsApp}
                  icon="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
                <DeliveryTile
                  label={printing ? 'Generando…' : 'Imprimir'}
                  disabled={printing}
                  onClick={handlePrint}
                  icon="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </div>

              <button
                type="button"
                onClick={resetSale}
                className="w-full rounded-xl border border-staff-border py-2.5 text-sm font-semibold text-staff-fg hover:bg-staff-hover"
              >
                Vender otra
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-staff-border bg-staff-surface">
            <div className="relative h-28 bg-staff-raised">
              {selectedEvent?.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedEvent.coverImage} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <p className="absolute bottom-3 left-4 right-4 truncate text-lg font-bold text-white">
                {selectedEvent?.name ?? 'Elige un evento'}
              </p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-staff-muted">Entradas</span>
                <span className="font-semibold tabular-nums text-staff-fg">
                  {numberOfEntries} × L {(selectedEvent?.coverPrice ?? 0).toFixed(2)}
                </span>
              </div>
              {remainingAtDoor != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-staff-muted">Disponibles</span>
                  <span className="font-semibold tabular-nums text-staff-fg">{remainingAtDoor}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-dashed border-staff-border pt-3">
                <span className="text-sm text-staff-muted">Total</span>
                <span className="text-3xl font-black tabular-nums text-primary-500">
                  L {totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                type="submit"
                form="sell-entry-form"
                disabled={isPending || doorSoldOut || !selectedEvent || !!success}
                className="hidden w-full rounded-xl bg-primary-600 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 lg:block"
              >
                {isPending ? 'Procesando…' : 'Registrar venta'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-staff-border bg-staff-raised px-4 py-2.5 text-sm text-staff-fg placeholder:text-staff-muted focus:outline-none focus:ring-2 focus:ring-primary-500'

function Section({
  step,
  title,
  aside,
  children,
}: {
  step: number
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-staff-border bg-staff-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-staff-raised text-xs font-bold text-staff-muted">
            {step}
          </span>
          <h3 className="font-semibold text-staff-fg">{title}</h3>
        </div>
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
        {label} {hint && <span className="font-normal opacity-70">({hint})</span>}
      </span>
      {children}
    </label>
  )
}

function DeliveryTile({
  label,
  icon,
  done,
  disabled,
  onClick,
}: {
  label: string
  icon: string
  done?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
        done
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
          : 'border-staff-border text-staff-fg hover:bg-staff-hover disabled:opacity-50'
      }`}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={done ? 'M5 13l4 4L19 7' : icon} />
      </svg>
      {label}
    </button>
  )
}
