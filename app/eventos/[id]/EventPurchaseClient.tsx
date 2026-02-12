'use client'

import { useState } from 'react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import QRCode from 'qrcode'

type EventData = {
  id: string
  name: string
  date: string
  description: string | null
  coverImage: string | null
  coverPrice: number
  paypalPrice: number
}

type PurchaseSuccess = {
  entries: { entryId: string; qrToken: string; clientName: string }[]
  clientEmail: string
  eventName: string
  eventDate: string
  totalPrice: number
  paypalOrderId: string
}

async function generateQRDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}

const goldGradient = 'linear-gradient(135deg, #c9a84c, #a88a3d)'
const cardBg = 'rgba(15, 15, 30, 0.8)'
const cardBorder = 'rgba(255,255,255,0.06)'
const inputBg = 'rgba(10,10,25,0.9)'
const inputBorder = 'rgba(255,255,255,0.1)'

export function EventPurchaseClient({ event }: { event: EventData }) {
  const [clientNames, setClientNames] = useState<string[]>([''])
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [numberOfEntries, setNumberOfEntries] = useState(1)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState<PurchaseSuccess | null>(null)

  const totalPrice = event.paypalPrice * numberOfEntries

  const eventDateStr = new Date(event.date).toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  const handleQtyChange = (newQty: number) => {
    setNumberOfEntries(newQty)
    setClientNames((prev) => {
      const updated = [...prev]
      while (updated.length < newQty) updated.push('')
      return updated.slice(0, newQty)
    })
  }

  const updateName = (index: number, value: string) => {
    setClientNames((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const allNamesValid = clientNames.every((n) => n.trim().length > 0)
  const formValid = allNamesValid && clientEmail.trim() && numberOfEntries >= 1

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  if (success) {
    return <ConfirmationView success={success} event={event} />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Event Info */}
      <div>
        {event.coverImage && (
          <div className="aspect-[4/5] rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid ${cardBorder}` }}>
            <img src={event.coverImage} alt={event.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{event.name}</h2>
        <p className="font-medium mb-4 capitalize" style={{ color: '#c9a84c' }}>{eventDateStr}</p>
        {event.description && (
          <p className="text-white/40 text-sm leading-relaxed mb-6 whitespace-pre-line">{event.description}</p>
        )}
        <div className="rounded-xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40">Precio por entrada</span>
            <span className="text-2xl font-bold" style={{ color: '#c9a84c' }}>${event.paypalPrice.toFixed(2)} <span className="text-sm text-white/30 font-normal">USD</span></span>
          </div>
          <p className="text-xs text-white/20">Equivalente a ~L {event.coverPrice.toFixed(2)} HNL</p>
        </div>
      </div>

      {/* Purchase Form */}
      <div className="rounded-2xl p-5 sm:p-6 h-fit" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <h3 className="text-lg font-bold text-white mb-1">Comprar Entrada</h3>
        <div className="w-12 h-0.5 mb-5" style={{ background: goldGradient }} />
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/50 mb-2">Cantidad de entradas</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQtyChange(Math.max(1, numberOfEntries - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-white hover:opacity-80 transition-colors"
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              >-</button>
              <input
                type="number"
                min={1}
                max={10}
                value={numberOfEntries}
                onChange={(e) => handleQtyChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-20 text-center px-3 py-2.5 rounded-lg text-white focus:outline-none"
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              />
              <button
                type="button"
                onClick={() => handleQtyChange(Math.min(10, numberOfEntries + 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-white hover:opacity-80 transition-colors"
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              >+</button>
            </div>
          </div>
          {/* Names */}
          <div className="space-y-3">
            {clientNames.map((name, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-white/50 mb-2">
                  {numberOfEntries > 1 ? `Nombre entrada ${i + 1} *` : 'Nombre completo *'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={numberOfEntries > 1 ? `Nombre persona ${i + 1}` : 'Tu nombre'}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 transition-all"
                  style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                  onBlur={(e) => e.target.style.borderColor = inputBorder}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-white/50 mb-2">Email *</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 transition-all"
              style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={(e) => e.target.style.borderColor = inputBorder}
            />
            <p className="text-xs text-white/20 mt-1">Recibiras todas las entradas y QRs aqui</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/50 mb-2">WhatsApp <span className="text-white/20 font-normal">(opcional)</span></label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="9999-9999"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 transition-all"
              style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={(e) => e.target.style.borderColor = inputBorder}
            />
          </div>

          {/* Total */}
          <div className="rounded-lg p-4" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40">Total a pagar</span>
              <span className="text-2xl font-bold" style={{ color: '#c9a84c' }}>${totalPrice.toFixed(2)} USD</span>
            </div>
            <p className="text-xs text-white/20 mt-1">{numberOfEntries} entrada{numberOfEntries > 1 ? 's' : ''} x ${event.paypalPrice.toFixed(2)}</p>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}

          {processing && (
            <div className="text-center py-4">
              <div className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-2" style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }} />
              <p className="text-sm text-white/40">Procesando pago...</p>
            </div>
          )}

          {/* PayPal Button */}
          {!processing && formValid && paypalClientId ? (
            <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD' }}>
              <PayPalButtons
                style={{
                  layout: 'vertical',
                  color: 'gold',
                  shape: 'rect',
                  label: 'pay',
                  height: 48,
                }}
                createOrder={async () => {
                  setError('')
                  const res = await fetch('/api/paypal/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: event.id, numberOfEntries, clientNames: clientNames.map(n => n.trim()) }),
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || 'Error al crear orden')
                  return data.orderId
                }}
                onApprove={async (data) => {
                  setProcessing(true)
                  setError('')
                  try {
                    const res = await fetch('/api/paypal/capture-order', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        orderId: data.orderID,
                        eventId: event.id,
                        clientNames: clientNames.map(n => n.trim()),
                        clientEmail: clientEmail.trim(),
                        clientPhone: clientPhone.trim() || undefined,
                        numberOfEntries,
                      }),
                    })
                    const result = await res.json()
                    if (!res.ok) throw new Error(result.error || 'Error al capturar pago')
                    setSuccess(result)
                  } catch (err: any) {
                    setError(err.message || 'Error al procesar el pago')
                  } finally {
                    setProcessing(false)
                  }
                }}
                onError={(err) => {
                  console.error('PayPal error:', err)
                  setError('Error con PayPal. Intenta de nuevo.')
                  setProcessing(false)
                }}
                onCancel={() => {
                  setError('')
                  setProcessing(false)
                }}
              />
            </PayPalScriptProvider>
          ) : !formValid ? (
            <div className="rounded-lg p-4 text-center" style={{ background: inputBg, border: `1px solid ${inputBorder}` }}>
              <p className="text-sm text-white/30">Completa tu nombre y email para ver el boton de pago</p>
            </div>
          ) : !paypalClientId ? (
            <div className="rounded-lg p-4 text-center" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p className="text-sm text-amber-400/80">Pagos en linea no disponibles en este momento</p>
            </div>
          ) : null}

          <p className="text-xs text-white/15 text-center">
            Pago seguro a traves de PayPal. Al pagar, recibiras tu entrada por email automaticamente.
          </p>
        </div>
      </div>
    </div>
  )
}

// ==================== CONFIRMATION VIEW ====================

function ConfirmationView({ success, event }: { success: PurchaseSuccess; event: EventData }) {
  const [downloading, setDownloading] = useState(false)
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const eventDateStr = new Date(success.eventDate).toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const logoUrl = `${appUrl}/LogoCasaBlanca.png`

      for (const entry of success.entries) {
        const validationUrl = `${appUrl}/entradas/validar/${entry.qrToken}`
        const qrDataUrl = await generateQRDataUrl(validationUrl)

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Entrada - ${success.eventName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:302px;margin:0 auto;padding:16px 12px;color:#000;background:#fff}
  .header{text-align:center;border-bottom:2px dashed #000;padding-bottom:12px;margin-bottom:12px}
  .header img{width:120px;height:120px;object-fit:contain}
  .title{text-align:center;font-size:14px;font-weight:bold;padding:8px 0;border-bottom:1px dashed #999;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px}
  .event-date{text-align:center;font-size:11px;color:#555;margin-top:-6px;margin-bottom:10px;text-transform:capitalize}
  .info-row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}
  .info-row .label{color:#555}
  .info-row .value{font-weight:bold;text-align:right;max-width:60%}
  .divider{border-top:1px dashed #999;margin:10px 0}
  .total-section{border-top:2px solid #000;margin-top:8px;padding-top:8px}
  .total-row{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;padding:4px 0}
  .qr-section{text-align:center;padding:14px 0;border-top:1px dashed #999;margin-top:12px}
  .qr-section img{width:180px;height:180px}
  .qr-section p{font-size:10px;color:#666;margin-top:6px}
  .footer{text-align:center;border-top:2px dashed #000;padding-top:12px;margin-top:12px;font-size:11px;color:#555}
  .footer .thanks{font-size:13px;font-weight:bold;color:#000;margin-bottom:4px}
  @media print{body{width:100%;padding:0 8px}}
</style></head>
<body>
  <div class="header"><img src="${logoUrl}" alt="Casa Blanca"/><p>Comprobante de Entrada</p></div>
  <div class="title">${success.eventName}</div>
  <div class="event-date">${eventDateStr}</div>
  <div class="divider"></div>
  <div class="info-row"><span class="label">Cliente:</span><span class="value">${entry.clientName}</span></div>
  <div class="info-row"><span class="label">Email:</span><span class="value" style="font-size:10px">${success.clientEmail}</span></div>
  <div class="divider"></div>
  <div class="total-section">
    <div class="total-row"><span>TOTAL</span><span>$${(success.totalPrice / success.entries.length).toFixed(2)} USD</span></div>
  </div>
  <div class="qr-section">
    <img src="${qrDataUrl}" alt="QR Code"/>
    <p>Presenta este QR en la entrada</p>
  </div>
  <div class="footer">
    <p class="thanks">Gracias por tu compra!</p>
    <p>PayPal Order: ${success.paypalOrderId}</p>
    <p>Casa Blanca &copy; ${new Date().getFullYear()}</p>
  </div>
</body></html>`

        const printWindow = window.open('', '_blank', 'width=400,height=700')
        if (printWindow) {
          printWindow.document.write(html)
          printWindow.document.close()
        }
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleWhatsApp = () => {
    const message = success.entries.map((entry, i) => {
      const url = `${appUrl}/entradas/validar/${entry.qrToken}`
      return success.entries.length > 1
        ? `${i + 1}. *${entry.clientName}*\n${url}`
        : `*${entry.clientName}*\n${url}`
    }).join('\n\n')

    const fullMessage = `🎟️ *Tu entrada para ${success.eventName}*\n📅 ${eventDateStr}\n💰 $${success.totalPrice.toFixed(2)} USD\n\n${message}\n\nPresenta el QR en la entrada. Te esperamos! 🎉`

    window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, '_blank')
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        {/* Success header */}
        <div className="p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.2)', border: '2px solid rgba(201,168,76,0.4)' }}>
            <svg className="w-8 h-8" style={{ color: '#c9a84c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Compra Exitosa!</h2>
          <p className="text-white/50 text-sm">Tu entrada ha sido enviada por email</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Details */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(10,10,25,0.6)', border: `1px solid ${cardBorder}` }}>
            <div className="flex justify-between"><span className="text-sm text-white/40">Evento</span><span className="text-white font-medium">{success.eventName}</span></div>
            <div style={{ borderTop: `1px solid ${cardBorder}` }} />
            <div className="flex justify-between"><span className="text-sm text-white/40">Fecha</span><span className="font-medium capitalize" style={{ color: '#c9a84c' }}>{eventDateStr}</span></div>
            <div style={{ borderTop: `1px solid ${cardBorder}` }} />
            <div className="flex justify-between"><span className="text-sm text-white/40">Entradas</span><span className="text-white font-bold">{success.entries.length}</span></div>
            <div style={{ borderTop: `1px solid ${cardBorder}` }} />
            <div className="flex justify-between"><span className="text-sm text-white/40">Total Pagado</span><span className="font-bold text-lg" style={{ color: '#c9a84c' }}>${success.totalPrice.toFixed(2)} USD</span></div>
            <div style={{ borderTop: `1px solid ${cardBorder}` }} />
            <div className="flex justify-between"><span className="text-sm text-white/40">Email</span><span className="text-white text-sm">{success.clientEmail}</span></div>
          </div>

          {/* Entry names */}
          {success.entries.length > 1 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(10,10,25,0.6)', border: `1px solid ${cardBorder}` }}>
              <p className="text-xs text-white/30 font-medium mb-1">Entradas:</p>
              {success.entries.map((entry, i) => (
                <div key={entry.entryId} className="flex items-center gap-2">
                  <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold" style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>{i + 1}</span>
                  <span className="text-white text-sm">{entry.clientName}</span>
                </div>
              ))}
            </div>
          )}

          {/* Email sent notice */}
          <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <p className="text-green-400/80 text-sm">Email con QR enviado a <strong>{success.clientEmail}</strong></p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              style={{ background: goldGradient, color: '#0a0a15' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {downloading ? 'Generando...' : 'Descargar / Imprimir Entrada'}
            </button>

            <button
              onClick={handleWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
              </svg>
              Compartir por WhatsApp
            </button>

            <a
              href="/eventos"
              className="block w-full text-center text-white/50 hover:text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${cardBorder}` }}
            >
              Ver mas eventos
            </a>
          </div>

          <p className="text-xs text-white/15 text-center">
            PayPal Order ID: {success.paypalOrderId}
          </p>
        </div>
      </div>
    </div>
  )
}
