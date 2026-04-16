import { NextRequest, NextResponse } from 'next/server'
import { generateQRCode } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import path from 'path'
import fs from 'fs'
import { Prisma } from '@prisma/client'
import {
  CyberSourceApiError,
  cyberSourceGet,
  cyberSourcePost,
  extractCaptureIdFromCaptureApiResponse,
  extractFirstCaptureIdFromPaymentHal,
  pickNumericEciFromConsumerAuth,
} from '@/lib/cybersource'
import { cyberSourceDirectPaymentViaSdk, cyberSourceUnifiedPaymentViaSdk } from '@/lib/cybersource-sdk-direct'
import { persistCyberSourcePaymentAudit } from '@/lib/cybersource-payment-audit'
import { assertEventEntryCapacity } from '@/lib/actions'
import { escapeHtml } from '@/lib/html-escape'
import { sendMailWithInlineImages } from '@/lib/send-mail'

function maskMerchantId(merchantId: string | undefined) {
  if (!merchantId) return null
  if (merchantId.length <= 6) return `${merchantId.slice(0, 1)}***`
  return `${merchantId.slice(0, 4)}***${merchantId.slice(-3)}`
}

function summarizeTransientToken(token: unknown) {
  const value = typeof token === 'string' ? token : String(token || '')
  const trimmed = value.trim()
  return {
    type: typeof token,
    length: trimmed.length,
    startsWith: trimmed.slice(0, 12),
    hasJwtDots: trimmed.includes('.'),
  }
}

function summarizeCardNumber(cardNumber: unknown) {
  const digits = String(cardNumber || '').replace(/\D/g, '')
  return {
    length: digits.length,
    last4: digits.length >= 4 ? digits.slice(-4) : null,
  }
}

function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function isMastercardCardType(paymentCardType: unknown): boolean {
  const s = String(paymentCardType || '').toLowerCase()
  const digits = s.replace(/\D/g, '')
  return digits === '002' || s.includes('master')
}

/** Alineado con payer-auth: vbv / spa / aesk según marca (evita usar siempre aesk si falta commerceIndicator en el body). */
function commerceIndicatorForBrand(cardType: string): string {
  const t = String(cardType || '').toLowerCase()
  if (t === '001' || t.includes('visa')) return 'vbv'
  if (t === '002' || t.includes('mastercard') || t.includes('master')) return 'spa'
  if (t === '003' || t.includes('amex') || t.includes('american')) return 'aesk'
  return 'aesk'
}

function resolveCommerceIndicator(
  fromBody: unknown,
  has3dsPayload: boolean,
  paymentCardType: unknown
): string {
  const fromClient = String(fromBody || '').trim().toLowerCase()
  if (fromClient) return fromClient
  if (!has3dsPayload) return 'internet'
  const brand = commerceIndicatorForBrand(String(paymentCardType || ''))
  return brand || 'aesk'
}

