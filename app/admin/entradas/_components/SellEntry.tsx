'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEntry, createBulkEntries, markEntryWhatsappSent } from '@/lib/actions'
import { generateQRDataUrl, buildPrintHtml, printHtml, buildWhatsAppUrl } from './entry-delivery'
import type { EventItem } from './types'

/** Formulario de venta en taquilla/admin (movido sin cambios de lógica desde EntradasClient). */
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
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center">
        <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-white mb-2">No hay eventos activos</h3>
        <p className="text-dark-300">Crea un evento primero en la pestaña &quot;Eventos&quot; para empezar a vender entradas.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Nueva Entrada</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Evento</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Seleccionar evento...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} - L {ev.coverPrice.toFixed(2)} ({new Date(ev.date).toLocaleDateString('es-HN', { timeZone: 'UTC' })})
                </option>
              ))}
            </select>
            {doorSoldOut && (
              <p className="text-sm text-amber-400 mt-2">Cupo agotado: no quedan entradas disponibles para este evento.</p>
            )}
            {remainingAtDoor != null && remainingAtDoor >= 1 && (
              <p className="text-xs text-dark-300 mt-2">Quedan {remainingAtDoor} entrada{remainingAtDoor !== 1 ? 's' : ''} disponibles.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Email del Cliente</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="correo@ejemplo.com" className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">WhatsApp del Cliente <span className="text-white/30 font-normal">(opcional)</span></label>
            <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="9999-9999" className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Número de Entradas</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateNumberOfEntries(numberOfEntries - 1)} className="w-10 h-10 flex items-center justify-center bg-dark-50 border border-dark-200 rounded-lg text-white hover:bg-dark-200 transition-colors">-</button>
              <input type="number" min={1} value={numberOfEntries} onChange={(e) => updateNumberOfEntries(parseInt(e.target.value) || 1)} className="w-20 text-center px-3 py-2.5 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button
                type="button"
                onClick={() => updateNumberOfEntries(numberOfEntries + 1)}
                disabled={doorSoldOut || (remainingAtDoor != null && numberOfEntries >= remainingAtDoor)}
                className="w-10 h-10 flex items-center justify-center bg-dark-50 border border-dark-200 rounded-lg text-white hover:bg-dark-200 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                +
              </button>
            </div>
          </div>
          {/* Guest names */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-dark-300">
              {numberOfEntries === 1 ? 'Nombre del Cliente' : `Nombres (${numberOfEntries} entradas)`}
            </label>
            {guestNames.slice(0, numberOfEntries).map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                {numberOfEntries > 1 && (
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-600/20 text-primary-400 text-xs font-bold">{i + 1}</span>
                )}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updateGuestName(i, e.target.value)}
                  placeholder={numberOfEntries === 1 ? 'Nombre completo' : `Nombre entrada ${i + 1}`}
                  className="flex-1 px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ))}
          </div>
          {selectedEvent && (
            <div className="bg-primary-600/10 border border-primary-500/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-300">Total a cobrar</span>
                <span className="text-2xl font-bold text-primary-400">L {totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-xs text-dark-300 mt-1">{numberOfEntries} entrada{numberOfEntries > 1 ? 's' : ''} × L {selectedEvent.coverPrice.toFixed(2)}</p>
            </div>
          )}
          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
          <button type="submit" disabled={isPending || doorSoldOut} className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors">
            {isPending ? 'Procesando...' : 'Registrar Venta'}
          </button>
        </form>
      </div>

      {/* Success / QR section */}
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6">
        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Venta Registrada</h3>
            <div className="space-y-2 text-sm">
              <p className="text-dark-300"><span className="text-white font-medium">{success.eventName}</span></p>
              <p className="text-dark-300">Email: <span className="text-white">{success.clientEmail}</span></p>
              <p className="text-dark-300">Entradas: <span className="text-white">{success.entries.length}</span></p>
              {success.entries.length > 1 && (
                <div className="bg-dark-50 border border-dark-200 rounded-lg p-3 text-left space-y-1">
                  {success.entries.map((entry, i) => (
                    <div key={entry.entryId} className="flex items-center gap-2">
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-primary-600/20 text-primary-400 text-[10px] font-bold">{i + 1}</span>
                      <span className="text-white text-sm">{entry.clientName}</span>
                    </div>
                  ))}
                </div>
              )}
              {success.entries.length === 1 && (
                <p className="text-dark-300">Cliente: <span className="text-white">{success.entries[0].clientName}</span></p>
              )}
              <p className="text-dark-300">Total: <span className="text-primary-400 font-bold">L {success.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span></p>
            </div>
            <div className="border-t border-dark-200 pt-4 space-y-3">
              {emailSent ? (
                <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">Email enviado exitosamente a {success.clientEmail}</div>
              ) : (
                <button onClick={handleEmail} disabled={sendingEmail} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {sendingEmail ? 'Enviando...' : `Enviar ${success.entries.length > 1 ? `${success.entries.length} QRs` : 'QR'} por Email`}
                </button>
              )}
              {success.clientPhone ? (
                whatsappSent ? (
                  <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                    WhatsApp enviado
                  </div>
                ) : (
                  <button onClick={handleWhatsApp} className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                    {`Enviar ${success.entries.length > 1 ? `${success.entries.length} Entradas` : 'Entrada'} por WhatsApp`}
                  </button>
                )
              ) : null}
              <button onClick={handlePrint} disabled={printing} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                {printing ? 'Generando...' : `Imprimir ${success.entries.length > 1 ? `${success.entries.length} Entradas` : 'Entrada'}`}
              </button>
              <button onClick={() => { setSuccess(null); setEmailSent(false); setWhatsappSent(false); setError('') }} className="w-full bg-dark-50 hover:bg-dark-200 text-white/80 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm">
                Vender otra entrada
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <svg className="w-20 h-20 text-white/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            <h3 className="text-lg font-medium text-white/40 mb-1">Completa la venta</h3>
            <p className="text-sm text-white/20">Llena el formulario para generar la entrada y enviar el QR.</p>
          </div>
        )}
      </div>
    </div>
  )
}
