'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import {
  createEvent,
  updateEvent,
  deleteEvent,
  createEntry,
  createBulkEntries,
  markEntryUsed,
  revertEntryToActive,
  cancelEntry,
  validateEntryByToken,
  markEntryWhatsappSent,
} from '@/lib/actions'

// ==================== TYPES ====================

type EventItem = {
  id: string
  name: string
  date: string | Date
  description: string | null
  coverImage: string | null
  coverPrice: number
  paypalPrice: number | null
  isActive: boolean
  createdAt: string | Date
  _count: { entries: number }
  createdBy?: { name: string | null; username: string } | null
}

type EntryItem = {
  id: string
  clientName: string
  clientEmail: string
  clientPhone: string | null
  numberOfEntries: number
  totalPrice: number
  qrToken: string
  status: 'ACTIVE' | 'USED' | 'CANCELLED'
  emailSent: boolean
  whatsappSent: boolean
  createdAt: string | Date
  event: { name: string; date: string | Date; coverPrice: number }
  createdBy?: { name: string | null; username: string } | null
}

interface EntradasClientProps {
  events: EventItem[]
  recentEntries: EntryItem[]
  userRole?: 'ADMIN' | 'CAJERO'
}

type Tab = 'vender' | 'eventos' | 'historial' | 'escanear'

// ==================== SHARED HELPERS ====================

async function generateQRDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}

