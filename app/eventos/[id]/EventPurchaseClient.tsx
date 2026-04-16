'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'

type EventData = {
  id: string
  name: string
  date: string
  description: string | null
  coverImage: string | null
  coverPrice: number
  onlinePrice: number
  maxEntries: number | null
  entriesSoldSum: number
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

export type EventPurchaseVariant = 'lcb' | 'cbtickets'

export type PurchasePalette = ReturnType<typeof getPurchasePalette>

function getPurchasePalette(variant: EventPurchaseVariant) {
  const isLight = variant === 'cbtickets'
  return {
    isLight,
    goldGradient: 'linear-gradient(135deg, #c9a84c, #a88a3d)',
    cardBg: isLight ? 'rgba(255, 252, 248, 0.97)' : 'rgba(15, 15, 30, 0.8)',
    cardBorder: isLight ? 'rgba(176, 145, 80, 0.32)' : 'rgba(255,255,255,0.06)',
    inputBg: isLight ? '#ffffff' : 'rgba(10,10,25,0.9)',
    inputBorder: isLight ? 'rgba(176, 145, 80, 0.45)' : 'rgba(255,255,255,0.1)',
    mutedText: isLight ? 'rgba(41, 37, 36, 0.62)' : 'rgba(255,255,255,0.55)',
    innerPanelBg: isLight ? 'rgba(254, 252, 249, 0.96)' : 'rgba(10,10,25,0.6)',
    chipPaso: isLight
      ? { background: 'rgba(201,168,76,0.14)', color: '#5c4a1c', border: '1px solid rgba(201,168,76,0.42)' }
      : { background: 'rgba(201,168,76,0.18)', color: '#e8d18d', border: '1px solid rgba(201,168,76,0.35)' },
    linkCta: isLight
      ? { background: 'linear-gradient(135deg, #d4af37, #8b6914)', color: '#1a1510', boxShadow: '0 4px 20px rgba(180,140,60,0.22)' }
      : { background: 'linear-gradient(45deg, #00ffff, #a855f7)', color: '#0a0a15', boxShadow: '0 4px 20px rgba(0,255,255,0.2)' },
    fieldRim: isLight ? 'rgba(252, 249, 244, 0.98)' : 'rgba(255,255,255,0.03)',
    inputFieldClass: isLight
      ? 'text-stone-900 placeholder:text-stone-400 focus:ring-amber-400/35'
      : 'text-white placeholder:text-white/20 focus:ring-cyan-500/25',
    qtyBtnClass: isLight ? 'text-stone-800' : 'text-white',
    unifiedPanel: isLight
      ? {
          background: 'rgba(255,252,248,0.97)',
          border: '1px solid rgba(176,145,80,0.38)',
          boxShadow: '0 0 0 1px rgba(176,145,80,0.12) inset',
        }
      : {
          background: 'rgba(16, 27, 48, 0.8)',
          border: '1px solid rgba(59,130,246,0.35)',
          boxShadow: '0 0 0 1px rgba(59,130,246,0.1) inset',
        },
    tx: {
      h2: isLight ? 'text-stone-900' : 'text-white',
      h3: isLight ? 'text-stone-900' : 'text-white',
      body: isLight ? 'text-stone-600' : 'text-white/40',
      label: isLight ? 'text-stone-600' : 'text-white/50',
      faint: isLight ? 'text-stone-500' : 'text-white/20',
      vfaint: isLight ? 'text-stone-400' : 'text-white/25',
      hint: isLight ? 'text-stone-500' : 'text-white/30',
      row: isLight ? 'text-stone-500' : 'text-white/40',
      entryRow: isLight ? 'text-stone-500' : 'text-white/45',
      successSub: isLight ? 'text-stone-600' : 'text-white/50',
      moreEvents: isLight ? 'text-stone-600 hover:text-stone-900' : 'text-white/50 hover:text-white',
      ref: isLight ? 'text-stone-400' : 'text-white/15',
      directTitle: isLight ? 'text-stone-800' : 'text-white/80',
      directBadge: isLight ? 'text-stone-500' : 'text-white/40',
      unifiedLead: isLight ? 'text-sm font-medium text-amber-900' : 'text-sm font-medium text-blue-200',
      unifiedLbl: isLight ? 'text-xs text-amber-900/80' : 'text-xs text-blue-100/80',
      unifiedFoot: isLight ? 'text-xs text-amber-900/75' : 'text-xs text-blue-100/70',
    },
  }
}

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

export function EventPurchaseClient({
  event,
  eventsListPath = '/eventos',
  variant = 'lcb',
}: {
  event: EventData
  /** Listado público del canal (ej. `/eventos` o `/cbtickets`). No altera el POST a CyberSource. */
  eventsListPath?: string
  /** `cbtickets`: UI clara blanco/dorado. No altera CyberSource. */
  variant?: EventPurchaseVariant
}) {
  const p = getPurchasePalette(variant)
  const [clientNames, setClientNames] = useState<string[]>([''])
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [numberOfEntries, setNumberOfEntries] = useState(1)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState<PurchaseSuccess | null>(null)
  const [showUnified, setShowUnified] = useState(false)
  const [microformReady, setMicroformReady] = useState(false)
  const [microformPaymentReference, setMicroformPaymentReference] = useState('')
  const [microformExpMonth, setMicroformExpMonth] = useState('')
  const [microformExpYear, setMicroformExpYear] = useState('')
  const [microformCardType, setMicroformCardType] = useState('')
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
  const microformRef = useRef<any>(null)
  /** Flex Field instances — must call .unload() before React removes #cybs-card-* hosts (avoids removeChild crashes). */
  const microformFieldRefs = useRef<{ number: any; cvv: any } | null>(null)
  const challengeCompleteLockRef = useRef(false)

  // 3DS challenge state
  const [show3dsChallenge, setShow3dsChallenge] = useState(false)
  const [challengeStepUpUrl, setChallengeStepUpUrl] = useState('')
  const [challengeAccessToken, setChallengeAccessToken] = useState('')
  const [challengeAuthTransactionId, setChallengeAuthTransactionId] = useState('')
  // Stores the data needed to complete confirm-payment after the challenge finishes
  const challengePendingRef = useRef<{
    transientToken: string
    paymentRef: string
    paymentCardType: string
    clientEmail: string
    numberOfEntries: number
    cardHolderName: string
    billingAddress1: string
    billingCity: string
    billingState: string
    billingPostalCode: string
    billingCountry: string
  } | null>(null)
  const challengeFormRef = useRef<HTMLFormElement>(null)
  const challengeIframeRef = useRef<HTMLIFrameElement>(null)

  const totalPrice = event.onlinePrice * numberOfEntries

  const remainingOnline =
    event.maxEntries != null && event.maxEntries >= 1
      ? Math.max(0, event.maxEntries - event.entriesSoldSum)
      : null
  const onlineSoldOut = remainingOnline !== null && remainingOnline < 1
  const maxQtyThisCheckout =
    remainingOnline === null ? 10 : Math.min(10, Math.max(1, remainingOnline))

  const eventDateStr = new Date(event.date).toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  const handleQtyChange = (newQty: number) => {
    if (onlineSoldOut) return
    let capped = Math.max(1, newQty)
    capped = Math.min(capped, maxQtyThisCheckout)
    setNumberOfEntries(capped)
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
  const microformProfileValid = cardHolderName.trim().length > 0 && billingValid

  const teardownUnifiedMicroform = useCallback(() => {
    const fields = microformFieldRefs.current
    if (fields) {
      try {
        if (typeof fields.number?.unload === 'function') fields.number.unload()
      } catch {
        /* ignore */
      }
      try {
        if (typeof fields.cvv?.unload === 'function') fields.cvv.unload()
      } catch {
        /* ignore */
      }
      microformFieldRefs.current = null
    }
    microformRef.current = null
    const clearHost = (id: string) => {
      const el = document.getElementById(id)
      if (!el) return
      try {
        el.replaceChildren()
      } catch {
        try {
          el.innerHTML = ''
        } catch {
          /* ignore */
        }
      }
    }
    clearHost('cybs-card-number')
    clearHost('cybs-card-cvv')
  }, [])

  const scheduleClose3dsModal = useCallback(() => {
    try {
      if (challengeIframeRef.current) {
        challengeIframeRef.current.src = 'about:blank'
      }
    } catch {
      /* ignore */
    }
    requestAnimationFrame(() => {
      setShow3dsChallenge(false)
    })
  }, [])

  const loadUnifiedScript = async (src: string, integrity?: string | null) => {
    if ((window as any).Flex) return
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.crossOrigin = 'anonymous'
      if (integrity) script.integrity = integrity
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('No se pudo cargar la librería de Microform'))
      document.body.appendChild(script)
    })
  }

  const startUnifiedCheckout = async (params: {
    paymentReference: string
    captureContext: string
    clientLibrary: string
    clientLibraryIntegrity?: string | null
  }) => {
    teardownUnifiedMicroform()
    setShowUnified(true)
    setMicroformReady(false)
    setMicroformPaymentReference(params.paymentReference)
    await loadUnifiedScript(params.clientLibrary, params.clientLibraryIntegrity)
    const FlexCtor = (window as any).Flex
    if (!FlexCtor) throw new Error('La librería de CyberSource Microform no está disponible en este navegador.')

    const flex = new FlexCtor(params.captureContext)
    await new Promise((resolve) => setTimeout(resolve, 0))
    const microform = flex.microform({
      styles: {
        input: {
          color: p.isLight ? '#111827' : '#ffffff',
          'font-size': '16px',
          'font-family': 'Arial, sans-serif',
        },
        ':focus': {
          color: p.isLight ? '#111827' : '#ffffff',
        },
        valid: {
          color: p.isLight ? '#166534' : '#86efac',
        },
        invalid: {
          color: p.isLight ? '#b91c1c' : '#fca5a5',
        },
      },
    })
    const numberField = microform.createField('number', {
      placeholder: 'Número de tarjeta',
    })
    const securityCodeField = microform.createField('securityCode', {
      placeholder: 'CVV',
    })
    numberField.load('#cybs-card-number')
    securityCodeField.load('#cybs-card-cvv')
    numberField.on('change', (data: any) => {
      const firstCard = data?.card?.[0]
      const typeFromField = String(firstCard?.cybsCardType || firstCard?.type || '').trim()
      if (typeFromField) {
        setMicroformCardType(typeFromField)
      }
    })
    microformFieldRefs.current = { number: numberField, cvv: securityCodeField }
    microformRef.current = microform
    setMicroformReady(true)
  }

  const confirmUnifiedMicroformPayment = async () => {
    if (!microformRef.current || !microformReady) {
      throw new Error('Microform no está listo todavía.')
    }
    if (!microformProfileValid) {
      throw new Error('Completa nombre del titular y datos de facturación.')
    }

    // Fix #2: zero-pad month so "3" becomes "03" as CyberSource expects
    const expMonth = microformExpMonth.trim().replace(/\D/g, '').slice(0, 2).padStart(2, '0')
    const expYear = microformExpYear.trim().replace(/\D/g, '').slice(0, 4)
    if (!expMonth || expMonth === '00' || !expYear) {
      throw new Error('Completa mes y año de expiración de la tarjeta.')
    }

    // Tokenize card — detect context-expiry errors so we can give a clear message
    const transientToken = await new Promise<string>((resolve, reject) => {
      let settled = false
      const settle = (fn: typeof resolve | typeof reject, val: any) => {
        if (!settled) { settled = true; fn(val) }
      }

      const maybePromise = microformRef.current.createToken(
        { expirationMonth: expMonth, expirationYear: expYear },
        (error: any, token: string) => {
          if (error) {
            const msg = String(error?.message || error?.details || JSON.stringify(error) || '')
            const isExpired = /expir|invalid.*context|context.*invalid/i.test(msg)
            const err = Object.assign(
              new Error(isExpired
                ? 'La sesión de pago expiró. Ingresa tus datos de tarjeta nuevamente.'
                : (msg || 'No se pudo tokenizar la tarjeta.')),
              { expired: isExpired }
            )
            settle(reject, err)
            return
          }
          settle(resolve, String(token))
        }
      )
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise
          .then((token: string) => settle(resolve, String(token)))
          .catch((err: any) => {
            const msg = String(err?.message || '')
            const isExpired = /expir|invalid.*context|context.*invalid/i.test(msg)
            settle(reject, Object.assign(
              new Error(isExpired
                ? 'La sesión de pago expiró. Ingresa tus datos de tarjeta nuevamente.'
                : (msg || 'No se pudo tokenizar la tarjeta.')),
              { expired: isExpired }
            ))
          })
      }
    }).catch((err: any) => {
      // Fix #6: on expiry, reset the microform so user can re-enter card without reloading the page
      if (err?.expired) {
        teardownUnifiedMicroform()
        requestAnimationFrame(() => {
          setShowUnified(false)
          setMicroformReady(false)
          setMicroformPaymentReference('')
          setMicroformExpMonth('')
          setMicroformExpYear('')
          setMicroformCardType('')
        })
      }
      throw err
    })

    // Fix #4 & #5: structured payer-auth error handling — only network failures are silenced
    let payerAuthResult: any = null
    let payerAuthResponse: Response | null = null
    try {
      const browserInfo = {
        browserLanguage: navigator.language || 'en-US',
        browserUserAgent: navigator.userAgent,
        browserAcceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        browserJavascriptEnabled: true,
        browserJavaEnabled: typeof navigator.javaEnabled === 'function' ? navigator.javaEnabled() : false,
        browserColorDepth: String(window.screen.colorDepth || 24),
        browserScreenHeight: String(window.screen.height || 900),
        browserScreenWidth: String(window.screen.width || 1440),
        browserTimeZone: String(new Date().getTimezoneOffset()),
      }

      payerAuthResponse = await fetch('/api/cybersource/payer-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReference: microformPaymentReference,
          eventId: event.id,
          clientEmail: clientEmail.trim(),
          numberOfEntries,
          transientToken,
          cardHolderName: cardHolderName.trim(),
          billToAddress1: billingAddress1.trim(),
          billToLocality: billingCity.trim(),
          billToAdministrativeArea: billingState.trim(),
          billToPostalCode: billingPostalCode.trim(),
          billToCountry: billingCountry.trim().toUpperCase(),
          paymentCardType: microformCardType || undefined,
          browserInfo,
        }),
      })
    } catch {
      // True network failure (DNS, timeout) — continue without 3DS rather than blocking payment
      console.warn('[CyberSource] Payer auth unreachable (network error), continuing without 3DS.')
    }

    if (payerAuthResponse) {
      const rawPayerAuth = await payerAuthResponse.json()

      if (!payerAuthResponse.ok) {
        // HTTP error from our own API route — surface it to the user
        throw new Error(rawPayerAuth?.error || `Error en validación 3DS (${payerAuthResponse.status})`)
      }

      if (rawPayerAuth?.status === 'challenge_required') {
        // Fix #1: store everything needed and open the ACS challenge iframe modal
        challengePendingRef.current = {
          transientToken,
          paymentRef: microformPaymentReference,
          paymentCardType: rawPayerAuth?.paymentCardType || microformCardType || '',
          clientEmail: clientEmail.trim(),
          numberOfEntries,
          cardHolderName: cardHolderName.trim(),
          billingAddress1: billingAddress1.trim(),
          billingCity: billingCity.trim(),
          billingState: billingState.trim(),
          billingPostalCode: billingPostalCode.trim(),
          billingCountry: billingCountry.trim().toUpperCase(),
        }
        setChallengeAuthTransactionId(rawPayerAuth?.authenticationTransactionId || '')
        setChallengeStepUpUrl(rawPayerAuth?.stepUpUrl || '')
        setChallengeAccessToken(rawPayerAuth?.accessToken || '')
        setShow3dsChallenge(true)
        return // challenge modal takes over; handleChallengeComplete finishes the flow
      }

      if (rawPayerAuth?.status === 'failed') {
        throw new Error(
          rawPayerAuth?.reason ||
          'La autenticación 3DS de la tarjeta falló. Intenta con otra tarjeta o consulta a tu banco.'
        )
      }

      // 'authenticated' → pass 3DS data through; 'unavailable'/'skipped'/enabled:false → no 3DS data
      if (rawPayerAuth?.status === 'authenticated' && rawPayerAuth?.consumerAuthenticationInformation) {
        payerAuthResult = rawPayerAuth
      }
    }

    await submitConfirmPayment({
      transientToken,
      payerAuthResult,
      paymentRef: microformPaymentReference,
      storedClientEmail: clientEmail.trim(),
      storedNumberOfEntries: numberOfEntries,
      storedCardHolderName: cardHolderName.trim(),
      storedBillingAddress1: billingAddress1.trim(),
      storedBillingCity: billingCity.trim(),
      storedBillingState: billingState.trim(),
      storedBillingPostalCode: billingPostalCode.trim(),
      storedBillingCountry: billingCountry.trim().toUpperCase(),
    })
  }

  // Shared helper — called from both the normal flow and the post-challenge flow
  const submitConfirmPayment = async ({
    transientToken,
    payerAuthResult,
    paymentRef,
    storedClientEmail,
    storedNumberOfEntries,
    storedCardHolderName,
    storedBillingAddress1,
    storedBillingCity,
    storedBillingState,
    storedBillingPostalCode,
    storedBillingCountry,
  }: {
    transientToken: string
    payerAuthResult: any
    paymentRef: string
    storedClientEmail: string
    storedNumberOfEntries: number
    storedCardHolderName: string
    storedBillingAddress1: string
    storedBillingCity: string
    storedBillingState: string
    storedBillingPostalCode: string
    storedBillingCountry: string
  }) => {
    const confirmRes = await fetch('/api/cybersource/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentReference: paymentRef,
        eventId: event.id,
        clientEmail: storedClientEmail,
        numberOfEntries: storedNumberOfEntries,
        transientToken,
        cardHolderName: storedCardHolderName,
        billToAddress1: storedBillingAddress1,
        billToLocality: storedBillingCity,
        billToAdministrativeArea: storedBillingState,
        billToPostalCode: storedBillingPostalCode,
        billToCountry: storedBillingCountry,
        paymentCardType: payerAuthResult?.paymentCardType || microformCardType || undefined,
        commerceIndicator: payerAuthResult?.commerceIndicator || undefined,
        consumerAuthenticationInformation: payerAuthResult?.consumerAuthenticationInformation || undefined,
      }),
    })
    const result = await confirmRes.json()
    if (!confirmRes.ok) throw new Error(result.error || 'Error al confirmar el pago')
    teardownUnifiedMicroform()
    requestAnimationFrame(() => setSuccess(result))
  }

  // Called when the ACS step-up iframe fires the CYBS_3DS_COMPLETE postMessage
  const handleChallengeComplete = useCallback(async () => {
    if (challengeCompleteLockRef.current) return
    challengeCompleteLockRef.current = true
    scheduleClose3dsModal()
    const pending = challengePendingRef.current
    if (!pending) {
      challengeCompleteLockRef.current = false
      return
    }
    challengePendingRef.current = null

    setProcessing(true)
    setError('')
    try {
      let payerAuthResult: any = null

      // Fetch the final CAVV/ECI now that the challenge is done
      if (challengeAuthTransactionId) {
        const resultRes = await fetch('/api/cybersource/payer-auth-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authenticationTransactionId: challengeAuthTransactionId,
            paymentCardType: pending.paymentCardType || '',
          }),
        })
        const resultData = await resultRes.json()
        if (!resultRes.ok) throw new Error(resultData?.error || 'Error al obtener resultado 3DS del challenge.')
        if (resultData?.status === 'authenticated' && resultData?.consumerAuthenticationInformation) {
          payerAuthResult = resultData
        }
      }

      await submitConfirmPayment({
        transientToken: pending.transientToken,
        payerAuthResult,
        paymentRef: pending.paymentRef,
        storedClientEmail: pending.clientEmail,
        storedNumberOfEntries: pending.numberOfEntries,
        storedCardHolderName: pending.cardHolderName,
        storedBillingAddress1: pending.billingAddress1,
        storedBillingCity: pending.billingCity,
        storedBillingState: pending.billingState,
        storedBillingPostalCode: pending.billingPostalCode,
        storedBillingCountry: pending.billingCountry,
      })
    } catch (err: any) {
      setError(err.message || 'Error al completar el pago con 3DS.')
    } finally {
      setProcessing(false)
      challengeCompleteLockRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeAuthTransactionId, event.id, scheduleClose3dsModal])

  // Listen for the postMessage fired by the 3DS callback route
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'CYBS_3DS_COMPLETE') {
        handleChallengeComplete()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [handleChallengeComplete])

  // Auto-submit the hidden form into the challenge iframe as soon as it mounts
  useEffect(() => {
    if (show3dsChallenge && challengeStepUpUrl && challengeFormRef.current) {
      challengeFormRef.current.submit()
    }
  }, [show3dsChallenge, challengeStepUpUrl])

  useEffect(() => () => teardownUnifiedMicroform(), [teardownUnifiedMicroform])

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

  const handlePayClick = async () => {
    setProcessing(true)
    setError('')
    try {
      if (paymentMode === 'unified' && showUnified && microformReady && microformPaymentReference) {
        await confirmUnifiedMicroformPayment()
        return
      }
      await startCheckout()
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago')
    } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return <ConfirmationView success={success} event={event} eventsListPath={eventsListPath} palette={p} />
  }

  if (onlineSoldOut) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4">
        <h3 className={`text-xl font-semibold mb-2 ${p.tx.h3}`}>Cupo agotado</h3>
        <p className={`${p.tx.successSub} text-sm mb-6`}>
          Las entradas en línea para este evento ya no están disponibles.
        </p>
        <Link
          href={eventsListPath}
          className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-105"
          style={p.linkCta}
        >
          Ver otros eventos
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 3DS Challenge Modal — shown when the issuing bank requires an ACS step-up */}
      {show3dsChallenge && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '16px',
          }}
        >
          <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, textAlign: 'center', maxWidth: 440 }}>
            Tu banco requiere verificación adicional (3DS).
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textAlign: 'center', maxWidth: 400, marginTop: -8 }}>
            Completa el proceso en la ventana de abajo para finalizar tu pago.
          </p>
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              width: '100%',
              maxWidth: 440,
              minHeight: 400,
            }}
          >
            <iframe
              ref={challengeIframeRef}
              name="cybs-step-up-iframe"
              style={{ width: '100%', height: 520, border: 'none', display: 'block' }}
              title="Verificación 3DS"
            />
          </div>
          {/* Hidden form that POSTs the JWT into the iframe to start the ACS challenge */}
          <form
            ref={challengeFormRef}
            method="POST"
            action={challengeStepUpUrl}
            target="cybs-step-up-iframe"
            style={{ display: 'none' }}
          >
            <input type="hidden" name="JWT" value={challengeAccessToken} />
          </form>
          <button
            type="button"
            onClick={() => {
              scheduleClose3dsModal()
              challengePendingRef.current = null
              challengeCompleteLockRef.current = false
              setError('Verificación 3DS cancelada. Puedes intentarlo de nuevo.')
            }}
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '13px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            Cancelar verificación
          </button>
        </div>
      )}
      <div>
        {event.coverImage && (
          <div className="aspect-[4/5] rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid ${p.cardBorder}` }}>
            <img src={event.coverImage} alt={event.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${p.tx.h2}`}>{event.name}</h2>
        <p className="font-medium mb-4 capitalize" style={{ color: '#c9a84c' }}>{eventDateStr}</p>
        {event.description && (
          <p className={`${p.tx.body} text-sm leading-relaxed mb-6 whitespace-pre-line`}>{event.description}</p>
        )}
        <div className="rounded-xl p-5" style={{ background: p.cardBg, border: `1px solid ${p.cardBorder}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className={p.tx.body}>Precio por entrada</span>
            <span className="text-2xl font-bold" style={{ color: '#c9a84c' }}>{formatLps(event.onlinePrice)}</span>
          </div>
          <p className={`text-xs ${p.tx.faint}`}>Precio online en Lempiras (HNL)</p>
        </div>
      </div>

      <div className="rounded-2xl p-5 sm:p-6 h-fit" style={{ background: p.cardBg, border: `1px solid ${p.cardBorder}` }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className={`text-lg font-bold mb-1 ${p.tx.h3}`}>Comprar Entrada</h3>
            <p className="text-xs" style={{ color: p.mutedText }}>Completa tus datos y paga de forma segura</p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-full" style={p.chipPaso}>
            Paso 1 de 2
          </div>
        </div>
        <div className="w-12 h-0.5 mb-5" style={{ background: p.goldGradient }} />
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${p.tx.label}`}>Cantidad de entradas</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQtyChange(Math.max(1, numberOfEntries - 1))}
                className={`w-11 h-11 flex items-center justify-center rounded-lg hover:opacity-80 transition-colors text-lg font-semibold ${p.qtyBtnClass}`}
                style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}
                >-</button>
              <input
                type="number"
                min={1}
                max={maxQtyThisCheckout}
                value={numberOfEntries}
                onChange={(e) =>
                  handleQtyChange(Math.max(1, Math.min(maxQtyThisCheckout, parseInt(e.target.value) || 1)))
                }
                className={`w-24 text-center px-3 py-2.5 rounded-lg focus:outline-none text-base font-semibold ${p.inputFieldClass}`}
                style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}
              />
              <button
                type="button"
                disabled={numberOfEntries >= maxQtyThisCheckout}
                onClick={() => handleQtyChange(Math.min(maxQtyThisCheckout, numberOfEntries + 1))}
                className={`w-11 h-11 flex items-center justify-center rounded-lg hover:opacity-80 transition-colors text-lg font-semibold disabled:opacity-35 disabled:pointer-events-none ${p.qtyBtnClass}`}
                style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}
                >+</button>
            </div>
            {remainingOnline != null && remainingOnline <= 10 && (
              <p className="text-xs mt-2" style={{ color: p.mutedText }}>
                Quedan {remainingOnline} entrada{remainingOnline !== 1 ? 's' : ''} disponibles en línea.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {clientNames.map((name, i) => (
              <div key={i}>
                <label className={`block text-sm font-medium mb-2 ${p.tx.label}`}>
                  {numberOfEntries > 1 ? `Nombre entrada ${i + 1} *` : 'Nombre completo *'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={numberOfEntries > 1 ? `Nombre persona ${i + 1}` : 'Tu nombre'}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all ${p.inputFieldClass}`}
                  style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}
                />
              </div>
            ))}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${p.tx.label}`}>Email *</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all ${p.inputFieldClass}`}
              style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}
            />
            <p className={`text-xs mt-1 ${p.tx.faint}`}>Recibiras todas las entradas y QRs aqui</p>
          </div>


          {paymentMode === 'direct' && (
            <div className="rounded-lg p-4 space-y-3" style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${p.tx.directTitle}`}>Tarjeta (modo directo sandbox)</p>
                <span className={`text-[11px] ${p.tx.directBadge}`}>Activo</span>
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
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
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
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp-month"
                  value={cardExpMonth}
                  onChange={(e) => setCardExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="MM"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp-year"
                  value={cardExpYear}
                  onChange={(e) => setCardExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="YYYY"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, isAmex ? 4 : 3))}
                  placeholder={isAmex ? 'CID' : 'CVV'}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
              </div>
              <p className={`text-[11px] ${p.tx.hint}`}>
                En modo sandbox directo, estos datos se envían al backend para prueba técnica.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={billingAddress1}
                  onChange={(e) => setBillingAddress1(e.target.value)}
                  placeholder="Dirección *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 sm:col-span-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="text"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder="Ciudad *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="text"
                  value={billingState}
                  onChange={(e) => setBillingState(e.target.value)}
                  placeholder="Departamento/Estado *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="text"
                  value={billingPostalCode}
                  onChange={(e) => setBillingPostalCode(e.target.value)}
                  placeholder="Código postal *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="text"
                  value={billingCountry}
                  onChange={(e) => setBillingCountry(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))}
                  placeholder="País ISO2 (ej. HN) *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
              </div>
            </div>
          )}

          <div className="rounded-lg p-4" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${p.tx.row}`}>Total a pagar</span>
              <span className="text-2xl font-bold" style={{ color: '#c9a84c' }}>{formatLps(totalPrice)}</span>
            </div>
            <p className={`text-xs mt-1 ${p.tx.faint}`}>{numberOfEntries} entrada{numberOfEntries > 1 ? 's' : ''} x {formatLps(event.onlinePrice)}</p>
            <div className={`mt-3 w-full h-1.5 rounded-full overflow-hidden ${p.isLight ? 'bg-amber-100' : 'bg-white/10'}`}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(35, (numberOfEntries / maxQtyThisCheckout) * 100))}%`,
                  background: p.goldGradient,
                }}
              />
            </div>
          </div>

          {showUnified && paymentMode === 'unified' && (
            <div className="rounded-xl p-4 space-y-3" style={p.unifiedPanel}>
              <p className={p.tx.unifiedLead}>Paso 2 de 2: Ingresa tarjeta en Microform (3DS)</p>
              <input
                type="text"
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
                placeholder="Nombre del titular *"
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
              />
              <div className="space-y-2">
                <label className={`block text-xs ${p.tx.unifiedLbl}`}>Número de tarjeta</label>
                <div
                  id="cybs-card-number"
                  className="w-full rounded-lg overflow-hidden"
                  style={{
                    background: p.fieldRim,
                    border: `1px solid ${p.inputBorder}`,
                    height: '44px',
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={microformExpMonth}
                  onChange={(e) => setMicroformExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="MM"
                  className={`w-full px-4 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}`, height: '44px' }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={microformExpYear}
                  onChange={(e) => setMicroformExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="YYYY"
                  className={`w-full px-4 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}`, height: '44px' }}
                />
                <div
                  id="cybs-card-cvv"
                  className="w-full rounded-lg overflow-hidden"
                  style={{
                    background: p.fieldRim,
                    border: `1px solid ${p.inputBorder}`,
                    height: '44px',
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={billingAddress1}
                  onChange={(e) => setBillingAddress1(e.target.value)}
                  placeholder="Dirección *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 sm:col-span-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="text"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder="Ciudad *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="text"
                  value={billingState}
                  onChange={(e) => setBillingState(e.target.value)}
                  placeholder="Departamento/Estado *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="text"
                  value={billingPostalCode}
                  onChange={(e) => setBillingPostalCode(e.target.value)}
                  placeholder="Código postal *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
                <input
                  type="text"
                  value={billingCountry}
                  onChange={(e) => setBillingCountry(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))}
                  placeholder="País ISO2 (ej. HN) *"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${p.inputFieldClass}`}
                  style={{ background: p.fieldRim, border: `1px solid ${p.inputBorder}` }}
                />
              </div>
              <p className={p.tx.unifiedFoot}>
                Los datos sensibles se capturan en iframes seguros de CyberSource.
              </p>
            </div>
          )}

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}

          {processing ? (
            <div className="text-center py-4">
              <div className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-2" style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }} />
              <p className={`text-sm ${p.tx.row}`}>Procesando pago...</p>
            </div>
          ) : formValid ? (
            <button
              type="button"
              onClick={handlePayClick}
              className="w-full font-semibold py-3 px-4 rounded-lg transition-all hover:opacity-90 shadow-[0_10px_30px_rgba(201,168,76,0.25)]"
              style={{ background: p.goldGradient, color: '#0a0a15' }}
            >
              Pagar con tarjeta
            </button>
          ) : (
            <div className="rounded-lg p-4 text-center" style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}>
              <p className={`text-sm ${p.tx.hint}`}>Completa tu nombre y email para continuar</p>
            </div>
          )}

          <p className={`text-xs text-center ${p.tx.vfaint}`}>
            Pago seguro procesado por CyberSource (Visa / Mastercard / Amex). Recibirás tu entrada por email automáticamente.
          </p>
        </div>
      </div>
    </div>
  )
}

