'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createEvent,
  updateEvent,
  deleteEvent,
  createEntry,
  markEntryUsed,
  cancelEntry,
} from '@/lib/actions'

// ==================== TYPES ====================

type EventItem = {
  id: string
  name: string
  date: string | Date
  coverPrice: number
  isActive: boolean
  createdAt: string | Date
  _count: { entries: number }
  createdBy?: { name: string | null; username: string } | null
}

type EntryItem = {
  id: string
  clientName: string
  clientEmail: string
  numberOfEntries: number
  totalPrice: number
  qrToken: string
  status: 'ACTIVE' | 'USED' | 'CANCELLED'
  emailSent: boolean
  createdAt: string | Date
  event: { name: string; date: string | Date; coverPrice: number }
  createdBy?: { name: string | null; username: string } | null
}

interface EntradasClientProps {
  events: EventItem[]
  recentEntries: EntryItem[]
}

type Tab = 'vender' | 'eventos' | 'historial'

// ==================== MAIN COMPONENT ====================

export function EntradasClient({ events, recentEntries }: EntradasClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('vender')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'vender', label: 'Vender Entrada', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
    { id: 'eventos', label: 'Eventos', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'historial', label: 'Historial', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ]

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'bg-dark-100 border border-dark-200 text-white/70 hover:text-white hover:bg-dark-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'vender' && <VenderEntrada events={events.filter((e) => e.isActive)} />}
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
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [numberOfEntries, setNumberOfEntries] = useState(1)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    entryId: string
    qrToken: string
    clientName: string
    clientEmail: string
    numberOfEntries: number
    totalPrice: number
    eventName: string
  } | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const selectedEvent = events.find((e) => e.id === eventId)
  const totalPrice = selectedEvent ? selectedEvent.coverPrice * numberOfEntries : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(null)

    if (!eventId) { setError('Selecciona un evento'); return }
    if (!clientName.trim()) { setError('Ingresa el nombre del cliente'); return }
    if (!clientEmail.trim()) { setError('Ingresa el email del cliente'); return }
    if (numberOfEntries < 1) { setError('Mínimo 1 entrada'); return }

    startTransition(async () => {
      try {
        const entry = await createEntry({
          eventId,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          numberOfEntries,
        })

        setSuccess({
          entryId: entry.id,
          qrToken: entry.qrToken,
          clientName: entry.clientName,
          clientEmail: entry.clientEmail,
          numberOfEntries: entry.numberOfEntries,
          totalPrice: Number(entry.totalPrice),
          eventName: entry.event.name,
        })

        // Reset form
        setClientName('')
        setClientEmail('')
        setNumberOfEntries(1)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Error al crear la entrada')
      }
    })
  }

  const handleSendEmail = async () => {
    if (!success) return
    setSendingEmail(true)
    try {
      const res = await fetch('/api/send-entry-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: success.entryId,
          qrToken: success.qrToken,
          clientName: success.clientName,
          clientEmail: success.clientEmail,
          numberOfEntries: success.numberOfEntries,
          totalPrice: success.totalPrice,
          eventName: success.eventName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar email')
      setEmailSent(true)
    } catch (err: any) {
      setError(err.message || 'Error al enviar email')
    } finally {
      setSendingEmail(false)
    }
  }

  const handlePrintEntry = (data: NonNullable<typeof success>) => {
    const appUrl = window.location.origin
    const validationUrl = `${appUrl}/entradas/validar/${data.qrToken}`
    const now = new Date()
    const dateStr = now.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const timeStr = now.toLocaleTimeString('es-HN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const pricePerEntry = data.totalPrice / data.numberOfEntries

    const printWindow = window.open('', '_blank', 'width=400,height=700')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Entrada - ${data.eventName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            width: 302px;
            margin: 0 auto;
            padding: 16px 12px;
            color: #000;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          .header h1 {
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 2px;
          }
          .header p {
            font-size: 11px;
            margin-top: 4px;
            color: #444;
          }
          .title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            padding: 8px 0;
            border-bottom: 1px dashed #999;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            padding: 3px 0;
          }
          .info-row .label { color: #555; }
          .info-row .value { font-weight: bold; text-align: right; max-width: 60%; }
          .divider {
            border-top: 1px dashed #999;
            margin: 10px 0;
          }
          .items-header {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: bold;
            padding: 4px 0;
            border-bottom: 1px solid #000;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            padding: 4px 0;
          }
          .total-section {
            border-top: 2px solid #000;
            margin-top: 8px;
            padding-top: 8px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: bold;
            padding: 4px 0;
          }
          .qr-section {
            text-align: center;
            padding: 14px 0;
            border-top: 1px dashed #999;
            margin-top: 12px;
          }
          .qr-section img {
            width: 180px;
            height: 180px;
          }
          .qr-section p {
            font-size: 10px;
            color: #666;
            margin-top: 6px;
          }
          .footer {
            text-align: center;
            border-top: 2px dashed #000;
            padding-top: 12px;
            margin-top: 12px;
            font-size: 11px;
            color: #555;
          }
          .footer .thanks {
            font-size: 13px;
            font-weight: bold;
            color: #000;
            margin-bottom: 4px;
          }
          @media print {
            body { width: 100%; padding: 0 8px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CASA BLANCA</h1>
          <p>Comprobante de Entrada</p>
        </div>

        <div class="title">${data.eventName}</div>

        <div class="info-row">
          <span class="label">Fecha:</span>
          <span class="value">${dateStr}</span>
        </div>
        <div class="info-row">
          <span class="label">Hora:</span>
          <span class="value">${timeStr}</span>
        </div>
        <div class="info-row">
          <span class="label">No. Transacción:</span>
          <span class="value">${data.entryId.slice(-8).toUpperCase()}</span>
        </div>

        <div class="divider"></div>

        <div class="info-row">
          <span class="label">Cliente:</span>
          <span class="value">${data.clientName}</span>
        </div>
        <div class="info-row">
          <span class="label">Email:</span>
          <span class="value" style="font-size:10px">${data.clientEmail}</span>
        </div>

        <div class="divider"></div>

        <div class="items-header">
          <span>DESCRIPCIÓN</span>
          <span>CANT</span>
          <span>P/U</span>
          <span>TOTAL</span>
        </div>
        <div class="item-row">
          <span style="flex:2">Cover</span>
          <span style="flex:0.5;text-align:center">${data.numberOfEntries}</span>
          <span style="flex:1;text-align:right">L ${pricePerEntry.toFixed(2)}</span>
          <span style="flex:1;text-align:right">L ${data.totalPrice.toFixed(2)}</span>
        </div>

        <div class="total-section">
          <div class="total-row">
            <span>TOTAL</span>
            <span>L ${data.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div class="qr-section">
          <img id="qrImg" alt="QR Code" />
          <p>Presenta este QR en la entrada</p>
        </div>

        <div class="footer">
          <p class="thanks">¡Gracias por tu compra!</p>
          <p>Casa Blanca &copy; ${now.getFullYear()}</p>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
        <script>
          QRCode.toDataURL('${validationUrl}', {
            width: 180,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
          }).then(function(url) {
            document.getElementById('qrImg').src = url;
            setTimeout(function() { window.print(); }, 300);
          }).catch(function() {
            setTimeout(function() { window.print(); }, 300);
          });
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
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
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Nueva Entrada</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event selector */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Evento</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Seleccionar evento...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} - L {ev.coverPrice.toFixed(2)} (
                  {new Date(ev.date).toLocaleDateString('es-HN')})
                </option>
              ))}
            </select>
          </div>

          {/* Client name */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nombre del Cliente</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Client email */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Email del Cliente</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Number of entries */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Número de Entradas</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNumberOfEntries(Math.max(1, numberOfEntries - 1))}
                className="w-10 h-10 flex items-center justify-center bg-dark-50 border border-dark-200 rounded-lg text-white hover:bg-dark-200 transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                value={numberOfEntries}
                onChange={(e) => setNumberOfEntries(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center px-3 py-2.5 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => setNumberOfEntries(numberOfEntries + 1)}
                className="w-10 h-10 flex items-center justify-center bg-dark-50 border border-dark-200 rounded-lg text-white hover:bg-dark-200 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Total */}
          {selectedEvent && (
            <div className="bg-primary-600/10 border border-primary-500/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-300">Total a cobrar</span>
                <span className="text-2xl font-bold text-primary-400">
                  L {totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-dark-300 mt-1">
                {numberOfEntries} entrada{numberOfEntries > 1 ? 's' : ''} × L{' '}
                {selectedEvent.coverPrice.toFixed(2)}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isPending ? 'Procesando...' : 'Registrar Venta'}
          </button>
        </form>
      </div>

      {/* Success / QR section */}
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Venta Registrada</h3>
            <div className="space-y-2 text-sm">
              <p className="text-dark-300">
                <span className="text-white font-medium">{success.eventName}</span>
              </p>
              <p className="text-dark-300">
                Cliente: <span className="text-white">{success.clientName}</span>
              </p>
              <p className="text-dark-300">
                Email: <span className="text-white">{success.clientEmail}</span>
              </p>
              <p className="text-dark-300">
                Entradas: <span className="text-white">{success.numberOfEntries}</span>
              </p>
              <p className="text-dark-300">
                Total:{' '}
                <span className="text-primary-400 font-bold">
                  L {success.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>

            <div className="border-t border-dark-200 pt-4 space-y-3">
              {emailSent ? (
                <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">
                  Email enviado exitosamente a {success.clientEmail}
                </div>
              ) : (
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {sendingEmail ? 'Enviando...' : 'Enviar QR por Email'}
                </button>
              )}

              <button
                onClick={() => handlePrintEntry(success)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Entrada
              </button>

              <button
                onClick={() => {
                  setSuccess(null)
                  setEmailSent(false)
                  setError('')
                }}
                className="w-full bg-dark-50 hover:bg-dark-200 text-white/80 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                Vender otra entrada
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <svg className="w-20 h-20 text-white/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="text-lg font-medium text-white/40 mb-1">Completa la venta</h3>
            <p className="text-sm text-white/20">
              Llena el formulario para generar la entrada y enviar el QR.
            </p>
          </div>
        )}
      </div>
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
  const [error, setError] = useState('')

  const resetForm = () => {
    setName('')
    setDate('')
    setCoverPrice('')
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  const startEdit = (ev: EventItem) => {
    setEditingId(ev.id)
    setName(ev.name)
    setDate(new Date(ev.date).toISOString().split('T')[0])
    setCoverPrice(ev.coverPrice.toString())
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
        if (editingId) {
          await updateEvent(editingId, {
            name: name.trim(),
            date,
            coverPrice: parseFloat(coverPrice),
          })
        } else {
          await createEvent({
            name: name.trim(),
            date,
            coverPrice: parseFloat(coverPrice),
          })
        }
        resetForm()
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Error al guardar evento')
      }
    })
  }

  const handleToggleActive = async (ev: EventItem) => {
    startTransition(async () => {
      try {
        await updateEvent(ev.id, { isActive: !ev.isActive })
        router.refresh()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleDelete = async (ev: EventItem) => {
    if (!confirm(`¿Eliminar el evento "${ev.name}"?`)) return
    startTransition(async () => {
      try {
        await deleteEvent(ev.id)
        router.refresh()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Create button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Evento
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Editar Evento' : 'Nuevo Evento'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Noche de Reggaeton"
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Precio Cover (L)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={coverPrice}
                  onChange={(e) => setCoverPrice(e.target.value)}
                  placeholder="200.00"
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
              >
                {isPending ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Evento'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-dark-50 hover:bg-dark-200 text-white/80 font-medium py-2.5 px-6 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center">
          <p className="text-white/40">No hay eventos creados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className={`bg-dark-100 border rounded-xl p-4 transition-colors ${
                ev.isActive ? 'border-dark-200' : 'border-dark-200/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-white">{ev.name}</h4>
                  <p className="text-sm text-dark-300">
                    {new Date(ev.date).toLocaleDateString('es-HN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ev.isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {ev.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="space-y-1 text-sm mb-4">
                <p className="text-dark-300">
                  Cover: <span className="text-primary-400 font-semibold">L {ev.coverPrice.toFixed(2)}</span>
                </p>
                <p className="text-dark-300">
                  Entradas vendidas: <span className="text-white font-medium">{ev._count.entries}</span>
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => startEdit(ev)}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 bg-dark-50 hover:bg-dark-200 text-white/70 hover:text-white rounded-lg transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(ev)}
                  disabled={isPending}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    ev.isActive
                      ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {ev.isActive ? 'Desactivar' : 'Activar'}
                </button>
                {ev._count.entries === 0 && (
                  <button
                    onClick={() => handleDelete(ev)}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                )}
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
  const [error, setError] = useState('')

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.status === filter)

  const handleMarkUsed = async (entryId: string) => {
    startTransition(async () => {
      try {
        await markEntryUsed(entryId)
        router.refresh()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleCancel = async (entryId: string) => {
    if (!confirm('¿Cancelar esta entrada?')) return
    startTransition(async () => {
      try {
        await cancelEntry(entryId)
        router.refresh()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const statusConfig = {
    ACTIVE: { label: 'Activa', bg: 'bg-green-500/20', text: 'text-green-400' },
    USED: { label: 'Usada', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    CANCELLED: { label: 'Cancelada', bg: 'bg-red-500/20', text: 'text-red-400' },
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all' as const, label: 'Todas' },
          { id: 'ACTIVE' as const, label: 'Activas' },
          { id: 'USED' as const, label: 'Usadas' },
          { id: 'CANCELLED' as const, label: 'Canceladas' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-primary-600 text-white'
                : 'bg-dark-100 border border-dark-200 text-white/60 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Entries list */}
      {filtered.length === 0 ? (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center">
          <p className="text-white/40">No hay entradas registradas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => {
            const sc = statusConfig[entry.status]
            return (
              <div
                key={entry.id}
                className="bg-dark-100 border border-dark-200 rounded-xl p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white truncate">{entry.clientName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-300">
                      <span>{entry.clientEmail}</span>
                      <span>{entry.event.name}</span>
                      <span>{entry.numberOfEntries} entrada{entry.numberOfEntries > 1 ? 's' : ''}</span>
                      <span className="text-primary-400 font-semibold">
                        L {entry.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-dark-300/60 mt-1">
                      {new Date(entry.createdAt).toLocaleString('es-HN')}
                      {entry.createdBy && ` · ${entry.createdBy.name || entry.createdBy.username}`}
                      {entry.emailSent && ' · Email enviado'}
                    </p>
                  </div>

                  {entry.status === 'ACTIVE' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleMarkUsed(entry.id)}
                        disabled={isPending}
                        className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        Marcar Usada
                      </button>
                      <button
                        onClick={() => handleCancel(entry.id)}
                        disabled={isPending}
                        className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