function buildPrintHtml(data: {
  entryId: string
  qrToken: string
  clientName: string
  clientEmail: string
  numberOfEntries: number
  totalPrice: number
  eventName: string
  eventDate: string
  qrDataUrl: string
  logoUrl: string
}) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })
  const eventDateStr = new Date(data.eventDate).toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  const pricePerEntry = data.totalPrice / data.numberOfEntries

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Entrada - ${data.eventName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; width: 302px; margin: 0 auto; padding: 16px 12px; color: #000; background: #fff; }
    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
    .header img { width: 120px; height: 120px; object-fit: contain; }
    .header p { font-size: 11px; margin-top: 4px; color: #444; }
    .title { text-align: center; font-size: 14px; font-weight: bold; padding: 8px 0; border-bottom: 1px dashed #999; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .event-date { text-align: center; font-size: 11px; color: #555; margin-top: -6px; margin-bottom: 10px; text-transform: capitalize; }
    .info-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
    .info-row .label { color: #555; }
    .info-row .value { font-weight: bold; text-align: right; max-width: 60%; }
    .divider { border-top: 1px dashed #999; margin: 10px 0; }
    .items-header { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; padding: 4px 0; border-bottom: 1px solid #000; }
    .item-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
    .total-section { border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; }
    .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; padding: 4px 0; }
    .qr-section { text-align: center; padding: 14px 0; border-top: 1px dashed #999; margin-top: 12px; }
    .qr-section img { width: 180px; height: 180px; }
    .qr-section p { font-size: 10px; color: #666; margin-top: 6px; }
    .footer { text-align: center; border-top: 2px dashed #000; padding-top: 12px; margin-top: 12px; font-size: 11px; color: #555; }
    .footer .thanks { font-size: 13px; font-weight: bold; color: #000; margin-bottom: 4px; }
    @media print { body { width: 100%; padding: 0 8px; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="${data.logoUrl}" alt="Casa Blanca" />
    <p>Comprobante de Entrada</p>
  </div>
  <div class="title">${data.eventName}</div>
  <div class="event-date">${eventDateStr}</div>
  <div class="info-row"><span class="label">Fecha compra:</span><span class="value">${dateStr}</span></div>
  <div class="info-row"><span class="label">Hora:</span><span class="value">${timeStr}</span></div>
  <div class="info-row"><span class="label">No. Transacción:</span><span class="value">${data.entryId.slice(-8).toUpperCase()}</span></div>
  <div class="divider"></div>
  <div class="info-row"><span class="label">Cliente:</span><span class="value">${data.clientName}</span></div>
  <div class="info-row"><span class="label">Email:</span><span class="value" style="font-size:10px">${data.clientEmail}</span></div>
  <div class="divider"></div>
  <div class="items-header"><span>DESCRIPCIÓN</span><span>CANT</span><span>P/U</span><span>TOTAL</span></div>
  <div class="item-row">
    <span style="flex:2">Cover</span>
    <span style="flex:0.5;text-align:center">${data.numberOfEntries}</span>
    <span style="flex:1;text-align:right">L ${pricePerEntry.toFixed(2)}</span>
    <span style="flex:1;text-align:right">L ${data.totalPrice.toFixed(2)}</span>
  </div>
  <div class="total-section">
    <div class="total-row"><span>TOTAL</span><span>L ${data.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span></div>
  </div>
  <div class="qr-section">
    <img src="${data.qrDataUrl}" alt="QR Code" />
    <p>Presenta este QR en la entrada</p>
  </div>
  <div class="footer">
    <p class="thanks">¡Gracias por tu compra!</p>
    <p>Casa Blanca © ${now.getFullYear()}</p>
  </div>
  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`
}

function printHtml(html: string) {
  // Use a hidden iframe to print — avoids the iOS PWA issue where
  // window.open() opens a view with no back/close button.
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-10000px'
  iframe.style.left = '-10000px'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }

  // Strip the auto-print script — we'll trigger print manually
  const cleanHtml = html.replace(/<script>window\.onload=function\(\)\{window\.print\(\);\}<\/script>/g, '')
  doc.open()
  doc.write(cleanHtml)
  doc.close()

  // Wait for images (logo, QR) to load before printing
  const images = Array.from(doc.querySelectorAll('img'))
  const loadPromises = images.map(
    (img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve() })
  )

  Promise.all(loadPromises).then(() => {
    setTimeout(() => {
      iframe.contentWindow?.print()
      // Clean up after a delay to let the print dialog finish
      setTimeout(() => {
        try { document.body.removeChild(iframe) } catch {}
      }, 1000)
    }, 300)
  })
}

async function handlePrintEntry(data: {
  entryId: string
  qrToken: string
  clientName: string
  clientEmail: string
  numberOfEntries: number
  totalPrice: number
  eventName: string
  eventDate: string
}) {
  const appUrl = window.location.origin
  const validationUrl = `${appUrl}/entradas/validar/${data.qrToken}`
  const qrDataUrl = await generateQRDataUrl(validationUrl)
  const logoUrl = `${appUrl}/LogoCasaBlanca.png`

  printHtml(buildPrintHtml({ ...data, qrDataUrl, logoUrl }))
}

async function handleSendEntryEmail(data: {
  entryId: string
  qrToken: string
  clientName: string
  clientEmail: string
  numberOfEntries: number
  totalPrice: number
  eventName: string
  eventDate: string
}) {
  // Convert single entry to the new multi-entry format
  const res = await fetch('/api/send-entry-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entries: [{ entryId: data.entryId, qrToken: data.qrToken, clientName: data.clientName }],
      clientEmail: data.clientEmail,
      eventName: data.eventName,
      eventDate: data.eventDate,
      totalPrice: data.totalPrice,
    }),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Error al enviar email')
  return result
}

function buildWhatsAppUrl(data: {
  phone: string
  entries: { qrToken: string; clientName: string }[]
  eventName: string
  eventDate: string
  totalPrice: number
}): string {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const eventDateStr = new Date(data.eventDate).toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  let message = `🎟️ *Tu entrada para ${data.eventName}*\n`
  message += `📅 ${eventDateStr}\n`
  message += `💰 Total: L ${data.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}\n\n`

  if (data.entries.length === 1) {
    const entry = data.entries[0]
    message += `👤 ${entry.clientName}\n`
    message += `🔗 Tu entrada y QR:\n${appUrl}/entradas/validar/${entry.qrToken}\n`
  } else {
    message += `👥 ${data.entries.length} entradas:\n`
    data.entries.forEach((entry, i) => {
      message += `\n${i + 1}. *${entry.clientName}*\n`
      message += `🔗 ${appUrl}/entradas/validar/${entry.qrToken}\n`
    })
  }

  message += `\nPresenta el QR en la entrada. ¡Te esperamos! 🎉`

  // Clean phone: remove spaces, dashes, parentheses
  let phone = data.phone.replace(/[\s\-\(\)]/g, '')
  // If starts with +, remove it (wa.me expects number without +)
  if (phone.startsWith('+')) phone = phone.slice(1)
  // If it's 8 digits (Honduras local), prepend 504
  if (/^\d{8}$/.test(phone)) phone = '504' + phone

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

// ==================== MAIN COMPONENT ====================

export function EntradasClient({ events, recentEntries, userRole = 'ADMIN' }: EntradasClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>(userRole === 'CAJERO' ? 'escanear' : 'vender')

  const allTabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'vender', label: 'Vender Entrada', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
    { id: 'escanear', label: 'Escanear', icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z' },
    { id: 'eventos', label: 'Eventos', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'historial', label: 'Historial', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ]

  // CAJERO solo ve escanear e historial
  const tabs = userRole === 'CAJERO'
    ? allTabs.filter((t) => t.id === 'escanear' || t.id === 'historial')
    : allTabs

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'bg-dark-100 border border-dark-200 text-white/70 hover:text-white hover:bg-dark-50'
            }`}
          >
            <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'vender' && <VenderEntrada events={events.filter((e) => e.isActive)} />}
      {activeTab === 'escanear' && <EscanearTab />}
      {activeTab === 'eventos' && <EventosTab events={events} />}
      {activeTab === 'historial' && <HistorialTab entries={recentEntries} />}
    </div>
  )
}

// ==================== VENDER ENTRADA TAB ====================

function VenderEntrada({ events }: { events: EventItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [eventId, setEventId] = useState('')
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
  } | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [whatsappSent, setWhatsappSent] = useState(false)
  const [printing, setPrinting] = useState(false)

  const selectedEvent = events.find((e) => e.id === eventId)
  const totalPrice = selectedEvent ? selectedEvent.coverPrice * numberOfEntries : 0

  // Keep guestNames array in sync with numberOfEntries
  const updateNumberOfEntries = (n: number) => {
    const newN = Math.max(1, n)
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
              <button type="button" onClick={() => updateNumberOfEntries(numberOfEntries + 1)} className="w-10 h-10 flex items-center justify-center bg-dark-50 border border-dark-200 rounded-lg text-white hover:bg-dark-200 transition-colors">+</button>
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
          <button type="submit" disabled={isPending} className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors">
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

// ==================== ESCANEAR TAB ====================

function EscanearTab() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isScanning, setIsScanning] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [error, setError] = useState('')
  const [scannedEntry, setScannedEntry] = useState<{
    id: string
    clientName: string
    clientEmail: string
    numberOfEntries: number
    totalPrice: number
    status: 'ACTIVE' | 'USED' | 'CANCELLED'
    createdAt: string | Date
    event: { name: string; date: string | Date; coverPrice: number }
  } | null>(null)
  const [actionMsg, setActionMsg] = useState('')

  const scannerRef = useRef<any>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)
  const camerasRef = useRef<{ id: string; label: string }[]>([])
  const currentCameraIndexRef = useRef(0)
  const switchingCameraRef = useRef(false)
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current
        if (typeof scanner.stop === 'function') await scanner.stop().catch(() => {})
        if (typeof scanner.clear === 'function') await scanner.clear().catch(() => {})
        if (scannerContainerRef.current) scannerContainerRef.current.innerHTML = ''
      } catch {}
      scannerRef.current = null
    }
    if (isMountedRef.current) { setIsScanning(false); setScannerError('') }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false; stopScanner() }
  }, [stopScanner])

  const parseTokenFromUrl = (text: string): string => {
    try {
      const url = new URL(text)
      const parts = url.pathname.split('/').filter(Boolean)
      const validarIdx = parts.findIndex((p) => p === 'validar')
      if (validarIdx !== -1 && parts[validarIdx + 1]) return parts[validarIdx + 1]
      return parts.pop() || text
    } catch {
      return text
    }
  }

  const lookupEntry = async (token: string) => {
    setError('')
    setScannedEntry(null)
    setActionMsg('')
    startTransition(async () => {
      try {
        const entry = await validateEntryByToken(token)
        if (!entry) { setError('Entrada no encontrada. Verifica el código.'); return }
        setScannedEntry(entry)
      } catch (err: any) {
        setError(err.message || 'Error al buscar entrada')
      }
    })
  }

  const handleScanResult = async (decodedText: string) => {
    if (!isMountedRef.current) return
    await stopScanner()
    const token = parseTokenFromUrl(decodedText)
    setManualToken(token)
    lookupEntry(token)
  }

  const startScanner = async () => {
    await stopScanner()
    await new Promise((r) => setTimeout(r, 100))
    setScannerError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError('Tu dispositivo no soporta el acceso a la cámara.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setScannerError('No pudimos acceder a la cámara. Otorga permisos en la configuración del navegador.')
      return
    }

    setIsScanning(true)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200))))

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      let attempts = 0
      while (!scannerContainerRef.current && attempts < 10) { await new Promise((r) => setTimeout(r, 50)); attempts++ }
      if (!scannerContainerRef.current) { setScannerError('Error con el contenedor del escáner.'); setIsScanning(false); return }
      if (!scannerContainerRef.current.id) scannerContainerRef.current.id = 'entry-qr-reader'
      scannerContainerRef.current.innerHTML = ''

      const cameras = await Html5Qrcode.getCameras()
      if (!cameras.length) { setScannerError('No se encontró cámara disponible.'); setIsScanning(false); return }

      camerasRef.current = cameras
      if (!switchingCameraRef.current) {
        const backLabels = ['back', 'rear', 'trasera', 'posterior', 'environment']
        const backIdx = cameras.findIndex((c) => backLabels.some((k) => c.label.toLowerCase().includes(k)))
        currentCameraIndexRef.current = backIdx >= 0 ? backIdx : (cameras.length >= 2 ? 1 : 0)
      }
      switchingCameraRef.current = false
      setCanSwitchCamera(cameras.length > 1)

      const html5QrCode = new Html5Qrcode(scannerContainerRef.current.id, { verbose: false })
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        cameras[currentCameraIndexRef.current].id,
        { fps: 10, qrbox: window.innerWidth < 640 ? { width: 220, height: 220 } : { width: 300, height: 300 }, aspectRatio: 1.0 },
        (decodedText: string) => handleScanResult(decodedText),
        () => {}
      )
    } catch (err: any) {
      setScannerError(err?.message || 'Error al iniciar el escáner.')
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualToken.trim()) { setError('Ingresa un código o token'); return }
    lookupEntry(manualToken.trim())
  }

  const handleMarkUsed = async () => {
    if (!scannedEntry) return
    startTransition(async () => {
      try {
        await markEntryUsed(scannedEntry.id)
        setActionMsg('Entrada marcada como USADA')
        setScannedEntry({ ...scannedEntry, status: 'USED' })
        router.refresh()
      } catch (err: any) { setError(err.message) }
    })
  }

  const statusConfig = {
    ACTIVE: { label: 'VÁLIDA', bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    USED: { label: 'YA UTILIZADA', bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    CANCELLED: { label: 'CANCELADA', bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Scanner */}
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Escanear Entrada</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => isScanning ? stopScanner() : startScanner()}
              className={`flex-1 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isScanning ? 'bg-red-500/20 border border-red-500/40 text-red-200' : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isScanning ? 'M6 18L18 6M6 6l12 12' : 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z'} />
              </svg>
              {isScanning ? 'Detener escaneo' : 'Escanear QR'}
            </button>
          </div>

          {scannerError && <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 px-4 py-3 rounded-lg text-sm">{scannerError}</div>}

          {isScanning && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-dark-300">Apunta la cámara al QR de la entrada.</span>
                {canSwitchCamera && (
                  <button type="button" onClick={handleSwitchCamera} className="shrink-0 px-3 py-1.5 text-sm font-medium bg-dark-200 hover:bg-dark-300 text-white rounded-lg">Cambiar cámara</button>
                )}
              </div>
              <div id="entry-qr-reader" ref={scannerContainerRef} className="w-full bg-dark-50 rounded-xl overflow-hidden border border-dark-200 min-h-[260px]" />
            </div>
          )}

          <div className="border-t border-dark-200 pt-4">
            <form onSubmit={handleManualSubmit} className="flex gap-2 sm:gap-3">
              <input type="text" value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Código o URL de entrada..." className="flex-1 min-w-0 px-3 sm:px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button type="submit" disabled={isPending} className="shrink-0 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg transition-colors">
                {isPending ? '...' : 'Buscar'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {actionMsg && <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">{actionMsg}</div>}

      {/* Scanned entry result */}
      {scannedEntry && (
        <div className="bg-dark-100 border border-dark-200 rounded-xl overflow-hidden">
          {(() => {
            const sc = statusConfig[scannedEntry.status]
            return (
              <>
                <div className={`${sc.bg} ${sc.border} border-b p-4 flex items-center justify-center gap-3`}>
                  <svg className={`w-8 h-8 ${sc.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sc.icon} /></svg>
                  <span className={`text-xl font-bold ${sc.text}`}>{sc.label}</span>
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white text-center">{scannedEntry.event.name}</h3>
                  <div className="bg-dark-50 border border-dark-200 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between"><span className="text-sm text-dark-300">Cliente</span><span className="text-white font-medium">{scannedEntry.clientName}</span></div>
                    <div className="border-t border-dark-200" />
                    <div className="flex justify-between"><span className="text-sm text-dark-300">Email</span><span className="text-white text-sm">{scannedEntry.clientEmail}</span></div>
                    <div className="border-t border-dark-200" />
                    <div className="flex justify-between"><span className="text-sm text-dark-300">Entradas</span><span className="text-white font-bold text-lg">{scannedEntry.numberOfEntries}</span></div>
                    <div className="border-t border-dark-200" />
                    <div className="flex justify-between"><span className="text-sm text-dark-300">Total</span><span className="text-primary-400 font-bold text-lg">L {scannedEntry.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                  {scannedEntry.status === 'ACTIVE' && (
                    <button onClick={handleMarkUsed} disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                      {isPending ? 'Procesando...' : 'Marcar como Usada'}
                    </button>
                  )}
                  <button onClick={() => { setScannedEntry(null); setManualToken(''); setActionMsg('') }} className="w-full bg-dark-50 hover:bg-dark-200 text-white/80 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm">
                    Escanear otra entrada
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ==================== EVENTOS TAB ====================

function EventosTab({ events }: { events: EventItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [coverPrice, setCoverPrice] = useState('')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [paypalPrice, setPaypalPrice] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const resetForm = () => { setName(''); setDate(''); setCoverPrice(''); setDescription(''); setCoverImage(''); setPaypalPrice(''); setEditingId(null); setShowForm(false); setError('') }

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

  const startEdit = (ev: EventItem) => {
    setEditingId(ev.id)
    setName(ev.name)
    setDate(new Date(ev.date).toISOString().split('T')[0])
    setCoverPrice(ev.coverPrice.toString())
    setDescription(ev.description || '')
    setCoverImage(ev.coverImage || '')
    setPaypalPrice(ev.paypalPrice ? ev.paypalPrice.toString() : '')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Ingresa el nombre del evento'); return }
    if (!date) { setError('Selecciona una fecha'); return }
    if (!coverPrice || parseFloat(coverPrice) <= 0) { setError('Ingresa un precio válido'); return }

    startTransition(async () => {
      try {
        const eventData = {
          name: name.trim(),
          date,
          coverPrice: parseFloat(coverPrice),
          description: description.trim() || undefined,
          coverImage: coverImage.trim() || undefined,
          paypalPrice: paypalPrice ? parseFloat(paypalPrice) : undefined,
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

  const handleToggleActive = async (ev: EventItem) => {
    startTransition(async () => {
      try { await updateEvent(ev.id, { isActive: !ev.isActive }); router.refresh() } catch (err: any) { setError(err.message) }
    })
  }

  const handleDelete = async (ev: EventItem) => {
    if (!confirm(`¿Eliminar el evento "${ev.name}"?`)) return
    startTransition(async () => {
      try { await deleteEvent(ev.id); router.refresh() } catch (err: any) { setError(err.message) }
    })
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Crear Evento
        </button>
      )}

      {showForm && (
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
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Descripcion <span className="text-white/30 font-normal">(opcional - lugar, hora, detalles)</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Ej: Doors open 9PM. Dress code: casual elegante." className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
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
                <label className="block text-sm font-medium text-dark-300 mb-2">Precio PayPal (USD) <span className="text-white/30 font-normal">(opcional - para venta online)</span></label>
                <input type="number" step="0.01" min="0" value={paypalPrice} onChange={(e) => setPaypalPrice(e.target.value)} placeholder="8.00" className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
            <div className="flex gap-3">
              <button type="submit" disabled={isPending || uploading} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors">{isPending ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Evento'}</button>
              <button type="button" onClick={resetForm} className="bg-dark-50 hover:bg-dark-200 text-white/80 font-medium py-2.5 px-6 rounded-lg transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center"><p className="text-white/40">No hay eventos creados aún.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <div key={ev.id} className={`bg-dark-100 border rounded-xl p-4 transition-colors ${ev.isActive ? 'border-dark-200' : 'border-dark-200/50 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-white">{ev.name}</h4>
                  <p className="text-sm text-dark-300">{new Date(ev.date).toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${ev.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{ev.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
              <div className="space-y-1 text-sm mb-4">
                <p className="text-dark-300">Cover: <span className="text-primary-400 font-semibold">L {ev.coverPrice.toFixed(2)}</span></p>
                {ev.paypalPrice && <p className="text-dark-300">PayPal: <span className="text-blue-400 font-semibold">${ev.paypalPrice.toFixed(2)} USD</span></p>}
                <p className="text-dark-300">Entradas vendidas: <span className="text-white font-medium">{ev._count.entries}</span></p>
                {ev.description && <p className="text-dark-300 truncate" title={ev.description}>{ev.description}</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => startEdit(ev)} disabled={isPending} className="text-xs px-3 py-1.5 bg-dark-50 hover:bg-dark-200 text-white/70 hover:text-white rounded-lg transition-colors">Editar</button>
                <button onClick={() => handleToggleActive(ev)} disabled={isPending} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${ev.isActive ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>{ev.isActive ? 'Desactivar' : 'Activar'}</button>
                {ev._count.entries === 0 && <button onClick={() => handleDelete(ev)} disabled={isPending} className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors">Eliminar</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== HISTORIAL TAB ====================

function HistorialTab({ entries }: { entries: EntryItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'USED' | 'CANCELLED'>('all')
  const [searchName, setSearchName] = useState('')
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)

  // Get unique event names for the filter dropdown
  const uniqueEvents = Array.from(new Set(entries.map((e) => e.event.name))).sort()

  const filtered = entries.filter((e) => {
    if (filter !== 'all' && e.status !== filter) return false
    if (eventFilter !== 'all' && e.event.name !== eventFilter) return false
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase()
      if (!e.clientName.toLowerCase().includes(q) && !e.clientEmail.toLowerCase().includes(q)) return false
    }
    return true
  })

  const handleMarkUsed = async (entryId: string) => {
    setError(''); setActionMsg('')
    startTransition(async () => {
      try { await markEntryUsed(entryId); setActionMsg('Entrada marcada como usada'); router.refresh() } catch (err: any) { setError(err.message) }
    })
  }

  const handleRevert = async (entryId: string) => {
    setError(''); setActionMsg('')
    startTransition(async () => {
      try { await revertEntryToActive(entryId); setActionMsg('Entrada revertida a activa'); router.refresh() } catch (err: any) { setError(err.message) }
    })
  }

  const handleCancel = async (entryId: string) => {
    if (!confirm('¿Cancelar esta entrada?')) return
    setError(''); setActionMsg('')
    startTransition(async () => {
      try { await cancelEntry(entryId); setActionMsg('Entrada cancelada'); router.refresh() } catch (err: any) { setError(err.message) }
    })
  }

  const handleEmail = async (entry: EntryItem) => {
    setSendingEmailId(entry.id); setError('')
    try {
      await handleSendEntryEmail({
        entryId: entry.id,
        qrToken: entry.qrToken,
        clientName: entry.clientName,
        clientEmail: entry.clientEmail,
        numberOfEntries: entry.numberOfEntries,
        totalPrice: entry.totalPrice,
        eventName: entry.event.name,
        eventDate: String(entry.event.date),
      })
      setActionMsg(`Email enviado a ${entry.clientEmail}`)
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setSendingEmailId(null) }
  }

  const handlePrint = async (entry: EntryItem) => {
    setPrintingId(entry.id)
    try {
      await handlePrintEntry({
        entryId: entry.id,
        qrToken: entry.qrToken,
        clientName: entry.clientName,
        clientEmail: entry.clientEmail,
        numberOfEntries: entry.numberOfEntries,
        totalPrice: entry.totalPrice,
        eventName: entry.event.name,
        eventDate: String(entry.event.date),
      })
    } finally { setPrintingId(null) }
  }

  const handleWhatsApp = async (entry: EntryItem) => {
    if (!entry.clientPhone) return
    const url = buildWhatsAppUrl({
      phone: entry.clientPhone,
      entries: [{ qrToken: entry.qrToken, clientName: entry.clientName }],
      eventName: entry.event.name,
      eventDate: String(entry.event.date),
      totalPrice: entry.totalPrice,
    })
    window.open(url, '_blank')
    try {
      await markEntryWhatsappSent(entry.id)
      setActionMsg(`WhatsApp abierto para ${entry.clientPhone}`)
      router.refresh()
    } catch {}
  }

  const statusConfig = {
    ACTIVE: { label: 'Activa', bg: 'bg-green-500/20', text: 'text-green-400' },
    USED: { label: 'Usada', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    CANCELLED: { label: 'Cancelada', bg: 'bg-red-500/20', text: 'text-red-400' },
  }

  return (
    <div className="space-y-4">
      {/* Status filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {([{ id: 'all' as const, label: 'Todas' }, { id: 'ACTIVE' as const, label: 'Activas' }, { id: 'USED' as const, label: 'Usadas' }, { id: 'CANCELLED' as const, label: 'Canceladas' }]).map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === f.id ? 'bg-primary-600 text-white' : 'bg-dark-100 border border-dark-200 text-white/60 hover:text-white'}`}>{f.label}</button>
        ))}
      </div>

      {/* Search and event filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-3 py-2.5 bg-dark-100 border border-dark-200 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {uniqueEvents.length > 1 && (
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2.5 bg-dark-100 border border-dark-200 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-auto"
          >
            <option value="all">Todos los eventos</option>
            {uniqueEvents.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {actionMsg && <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">{actionMsg}</div>}

      {filtered.length === 0 ? (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center"><p className="text-white/40">{searchName || eventFilter !== 'all' ? 'No se encontraron entradas con esos filtros.' : 'No hay entradas registradas.'}</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => {
            const sc = statusConfig[entry.status]
            return (
              <div key={entry.id} className="bg-dark-100 border border-dark-200 rounded-xl p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white truncate">{entry.clientName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-dark-300">
                      <span className="truncate max-w-[180px] sm:max-w-none">{entry.clientEmail}</span>
                      <span>{entry.event.name}</span>
                      <span>{entry.numberOfEntries} entrada{entry.numberOfEntries > 1 ? 's' : ''}</span>
                      <span className="text-primary-400 font-semibold">L {entry.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="text-xs text-dark-300/60 mt-1">
                      {new Date(entry.createdAt).toLocaleString('es-HN')}
                      {entry.createdBy && ` · ${entry.createdBy.name || entry.createdBy.username}`}
                      {entry.emailSent && ' · Email enviado'}
                      {entry.whatsappSent && ' · WhatsApp enviado'}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                    {/* Email, WhatsApp & Print - always available for non-cancelled */}
                    {entry.status !== 'CANCELLED' && (
                      <>
                        <button onClick={() => handleEmail(entry)} disabled={sendingEmailId === entry.id} className="text-xs px-2.5 sm:px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          {sendingEmailId === entry.id ? 'Enviando...' : 'Email'}
                        </button>
                        {entry.clientPhone && (
                          <button onClick={() => handleWhatsApp(entry)} className="text-xs px-2.5 sm:px-3 py-1.5 bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 rounded-lg transition-colors flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                            WhatsApp
                          </button>
                        )}
                        <button onClick={() => handlePrint(entry)} disabled={printingId === entry.id} className="text-xs px-2.5 sm:px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          Imprimir
                        </button>
                      </>
                    )}

                    {/* Status actions */}
                    {entry.status === 'ACTIVE' && (
                      <>
                        <button onClick={() => handleMarkUsed(entry.id)} disabled={isPending} className="text-xs px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">Marcar Usada</button>
                        <button onClick={() => handleCancel(entry.id)} disabled={isPending} className="text-xs px-2.5 sm:px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50">Cancelar</button>
                      </>
                    )}
                    {entry.status === 'USED' && (
                      <button onClick={() => handleRevert(entry.id)} disabled={isPending} className="text-xs px-2.5 sm:px-3 py-1.5 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg transition-colors disabled:opacity-50">Revertir</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