function normalizeConsumerAuthenticationInformation(raw: any, paymentCardType?: string) {
  if (!raw || typeof raw !== 'object') return null
  // For the PAYMENT step only authenticationTransactionId (CyberSource internal enrollment ID)
  // must be excluded — it triggers CyberSource to look for paymentAccountInformation.card.number → 400.
  // All other 3DS fields (including the transaction IDs required by the acquirer) must be sent
  // so the authorization carries the correct ECI/CAVV and is marked as 3DS-authenticated.
  // SDK field name: "eciRaw" (not "eci").
  const normalized: Record<string, string> = {}
  const mc = isMastercardCardType(paymentCardType)
  const cryptogram = raw.cavv || raw.authenticationValue || raw.ucafAuthenticationData
  if (cryptogram) normalized.cavv = String(cryptogram)
  if (mc && (raw.ucafAuthenticationData || raw.authenticationValue || raw.cavv)) {
    normalized.ucafAuthenticationData = String(raw.ucafAuthenticationData || raw.authenticationValue || raw.cavv)
  }
  if (mc && raw.ucafCollectionIndicator) {
    normalized.ucafCollectionIndicator = String(raw.ucafCollectionIndicator)
  }
  const eciNumeric = pickNumericEciFromConsumerAuth(raw)
  if (eciNumeric) normalized.eciRaw = eciNumeric
  if (raw.xid) normalized.xid = String(raw.xid)
  if (raw.paresStatus) normalized.paresStatus = String(raw.paresStatus)
  if (raw.acsTransactionId) normalized.acsTransactionId = String(raw.acsTransactionId)
  if (raw.threeDSServerTransactionId) normalized.threeDSServerTransactionId = String(raw.threeDSServerTransactionId)
  if (raw.directoryServerTransactionId) {
    normalized.directoryServerTransactionId = String(raw.directoryServerTransactionId)
  }
  // For a frictionless success without explicit paresStatus, default to "Y"
  if (!normalized.paresStatus && (normalized.cavv || normalized.eciRaw)) {
    normalized.paresStatus = 'Y'
  }
  return Object.keys(normalized).length > 0 ? normalized : null
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `E-${token}`
}

