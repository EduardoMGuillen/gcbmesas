'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

type EventData = {
  id: string
  name: string
  date: string
  description: string | null
  coverImage: string | null
  coverPrice: number
  onlinePrice: number
}

type PurchaseSuccess = {
  entries: { entryId: string; qrToken: string; clientName: string }[]
  clientEmail: string
  eventName: string
  eventDate: string
  totalPriceLps: number
  paymentReference: string
}

type PaymentMode = 'unknown' | 'unified' | 'direct'
type CardBrand = 'amex' | 'visa' | 'mastercard' | 'unknown'

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
const mutedText = 'rgba(255,255,255,0.55)'

function formatLps(value: number) {
  return `L ${value.toFixed(2)}`
}

function detectCardBrand(digits: string): CardBrand {
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard'
  return 'unknown'
}

function formatCardNumber(value: string, brand: CardBrand) {
  const digits = value.replace(/\D/g, '')
  if (brand === 'amex') {
    const p1 = digits.slice(0, 4)
    const p2 = digits.slice(4, 10)
    const p3 = digits.slice(10, 15)
    return [p1, p2, p3].filter(Boolean).join(' ')
  }
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

export function EventPurchaseClient({ event }: { event: EventData }) {
  const [clientNames, setClientNames] = useState<string[]>([''])
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [numberOfEntries, setNumberOfEntries] = useState(1)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState<PurchaseSuccess | null>(null)
  const [showUnified, setShowUnified] = useState(false)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('unknown')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpMonth, setCardExpMonth] = useState('')
  const [cardExpYear, setCardExpYear] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [billingAddress1, setBillingAddress1] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingPostalCode, setBillingPostalCode] = useState('')
  const [billingCountry, setBillingCountry] = useState('HN')

  const totalPrice = event.onlinePrice * numberOfEntries

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

  const cardNumberDigits = cardNumber.replace(/\D/g, '')
  const cardBrand = detectCardBrand(cardNumberDigits)
  const isAmex = cardBrand === 'amex'
  const cardValid =
    (isAmex ? cardNumberDigits.length === 15 : cardNumberDigits.length === 16) &&
    cardExpMonth.trim().length >= 1 &&
    cardExpYear.trim().length >= 2 &&
    cardCvv.trim().length >= (isAmex ? 4 : 3)
  const billingValid =
    billingAddress1.trim().length > 0 &&
    billingCity.trim().length > 0 &&
    billingState.trim().length > 0 &&
    billingPostalCode.trim().length > 0 &&
    billingCountry.trim().length === 2

  const loadUnifiedScript = async (src: string, integrity?: string | null) => {
    if ((window as any).Accept) return
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.crossOrigin = 'anonymous'
      if (integrity) script.integrity = integrity
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('No se pudo cargar la librería de Unified Checkout'))
      document.body.appendChild(script)
    })
  }

  const startUnifiedCheckout = async (params: {
    paymentReference: string
    captureContext: string
    clientLibrary: string
    clientLibraryIntegrity?: string | null
  }) => {
    setShowUnified(true)
    await loadUnifiedScript(params.clientLibrary, params.clientLibraryIntegrity)
    const acceptFactory = (window as any).Accept
    if (!acceptFactory) throw new Error('Unified Checkout no está disponible en este navegador.')

    const accept = await acceptFactory(params.captureContext)
    const unified = await accept.unifiedPayments(false)
    const transientToken = await unified.show({
      containers: {
        paymentSelection: '#cybs-payment-selection',
        paymentScreen: '#cybs-payment-screen',
      },
    })

    const confirmRes = await fetch('/api/cybersource/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentReference: params.paymentReference,
        eventId: event.id,
        clientEmail: clientEmail.trim(),
        numberOfEntries,
        transientToken,
      }),
    })
    const result = await confirmRes.json()
    if (!confirmRes.ok) throw new Error(result.error || 'Error al confirmar el pago')
    setSuccess(result)
  }

  const startCheckout = async () => {
    setProcessing(true)
    setError('')
    try {
      const res = await fetch('/api/cybersource/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          numberOfEntries,
          clientNames: clientNames.map((n) => n.trim()),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago')

      if (data.mock) {
        const confirmRes = await fetch('/api/cybersource/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentReference: data.paymentReference,
            eventId: event.id,
            clientNames: clientNames.map((n) => n.trim()),
            clientEmail: clientEmail.trim(),
            clientPhone: clientPhone.trim() || undefined,
            numberOfEntries,
          }),
        })
        const result = await confirmRes.json()
        if (!confirmRes.ok) throw new Error(result.error || 'Error al confirmar el pago')
        setSuccess(result)
        return
      }

      if (data.directMode && data.paymentReference) {
        setPaymentMode('direct')
        if (!cardValid) {
          throw new Error('Completa los datos de tarjeta para pago directo (sandbox).')
        }
        if (!billingValid) {
          throw new Error('Completa los datos mínimos de facturación para pago directo.')
        }
        const confirmRes = await fetch('/api/cybersource/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentReference: data.paymentReference,
            eventId: event.id,
            clientEmail: clientEmail.trim(),
            numberOfEntries,
            cardHolderName: cardHolderName.trim() || clientNames[0]?.trim() || 'Test Merchant',
            cardNumber: cardNumberDigits,
            cardExpMonth: cardExpMonth.trim(),
            cardExpYear: cardExpYear.trim(),
            cardCvv: cardCvv.trim(),
            billToAddress1: billingAddress1.trim(),
            billToLocality: billingCity.trim(),
            billToAdministrativeArea: billingState.trim(),
            billToPostalCode: billingPostalCode.trim(),
            billToCountry: billingCountry.trim().toUpperCase(),
          }),
        })
        const result = await confirmRes.json()
        if (!confirmRes.ok) throw new Error(result.error || 'Error al confirmar el pago directo')
        setSuccess(result)
        return
      }

      if (data.captureContext && data.paymentReference && data.clientLibrary) {
        setPaymentMode('unified')
        await startUnifiedCheckout({
          paymentReference: String(data.paymentReference),
          captureContext: String(data.captureContext),
          clientLibrary: String(data.clientLibrary),
          clientLibraryIntegrity: data.clientLibraryIntegrity ? String(data.clientLibraryIntegrity) : null,
        })
        return
      }

      throw new Error('CyberSource no devolvió datos válidos de Unified Checkout')
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago')
    } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return <ConfirmationView success={success} event={event} />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <span className="text-2xl font-bold" style={{ color: '#c9a84c' }}>{formatLps(event.onlinePrice)}</span>
          </div>
          <p className="text-xs text-white/20">Precio online en Lempiras (HNL)</p>
        </div>
      </div>

      <div className="rounded-2xl p-5 sm:p-6 h-fit" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Comprar Entrada</h3>
            <p className="text-xs" style={{ color: mutedText }}>Completa tus datos y paga de forma segura</p>
          </div>
          <div
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(201,168,76,0.18)', color: '#e8d18d', border: '1px solid rgba(201,168,76,0.35)' }}
          >
            Paso 1 de 2
          </div>
        </div>
        <div className="w-12 h-0.5 mb-5" style={{ background: goldGradient }} />
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/50 mb-2">Cantidad de entradas</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQtyChange(Math.max(1, numberOfEntries - 1))}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-white hover:opacity-80 transition-colors text-lg font-semibold"
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              >-</button>
              <input
                type="number"
                min={1}
                max={10}
                value={numberOfEntries}
                onChange={(e) => handleQtyChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-24 text-center px-3 py-2.5 rounded-lg text-white focus:outline-none text-base font-semibold"
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              />
              <button
                type="button"
                onClick={() => handleQtyChange(Math.min(10, numberOfEntries + 1))}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-white hover:opacity-80 transition-colors text-lg font-semibold"
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              >+</button>
            </div>
          </div>

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
            />
          </div>

          <div className="rounded-lg p-4 space-y-3" style={{ background: inputBg, border: `1px solid ${inputBorder}` }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white/80">Tarjeta (modo directo sandbox)</p>
              <span className="text-[11px] text-white/40">
                {paymentMode === 'direct' ? 'Activo' : paymentMode === 'unified' ? 'Fallback' : 'Auto'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide"
                style={{
                  background: cardBrand === 'visa' ? 'rgba(26, 87, 220, 0.32)' : 'rgba(26, 87, 220, 0.2)',
                  color: '#9ec2ff',
                  border: cardBrand === 'visa' ? '1px solid rgba(145,190,255,0.8)' : '1px solid rgba(26,87,220,0.45)',
                }}
              >
                VISA
              </div>
              <div
                className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5"
                style={{
                  background: cardBrand === 'mastercard' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  color: '#f4f4f5',
                  border: cardBrand === 'mastercard' ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#eb001b' }} />
                <span className="inline-block w-2.5 h-2.5 rounded-full -ml-1.5" style={{ background: '#f79e1b' }} />
                MASTERCARD
              </div>
              <div
                className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide"
                style={{
                  background: cardBrand === 'amex' ? 'rgba(0, 153, 204, 0.32)' : 'rgba(0, 153, 204, 0.2)',
                  color: '#93e5ff',
                  border: cardBrand === 'amex' ? '1px solid rgba(147,229,255,0.8)' : '1px solid rgba(0,153,204,0.45)',
                }}
              >
                AMEX
              </div>
            </div>
            <input
              type="text"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
              placeholder="Nombre del titular"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={formatCardNumber(cardNumber, cardBrand)}
              onChange={(e) => {
                const rawDigits = e.target.value.replace(/\D/g, '')
                const nextBrand = detectCardBrand(rawDigits)
                const maxLen = nextBrand === 'amex' ? 15 : 16
                setCardNumber(rawDigits.slice(0, maxLen))
              }}
              placeholder="Número de tarjeta"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp-month"
                value={cardExpMonth}
                onChange={(e) => setCardExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="MM"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp-year"
                value={cardExpYear}
                onChange={(e) => setCardExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="YYYY"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
              />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, isAmex ? 4 : 3))}
                placeholder={isAmex ? 'CID' : 'CVV'}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
              />
            </div>
            <p className="text-[11px] text-white/35">
              En modo sandbox directo, estos datos se envían al backend para prueba técnica.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={billingAddress1}
                onChange={(e) => setBillingAddress1(e.target.value)}
                placeholder="Dirección *"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none sm:col-span-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
              />
              <input
                type="text"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                placeholder="Ciudad *"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
              />
              <input
                type="text"
                value={billingState}
                onChange={(e) => setBillingState(e.target.value)}
                placeholder="Departamento/Estado *"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
              />
              <input
                type="text"
                value={billingPostalCode}
                onChange={(e) => setBillingPostalCode(e.target.value)}
                placeholder="Código postal *"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
              />
              <input
                type="text"
                value={billingCountry}
                onChange={(e) => setBillingCountry(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))}
                placeholder="País ISO2 (ej. HN) *"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${inputBorder}` }}
              />
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40">Total a pagar</span>
              <span className="text-2xl font-bold" style={{ color: '#c9a84c' }}>{formatLps(totalPrice)}</span>
            </div>
            <p className="text-xs text-white/20 mt-1">{numberOfEntries} entrada{numberOfEntries > 1 ? 's' : ''} x {formatLps(event.onlinePrice)}</p>
            <div className="mt-3 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(35, (numberOfEntries / 10) * 100))}%`,
                  background: goldGradient,
                }}
              />
            </div>
          </div>

          {showUnified && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                background: 'rgba(16, 27, 48, 0.8)',
                border: '1px solid rgba(59,130,246,0.35)',
                boxShadow: '0 0 0 1px rgba(59,130,246,0.1) inset',
              }}
            >
              <p className="text-sm font-medium text-blue-200">Paso 2 de 2: Completa el pago en CyberSource</p>
              <div id="cybs-payment-selection" className="min-h-[56px]" />
              <div id="cybs-payment-screen" className="min-h-[220px]" />
            </div>
          )}

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}

          {processing ? (
            <div className="text-center py-4">
              <div className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-2" style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }} />
              <p className="text-sm text-white/40">Procesando pago...</p>
            </div>
          ) : formValid ? (
            <button
              type="button"
              onClick={startCheckout}
              className="w-full font-semibold py-3 px-4 rounded-lg transition-all hover:opacity-90 shadow-[0_10px_30px_rgba(201,168,76,0.25)]"
              style={{ background: goldGradient, color: '#0a0a15' }}
            >
              Pagar con CyberSource
            </button>
          ) : (
            <div className="rounded-lg p-4 text-center" style={{ background: inputBg, border: `1px solid ${inputBorder}` }}>
              <p className="text-sm text-white/30">Completa tu nombre y email para continuar</p>
            </div>
          )}

          <p className="text-xs text-white/25 text-center">
            Pago seguro a traves de CyberSource. Al pagar, recibiras tu entrada por email automaticamente.
          </p>
        </div>
      </div>
    </div>
  )
}

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
      const pricePerEntry = (success.totalPriceLps / success.entries.length).toFixed(2)

      const ticketSections = await Promise.all(
        success.entries.map(async (entry, i) => {
          const validationUrl = `${appUrl}/entradas/validar/${entry.qrToken}`
          const qrDataUrl = await generateQRDataUrl(validationUrl)
          return `
            <div class="ticket${i > 0 ? ' page-break' : ''}">
              <div class="header"><img src="${logoUrl}" alt="Casa Blanca"/><p>Comprobante de Entrada</p></div>
              <div class="title">${success.eventName}</div>
              <div class="event-date">${eventDateStr}</div>
              <div class="divider"></div>
              <div class="info-row"><span class="label">Cliente:</span><span class="value">${entry.clientName}</span></div>
              <div class="info-row"><span class="label">Email:</span><span class="value" style="font-size:10px">${success.clientEmail}</span></div>
              ${success.entries.length > 1 ? `<div class="info-row"><span class="label">Entrada:</span><span class="value">${i + 1} de ${success.entries.length}</span></div>` : ''}
              <div class="divider"></div>
              <div class="total-section">
                <div class="total-row"><span>TOTAL</span><span>L ${pricePerEntry}</span></div>
              </div>
              <div class="qr-section">
                <img src="${qrDataUrl}" alt="QR Code"/>
                <p>Presenta este QR en la entrada</p>
              </div>
              <div class="footer">
                <p class="thanks">Gracias por tu compra!</p>
                <p>Casa Blanca &copy; ${new Date().getFullYear()}</p>
              </div>
            </div>`
        })
      )

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Entradas - ${success.eventName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:302px;margin:0 auto;padding:16px 12px;color:#000;background:#fff}
  .ticket{margin-bottom:20px}.header{text-align:center;border-bottom:2px dashed #000;padding-bottom:12px;margin-bottom:12px}
  .header img{width:120px;height:120px;object-fit:contain}.title{text-align:center;font-size:14px;font-weight:bold;padding:8px 0;border-bottom:1px dashed #999;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px}
  .event-date{text-align:center;font-size:11px;color:#555;margin-top:-6px;margin-bottom:10px;text-transform:capitalize}
  .info-row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}.info-row .label{color:#555}.info-row .value{font-weight:bold;text-align:right;max-width:60%}
  .divider{border-top:1px dashed #999;margin:10px 0}.total-section{border-top:2px solid #000;margin-top:8px;padding-top:8px}
  .total-row{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;padding:4px 0}
  .qr-section{text-align:center;padding:14px 0;border-top:1px dashed #999;margin-top:12px}.qr-section img{width:180px;height:180px}.qr-section p{font-size:10px;color:#666;margin-top:6px}
  .footer{text-align:center;border-top:2px dashed #000;padding-top:12px;margin-top:12px;font-size:11px;color:#555}.footer .thanks{font-size:13px;font-weight:bold;color:#000;margin-bottom:4px}
  .page-break{border-top:3px dashed #000;padding-top:20px;margin-top:20px}
  @media print{.page-break{page-break-before:always;border-top:none;margin-top:0;padding-top:16px} body{width:100%;padding:0 8px}}
</style></head><body>${ticketSections.join('')}</body></html>`

      const printWindow = window.open('', '_blank', 'width=400,height=700')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleWhatsApp = () => {
    const message = success.entries.map((entry, i) => {
      const url = `${appUrl}/entradas/validar/${entry.qrToken}`
      return success.entries.length > 1 ? `${i + 1}. *${entry.clientName}*\n${url}` : `*${entry.clientName}*\n${url}`
    }).join('\n\n')
    const fullMessage = `🎟️ *Tu entrada para ${success.eventName}*\n📅 ${eventDateStr}\n💰 L ${success.totalPriceLps.toFixed(2)}\n\n${message}\n\nPresenta el QR en la entrada. Te esperamos! 🎉`
    window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, '_blank')
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
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
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(10,10,25,0.6)', border: `1px solid ${cardBorder}` }}>
            <div className="flex justify-between"><span className="text-sm text-white/40">Evento</span><span className="text-white font-medium">{success.eventName}</span></div>
            <div style={{ borderTop: `1px solid ${cardBorder}` }} />
            <div className="flex justify-between"><span className="text-sm text-white/40">Fecha</span><span className="font-medium capitalize" style={{ color: '#c9a84c' }}>{eventDateStr}</span></div>
            <div style={{ borderTop: `1px solid ${cardBorder}` }} />
            <div className="flex justify-between"><span className="text-sm text-white/40">Entradas</span><span className="text-white font-bold">{success.entries.length}</span></div>
            <div style={{ borderTop: `1px solid ${cardBorder}` }} />
            <div className="flex justify-between"><span className="text-sm text-white/40">Total Pagado</span><span className="font-bold text-lg" style={{ color: '#c9a84c' }}>{formatLps(success.totalPriceLps)}</span></div>
            <div style={{ borderTop: `1px solid ${cardBorder}` }} />
            <div className="flex justify-between"><span className="text-sm text-white/40">Email</span><span className="text-white text-sm">{success.clientEmail}</span></div>
          </div>

          {success.entries.length > 1 && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(10,10,25,0.6)', border: `1px solid ${cardBorder}` }}>
              <p className="text-sm font-semibold text-white mb-2">Entradas emitidas</p>
              <div className="space-y-2">
                {success.entries.map((entry, index) => (
                  <div key={entry.entryId} className="flex items-center justify-between text-sm">
                    <span className="text-white/45">Entrada {index + 1}</span>
                    <span className="text-white font-medium truncate max-w-[70%] text-right">{entry.clientName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              style={{ background: goldGradient, color: '#0a0a15' }}
            >
              {downloading ? 'Generando...' : 'Descargar / Imprimir Entrada'}
            </button>

            <button
              onClick={handleWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
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
            Referencia: {success.paymentReference}
          </p>
        </div>
      </div>
    </div>
  )
}