function ConfirmationView({
  success,
  event,
  eventsListPath = '/eventos',
  palette,
}: {
  success: PurchaseSuccess
  event: EventData
  eventsListPath?: string
  palette: PurchasePalette
}) {
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

  const headerBg = palette.isLight
    ? 'linear-gradient(135deg, rgba(201,168,76,0.22), rgba(255,252,248,0.98))'
    : 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))'

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-2xl overflow-hidden" style={{ background: palette.cardBg, border: `1px solid ${palette.cardBorder}` }}>
        <div className="p-8 text-center" style={{ background: headerBg }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.2)', border: '2px solid rgba(201,168,76,0.4)' }}>
            <svg className="w-8 h-8" style={{ color: '#c9a84c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold mb-1 ${palette.tx.h2}`}>Compra Exitosa!</h2>
          <p className={`text-sm ${palette.tx.successSub}`}>Tu entrada ha sido enviada por email</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl p-4 space-y-3" style={{ background: palette.innerPanelBg, border: `1px solid ${palette.cardBorder}` }}>
            <div className="flex justify-between">
              <span className={`text-sm ${palette.tx.row}`}>Evento</span>
              <span className={`font-medium ${palette.tx.h3}`}>{success.eventName}</span>
            </div>
            <div style={{ borderTop: `1px solid ${palette.cardBorder}` }} />
            <div className="flex justify-between">
              <span className={`text-sm ${palette.tx.row}`}>Fecha</span>
              <span className="font-medium capitalize" style={{ color: '#c9a84c' }}>{eventDateStr}</span>
            </div>
            <div style={{ borderTop: `1px solid ${palette.cardBorder}` }} />
            <div className="flex justify-between">
              <span className={`text-sm ${palette.tx.row}`}>Entradas</span>
              <span className={`font-bold ${palette.tx.h3}`}>{success.entries.length}</span>
            </div>
            <div style={{ borderTop: `1px solid ${palette.cardBorder}` }} />
            <div className="flex justify-between">
              <span className={`text-sm ${palette.tx.row}`}>Total Pagado</span>
              <span className="font-bold text-lg" style={{ color: '#c9a84c' }}>{formatLps(success.totalPriceLps)}</span>
            </div>
            <div style={{ borderTop: `1px solid ${palette.cardBorder}` }} />
            <div className="flex justify-between">
              <span className={`text-sm ${palette.tx.row}`}>Email</span>
              <span className={`text-sm ${palette.tx.h3}`}>{success.clientEmail}</span>
            </div>
          </div>

          {success.entries.length > 1 && (
            <div className="rounded-xl p-4" style={{ background: palette.innerPanelBg, border: `1px solid ${palette.cardBorder}` }}>
              <p className={`text-sm font-semibold mb-2 ${palette.tx.h3}`}>Entradas emitidas</p>
              <div className="space-y-2">
                {success.entries.map((entry, index) => (
                  <div key={entry.entryId} className="flex items-center justify-between text-sm">
                    <span className={palette.tx.entryRow}>Entrada {index + 1}</span>
                    <span className={`font-medium truncate max-w-[70%] text-right ${palette.tx.h3}`}>{entry.clientName}</span>
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
              style={{ background: palette.goldGradient, color: '#0a0a15' }}
            >
              {downloading ? 'Generando...' : 'Descargar / Imprimir Entrada'}
            </button>

            <button
              onClick={handleWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Compartir por WhatsApp
            </button>

            <Link
              href={eventsListPath}
              className={`block w-full text-center font-medium py-2.5 px-4 rounded-lg transition-colors text-sm ${palette.tx.moreEvents}`}
              style={{
                background: palette.isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${palette.cardBorder}`,
              }}
            >
              Ver mas eventos
            </Link>
          </div>

          <p className={`text-xs text-center ${palette.tx.ref}`}>
            Referencia: {success.paymentReference}
          </p>
        </div>
      </div>
    </div>
  )
}