export async function POST(req: NextRequest) {
  const debugContext: {
    paymentReference?: string
    eventId?: string
    numberOfEntries?: number
    eventPrice?: number
    transientToken?: unknown
    paymentMode?: string
    cardNumber?: string
    cardExpMonth?: string
    cardExpYear?: string
    cardCvv?: string
    cardHolderName?: string
    billToAddress1?: string
    billToLocality?: string
    billToAdministrativeArea?: string
    billToPostalCode?: string
    billToCountry?: string
    paymentCardType?: string
    commerceIndicator?: string
    hasConsumerAuthInfo?: boolean
  } = {}
  const currency = 'HNL'

  try {
    const body = await req.json()
    const {
      paymentReference,
      eventId,
      clientEmail,
      numberOfEntries,
      transientToken,
      cardNumber,
      cardExpMonth,
      cardExpYear,
      cardCvv,
      cardHolderName,
      billToAddress1,
      billToLocality,
      billToAdministrativeArea,
      billToPostalCode,
      billToCountry,
      paymentCardType,
      commerceIndicator,
      consumerAuthenticationInformation,
    } = body
    debugContext.paymentReference = paymentReference
    debugContext.eventId = eventId
    debugContext.numberOfEntries = Number(numberOfEntries || 0)
    debugContext.transientToken = transientToken
    debugContext.cardNumber = cardNumber
    debugContext.cardExpMonth = cardExpMonth
    debugContext.cardExpYear = cardExpYear
    debugContext.cardCvv = cardCvv
    debugContext.cardHolderName = cardHolderName
    debugContext.billToAddress1 = billToAddress1
    debugContext.billToLocality = billToLocality
    debugContext.billToAdministrativeArea = billToAdministrativeArea
    debugContext.billToPostalCode = billToPostalCode
    debugContext.billToCountry = billToCountry
    debugContext.paymentCardType = paymentCardType
    debugContext.commerceIndicator = commerceIndicator
    debugContext.hasConsumerAuthInfo = Boolean(consumerAuthenticationInformation)

    if (!paymentReference || !eventId || !clientEmail || !numberOfEntries) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const isMockMode = process.env.CYBERSOURCE_MOCK === 'true'
    const paymentMode = (process.env.CYBERSOURCE_PAYMENT_MODE || 'unified').toLowerCase()
    debugContext.paymentMode = paymentMode
    const isDirectMode = paymentMode === 'direct'
    const cardDigits = String(cardNumber || '').replace(/\D/g, '')

    if (!isMockMode && !isDirectMode && !transientToken) {
      return NextResponse.json({ error: 'Falta transient token de Unified Checkout.' }, { status: 400 })
    }
    if (!isMockMode && isDirectMode && (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvv)) {
      return NextResponse.json({ error: 'Faltan datos de tarjeta para pago directo.' }, { status: 400 })
    }
    if (
      !isMockMode &&
      isDirectMode &&
      (!billToAddress1 || !billToLocality || !billToAdministrativeArea || !billToPostalCode || !billToCountry)
    ) {
      return NextResponse.json({ error: 'Faltan datos mínimos de facturación para pago directo.' }, { status: 400 })
    }
    if (!isMockMode && isDirectMode && !(cardDigits.length === 15 || cardDigits.length === 16)) {
      return NextResponse.json({ error: 'Número de tarjeta inválido para prueba (usa 15 o 16 dígitos).' }, { status: 400 })
    }

    const pendingLog = await prisma.log.findFirst({
      where: {
        action: 'EVENT_UPDATED',
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60 * 48),
        },
        AND: [
          {
            details: {
              path: ['type'],
              equals: 'CYBERSOURCE_PENDING',
            },
          },
          {
            details: {
              path: ['paymentReference'],
              equals: paymentReference,
            },
          },
          {
            details: {
              path: ['eventId'],
              equals: eventId,
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!pendingLog) {
      return NextResponse.json({ error: 'No se encontró la orden pendiente de CyberSource' }, { status: 404 })
    }

    const pendingDetails = pendingLog.details as any
    if (pendingDetails?.status === 'PROCESSED') {
      return NextResponse.json(
        { error: 'Esta transacción ya fue procesada anteriormente.' },
        { status: 409 }
      )
    }

    const names: string[] = pendingDetails?.clientNames || []
    if (!names.length) {
      return NextResponse.json({ error: 'Nombres de entradas requeridos' }, { status: 400 })
    }

    const event = await prisma.event.findFirst({
      where: { id: pendingDetails?.eventId || eventId, isActive: true },
    })
    debugContext.eventPrice = Number(event?.paypalPrice || 0)

    if (!event || !event.paypalPrice) {
      return NextResponse.json({ error: 'Evento no encontrado o sin precio online' }, { status: 404 })
    }

    const qtyNeeded = Number(pendingDetails?.numberOfEntries || numberOfEntries)
    try {
      await assertEventEntryCapacity(event, qtyNeeded)
    } catch (capErr: any) {
      return NextResponse.json(
        { error: capErr?.message || 'Sin cupo para este evento.' },
        { status: 409 }
      )
    }

    const fallbackFullName = String(cardHolderName || names[0] || 'Cliente General').trim()
    const fallbackFirstName = fallbackFullName.split(' ')[0] || 'Cliente'
    const fallbackLastName = fallbackFullName.split(' ').slice(1).join(' ') || 'General'
    const resolvedBillTo = {
      firstName: String(fallbackFirstName).trim() || 'Cliente',
      lastName: String(fallbackLastName).trim() || 'General',
      email: String(pendingDetails?.clientEmail || clientEmail).trim(),
      country: String(billToCountry || 'HN').trim().toUpperCase() || 'HN',
      locality: String(billToLocality || 'Tegucigalpa').trim() || 'Tegucigalpa',
      address1: String(billToAddress1 || 'N/A').trim() || 'N/A',
      administrativeArea: String(billToAdministrativeArea || 'FM').trim() || 'FM',
      postalCode: String(billToPostalCode || '11101').trim() || '11101',
      phoneNumber: String(pendingDetails?.clientPhone || '00000000').trim() || '00000000',
    }

    const normalizedConsumerAuth = normalizeConsumerAuthenticationInformation(
      consumerAuthenticationInformation,
      paymentCardType
    )

    const amountStr = (
      Number(event.paypalPrice) * Number(pendingDetails?.numberOfEntries || numberOfEntries)
    ).toFixed(2)
    const resolvedCommerceIndicator = resolveCommerceIndicator(
      commerceIndicator,
      Boolean(normalizedConsumerAuth),
      paymentCardType
    )
    const commerceIndicatorFromClient =
      typeof commerceIndicator === 'string' && commerceIndicator.trim()
        ? commerceIndicator.trim()
        : null
    const paymentCardTypeStr =
      typeof paymentCardType === 'string' && paymentCardType.trim() ? paymentCardType.trim() : null

    const paymentResponse = isMockMode
      ? {
          status: 'AUTHORIZED',
          id: `mock_${paymentReference}`,
          processorInformation: { responseCode: '100' },
        }
      : isDirectMode
        ? await cyberSourceDirectPaymentViaSdk({
            paymentReference,
            amount: amountStr,
            currency,
            cardNumber: cardDigits,
            cardExpMonth: String(cardExpMonth),
            cardExpYear: String(cardExpYear),
            cardCvv: String(cardCvv),
            cardHolderName: String(cardHolderName || names[0] || 'Test Merchant'),
            email: String(pendingDetails?.clientEmail || clientEmail).trim(),
            billToAddress1: String(billToAddress1),
            billToLocality: String(billToLocality),
            billToAdministrativeArea: String(billToAdministrativeArea),
            billToPostalCode: String(billToPostalCode),
            billToCountry: String(billToCountry).toUpperCase(),
          })
        : await cyberSourceUnifiedPaymentViaSdk({
            paymentReference,
            transientToken: String(transientToken),
            amount: amountStr,
            currency,
            commerceIndicator: resolvedCommerceIndicator,
            billTo: resolvedBillTo,
            consumerAuthInfo: normalizedConsumerAuth ?? null,
          })

    const status = String(paymentResponse?.status || '').toUpperCase()
    const transactionId = String(paymentResponse?.id || '')
    const reasonCode = String(paymentResponse?.processorInformation?.responseCode || paymentResponse?.errorInformation?.reason || '')
    if (!['AUTHORIZED', 'PENDING', 'AUTHORIZED_PENDING_REVIEW'].includes(status)) {
      await prisma.log.update({
        where: { id: pendingLog.id },
        data: {
          details: {
            ...pendingDetails,
            status: 'REJECTED',
            decision: status || 'REJECTED',
            reasonCode,
            transactionId,
            updatedAt: new Date().toISOString(),
          },
        },
      })
      await persistCyberSourcePaymentAudit({
        outcome: 'REJECTED_AUTH',
        paymentReference,
        eventId: event.id,
        eventName: event.name,
        clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
        amount: amountStr,
        currency,
        paymentMode: isDirectMode ? 'direct' : 'unified',
        mock: isMockMode,
        commerceIndicatorFromClient,
        commerceIndicatorResolved: resolvedCommerceIndicator,
        paymentCardType: paymentCardTypeStr,
        hadRawConsumerAuthFromClient: Boolean(consumerAuthenticationInformation),
        normalizedConsumerAuth: normalizedConsumerAuth,
        cybersourceDecision: status,
        cybersourceReasonCode: reasonCode,
        transactionId: transactionId || null,
        captureId: null,
        captureStatus: null,
        extraNote: 'Autorización CyberSource no exitosa.',
      })
      return NextResponse.json(
        { error: `Pago rechazado por CyberSource (${reasonCode || status || 'sin-codigo'}).` },
        { status: 402 }
      )
    }

    const amountToCapture = amountStr
    let captureId: string | null = null
    let captureStatus: string | null = null
    if (!isMockMode && isDirectMode && transactionId) {
      // Direct mode: SDK did auth-only (capture:false), do explicit capture here
      const captureBody: any = {
        clientReferenceInformation: { code: `${paymentReference}-CAPTURE` },
        orderInformation: {
          amountDetails: { totalAmount: amountToCapture, currency, taxAmount: '0.00' },
        },
      }
      // Para cumplir con el adquirente, volvemos a enviar los campos 3DS (ECI, CAVV, XID, ids 3DS)
      // también en la captura, no solo en la autorización.
      if (normalizedConsumerAuth) {
        captureBody.consumerAuthenticationInformation = normalizedConsumerAuth
        captureBody.processingInformation = {
          commerceIndicator: resolvedCommerceIndicator,
        }
      }
      const captureResponse = await cyberSourcePost<any>(
        `/pts/v2/payments/${transactionId}/captures`,
        captureBody
      )
      captureId =
        extractCaptureIdFromCaptureApiResponse(captureResponse) ||
        String(captureResponse?.id || '').trim() ||
        null
      captureStatus = String(captureResponse?.status || '').toUpperCase() || null
      const okCaptureStatuses = ['PENDING', 'TRANSMITTED', 'COMPLETED', 'SUCCESS', 'CAPTURED']
      if (!captureStatus || !okCaptureStatuses.includes(captureStatus) || !captureId) {
        await prisma.log.update({
          where: { id: pendingLog.id },
          data: {
            details: {
              ...pendingDetails,
              status: 'REJECTED',
              decision: status,
              reasonCode,
              transactionId: transactionId || null,
              captureId,
              captureStatus: captureStatus || 'FAILED',
              updatedAt: new Date().toISOString(),
            },
          },
        })
        await persistCyberSourcePaymentAudit({
          outcome: 'REJECTED_CAPTURE',
          paymentReference,
          eventId: event.id,
          eventName: event.name,
          clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
          amount: amountStr,
          currency,
          paymentMode: 'direct',
          mock: false,
          commerceIndicatorFromClient,
          commerceIndicatorResolved: resolvedCommerceIndicator,
          paymentCardType: paymentCardTypeStr,
          hadRawConsumerAuthFromClient: Boolean(consumerAuthenticationInformation),
          normalizedConsumerAuth: normalizedConsumerAuth,
          cybersourceDecision: status,
          cybersourceReasonCode: reasonCode,
          transactionId: transactionId || null,
          captureId,
          captureStatus: captureStatus || 'FAILED',
          extraNote: 'Captura REST rechazada tras autorización OK.',
        })
        return NextResponse.json(
          { error: `Captura rechazada por CyberSource (${captureStatus || 'sin-estado'}).` },
          { status: 402 }
        )
      }
    } else if (!isMockMode && !isDirectMode && transactionId) {
      let resolved = String((paymentResponse as any)?.captureId || '').trim()
      if (!resolved) {
        try {
          const pay = await cyberSourceGet<unknown>(
            `/pts/v2/payments/${encodeURIComponent(transactionId)}`
          )
          resolved = extractFirstCaptureIdFromPaymentHal(pay) || ''
        } catch {
          resolved = ''
        }
      }
      captureId = resolved || null
      captureStatus = String((paymentResponse as any)?.captureStatus || status) || null
    }

    if (!isMockMode && transactionId && !captureId) {
      await prisma.log.update({
        where: { id: pendingLog.id },
        data: {
          details: {
            ...pendingDetails,
            status: 'REJECTED',
            decision: 'NO_CAPTURE_ID',
            reasonCode: 'missing_capture_id',
            transactionId: transactionId || null,
            updatedAt: new Date().toISOString(),
          },
        },
      })
      await persistCyberSourcePaymentAudit({
        outcome: 'REJECTED_NO_CAPTURE_ID',
        paymentReference,
        eventId: event.id,
        eventName: event.name,
        clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
        amount: amountStr,
        currency,
        paymentMode: isDirectMode ? 'direct' : 'unified',
        mock: false,
        commerceIndicatorFromClient,
        commerceIndicatorResolved: resolvedCommerceIndicator,
        paymentCardType: paymentCardTypeStr,
        hadRawConsumerAuthFromClient: Boolean(consumerAuthenticationInformation),
        normalizedConsumerAuth: normalizedConsumerAuth,
        cybersourceDecision: status,
        cybersourceReasonCode: reasonCode,
        transactionId: transactionId || null,
        captureId: null,
        captureStatus: null,
        extraNote: 'Autorización OK pero no se resolvió captureId (unified o HAL).',
      })
      return NextResponse.json(
        {
          error:
            'No se pudo registrar el id de captura del pago. No se emitieron entradas; si ves un cargo, contacta soporte con tu referencia.',
        },
        { status: 502 }
      )
    }

    let entries: any[] = []
    try {
      entries = await prisma.$transaction(
        async (tx) => {
          await assertEventEntryCapacity(event, qtyNeeded, tx)
          const created = []
          for (let i = 0; i < qtyNeeded; i++) {
            const qrToken = generateToken()
            const entryName = (names[i] || names[0]).trim()
            const entry = await tx.entry.create({
              data: {
                eventId: event.id,
                clientName: entryName,
                clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
                clientPhone: String(pendingDetails?.clientPhone || '').trim() || null,
                numberOfEntries: 1,
                totalPrice: Number(event.coverPrice),
                qrToken,
              },
              include: { event: true },
            })
            created.push(entry)
          }
          return created
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        }
      )
    } catch (txErr: any) {
      console.error('[CyberSource] Entry creation failed after successful payment:', txErr)
      return NextResponse.json(
        {
          error:
            txErr?.message?.includes('Cupo') || txErr?.message?.includes('disponible')
              ? txErr.message
              : 'No se pudieron emitir las entradas. Contacta soporte con tu referencia de pago.',
        },
        { status: 409 }
      )
    }

    await prisma.log.create({
      data: {
        action: 'ENTRY_SOLD',
        details: {
          eventId: event.id,
          clientNames: names,
          clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
          numberOfEntries: Number(pendingDetails?.numberOfEntries || numberOfEntries),
          totalPrice: Number(event.paypalPrice) * Number(pendingDetails?.numberOfEntries || numberOfEntries),
          paymentReference,
          source: 'online_cybersource',
          currency,
          entryIds: entries.map((e: { id: string }) => e.id),
          cybersourceDecision: status,
          cybersourceReasonCode: reasonCode,
          cybersourceTransactionId: transactionId || null,
          cybersourceCaptureId: captureId,
          cybersourceCaptureStatus: captureStatus,
        },
      },
    })

    await persistCyberSourcePaymentAudit({
      outcome: isMockMode ? 'MOCK' : 'SUCCESS',
      paymentReference,
      eventId: event.id,
      eventName: event.name,
      clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
      amount: amountStr,
      currency,
      paymentMode: isDirectMode ? 'direct' : 'unified',
      mock: isMockMode,
      commerceIndicatorFromClient,
      commerceIndicatorResolved: resolvedCommerceIndicator,
      paymentCardType: paymentCardTypeStr,
      hadRawConsumerAuthFromClient: Boolean(consumerAuthenticationInformation),
      normalizedConsumerAuth: normalizedConsumerAuth,
      cybersourceDecision: status,
      cybersourceReasonCode: reasonCode,
      transactionId: transactionId || null,
      captureId: captureId ?? null,
      captureStatus: captureStatus ?? null,
      extraNote: isMockMode ? 'Pago simulado (CYBERSOURCE_MOCK).' : null,
    })

    await prisma.log.update({
      where: { id: pendingLog.id },
      data: {
        details: {
          ...pendingDetails,
          status: 'PROCESSED',
          decision: status,
          reasonCode,
          transactionId: transactionId || null,
          captureId,
          captureStatus,
          updatedAt: new Date().toISOString(),
        },
      },
    })

    revalidatePath('/admin/entradas')

    try {
      const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://gcbmesas.vercel.app'
      const eventName = entries[0].event.name
      const eventDate = String(entries[0].event.date)
      const eventCoverImage = event.coverImage
      const totalPriceLps = Number(event.paypalPrice) * entries.length

      const qrData = await Promise.all(
        entries.map(async (entry: any, i: number) => {
          const validationUrl = `${appUrl}/entradas/validar/${entry.qrToken}`
          const qrDataUrl = await generateQRCode(validationUrl)
          const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '')
          return { ...entry, validationUrl, qrBase64, cid: `qrcode${i}` }
        })
      )

      const logoPath = path.join(process.cwd(), 'public', 'LogoCasaBlanca.png')
      const logoBuffer = fs.readFileSync(logoPath)

      const eventDateStr = new Date(eventDate).toLocaleDateString('es-HN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
      })

      const venueRowsHtml = [
        event.venueName
          ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Lugar</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${escapeHtml(event.venueName)}</td></tr>`
          : '',
        event.venueAddress
          ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Dirección</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;">${escapeHtml(event.venueAddress)}</td></tr>`
          : '',
      ].join('')

      const isBulk = entries.length > 1

      const qrSectionsHtml = qrData.map((qr: any) => `
        <div style="text-align:center;margin:0 0 24px;${isBulk ? 'border:1px solid #334155;border-radius:12px;padding:20px;' : ''}">
          ${isBulk ? `<p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 8px;">${qr.clientName}</p>` : ''}
          <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;">Presenta este código QR en la entrada:</p>
          <div style="background:#fff;display:inline-block;padding:16px;border-radius:12px;">
            <img src="cid:${qr.cid}" alt="QR Code" style="width:220px;height:220px;display:block;" />
          </div>
        </div>
      `).join('')

      await sendMailWithInlineImages({
        to: String(pendingDetails?.clientEmail || clientEmail).trim(),
        subject: `${isBulk ? `Tus ${entries.length} entradas` : 'Tu entrada'} para ${eventName} - Casa Blanca`,
        html: `
          <!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;background-color:#1a1a2e;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:16px;overflow:hidden;border:1px solid #334155;">
                ${eventCoverImage ? `<div style="text-align:center;"><img src="${eventCoverImage}" alt="${eventName}" style="width:100%;max-height:250px;object-fit:cover;display:block;" /></div>` : ''}
                <div style="padding:30px 20px;text-align:center;">
                  <img src="cid:logo" alt="Casa Blanca" style="width:100px;height:100px;display:inline-block;" />
                  <p style="color:#c9a84c;margin:8px 0 0;font-size:14px;letter-spacing:1px;">Confirmacion de Compra Online</p>
                </div>
                <div style="padding:30px 20px;">
                  <h2 style="color:#fff;margin:0 0 20px;font-size:20px;text-align:center;">Hola ${names[0]}!</h2>
                  <p style="color:#94a3b8;text-align:center;margin:0 0 24px;font-size:15px;">
                    ${isBulk ? `Tus <strong style="color:#fff;">${entries.length} entradas</strong>` : 'Tu entrada'} para <strong style="color:#fff;">${eventName}</strong> ${isBulk ? 'han sido confirmadas' : 'ha sido confirmada'}.
                  </p>
                  <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin:0 0 24px;">
                    <table style="width:100%;border-collapse:collapse;">
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Evento</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${eventName}</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Fecha</td><td style="padding:8px 0;color:#c9a84c;font-size:14px;text-align:right;font-weight:bold;text-transform:capitalize;">${eventDateStr}</td></tr>
                      ${venueRowsHtml}
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Entradas</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${entries.length}</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Total Pagado</td><td style="padding:8px 0;color:#3b82f6;font-size:18px;text-align:right;font-weight:bold;">L ${totalPriceLps.toFixed(2)} HNL</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Referencia</td><td style="padding:8px 0;color:#64748b;font-size:12px;text-align:right;">${paymentReference}</td></tr>
                    </table>
                  </div>
                  ${qrSectionsHtml}
                  <p style="color:#64748b;text-align:center;font-size:12px;margin:0;">Presenta tu QR en la entrada.</p>
                </div>
                <div style="border-top:1px solid #334155;padding:20px;text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">Casa Blanca &copy; ${new Date().getFullYear()}</p>
                </div>
              </div>
            </div>
          </body></html>`,
        attachments: [
          { filename: 'LogoCasaBlanca.png', content: logoBuffer, cid: 'logo' },
          ...qrData.map((qr: any) => ({
            filename: `entrada-qr-${qr.clientName.replace(/\s+/g, '-').toLowerCase()}.png`,
            content: Buffer.from(qr.qrBase64, 'base64'),
            cid: qr.cid,
          })),
        ],
      })

      for (const entry of entries) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { emailSent: true },
        })
      }
    } catch (emailError: any) {
      console.error('[CyberSource] Email send error (payment was successful):', emailError)
    }

    return NextResponse.json({
      success: true,
      entries: entries.map((e: any) => ({
        entryId: e.id,
        qrToken: e.qrToken,
        clientName: e.clientName,
      })),
      clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
      eventName: entries[0].event.name,
      eventDate: String(entries[0].event.date),
      totalPriceLps: Number(event.paypalPrice) * entries.length,
      paymentReference,
    })
  } catch (error: any) {
    if (error instanceof CyberSourceApiError) {
      const environment = (process.env.CYBERSOURCE_ENV || 'test').toLowerCase()
      const merchantMasked = maskMerchantId(process.env.CYBERSOURCE_MERCHANT_ID)
      const amount = (Number(debugContext.numberOfEntries || 0) * Number(debugContext.eventPrice || 0)).toFixed(2)
      console.error('[CyberSource] Confirm payment request diagnostics:', {
        environment,
        merchantMasked,
        endpointTried: '/pts/v2/payments',
        paymentReference: debugContext.paymentReference,
        eventId: debugContext.eventId,
        currency,
        amount,
        paymentMode: debugContext.paymentMode,
        tokenSummary: summarizeTransientToken(debugContext.transientToken),
        cardSummary: summarizeCardNumber(debugContext.cardNumber),
        paymentCardType: debugContext.paymentCardType || null,
        requestedCommerceIndicator: debugContext.commerceIndicator || null,
        hasConsumerAuthInfo: Boolean(debugContext.hasConsumerAuthInfo),
      })
      if (error.status === 404 && debugContext.transientToken) {
        try {
          const tokenForPath = encodeURIComponent(String(debugContext.transientToken).trim())
          const paymentDetails = await cyberSourceGet<any>(`/up/v1/payment-details/${tokenForPath}`)
          console.error('[CyberSource] Payment details lookup succeeded for transient token:', {
            paymentReference: debugContext.paymentReference,
            endpoint: '/up/v1/payment-details/{id}',
            cardType: paymentDetails?.paymentInformation?.card?.type || null,
            cardLast4: paymentDetails?.paymentInformation?.card?.number || null,
            tokenAmount: paymentDetails?.orderInformation?.amountDetails?.totalAmount || null,
            tokenCurrency: paymentDetails?.orderInformation?.amountDetails?.currency || null,
          })
        } catch (lookupError: any) {
          if (lookupError instanceof CyberSourceApiError) {
            console.error('[CyberSource] Payment details lookup failed:', {
              endpoint: lookupError.endpoint,
              status: lookupError.status,
              requestId: lookupError.requestId,
              responseBody: lookupError.responseBody,
            })
          } else {
            console.error('[CyberSource] Payment details lookup unexpected error:', lookupError)
          }
        }
      }
      console.error('[CyberSource] Confirm payment API error:', {
        endpoint: error.endpoint,
        status: error.status,
        requestId: error.requestId,
        responseBody: error.responseBody,
      })
      const reason =
        typeof error.responseBody === 'string'
          ? error.responseBody
          : error.responseBody?.errorInformation?.reason ||
            error.responseBody?.reason ||
            error.responseBody?.message ||
            error.message
      return NextResponse.json(
        {
          error: `CyberSource ${error.status}: ${reason}`,
          requestId: error.requestId,
          endpoint: error.endpoint,
        },
        { status: 502 }
      )
    }
    console.error('[CyberSource] Confirm payment error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
