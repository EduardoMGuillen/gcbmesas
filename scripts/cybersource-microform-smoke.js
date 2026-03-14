'use strict'

const crypto = require('crypto')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })
dotenv.config()

class CybsApiError extends Error {
  constructor(params) {
    super(params.message)
    this.name = 'CybsApiError'
    this.status = params.status
    this.requestId = params.requestId
    this.endpoint = params.endpoint
    this.responseBody = params.responseBody
  }
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return String(value).trim()
}

function getBaseUrl() {
  const env = (process.env.CYBERSOURCE_ENV || 'test').toLowerCase()
  return env === 'live' ? 'https://api.cybersource.com' : 'https://apitest.cybersource.com'
}

function isBase64(value) {
  if (!value) return false
  const normalized = value.replace(/\s+/g, '')
  if (normalized.length % 4 !== 0) return false
  if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) return false
  try {
    return Buffer.from(normalized, 'base64').toString('base64') === normalized
  } catch {
    return false
  }
}

function getSharedSecretBuffer(sharedSecretRaw) {
  const sharedSecret = String(sharedSecretRaw || '').trim()
  if (!sharedSecret) {
    throw new Error('CYBERSOURCE_SHARED_SECRET is empty.')
  }
  return isBase64(sharedSecret)
    ? Buffer.from(sharedSecret, 'base64')
    : Buffer.from(sharedSecret, 'utf8')
}

function buildSignature(params) {
  const signatureHeaders = 'host date (request-target) digest v-c-merchant-id'
  const signaturePayload =
    `host: ${params.host}\n` +
    `date: ${params.date}\n` +
    `(request-target): post ${params.resourcePath}\n` +
    `digest: ${params.digest}\n` +
    `v-c-merchant-id: ${params.merchantId}`

  const hmac = crypto.createHmac('sha256', getSharedSecretBuffer(params.sharedSecret))
  const signature = hmac.update(signaturePayload).digest('base64')
  return `keyid="${params.keyId}", algorithm="HmacSHA256", headers="${signatureHeaders}", signature="${signature}"`
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

async function cybsPost(resourcePath, payload) {
  const merchantId = requiredEnv('CYBERSOURCE_MERCHANT_ID')
  const keyId = requiredEnv('CYBERSOURCE_KEY_ID')
  const sharedSecret = requiredEnv('CYBERSOURCE_SHARED_SECRET')

  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${resourcePath}`
  const host = new URL(baseUrl).host
  const date = new Date().toUTCString()
  const body = JSON.stringify(payload || {})
  const digest = `SHA-256=${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}`
  const signature = buildSignature({
    host,
    date,
    digest,
    resourcePath,
    merchantId,
    keyId,
    sharedSecret,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Host: host,
      Date: date,
      'v-c-date': date,
      Signature: signature,
      'v-c-merchant-id': merchantId,
      Digest: digest,
      'Content-Type': 'application/json',
    },
    body,
    cache: 'no-store',
  })

  const rawBody = await response.text()
  let responseBody = {}
  if (rawBody) {
    try {
      responseBody = JSON.parse(rawBody)
    } catch {
      responseBody = rawBody
    }
  }

  const requestId =
    response.headers.get('v-c-correlation-id') ||
    response.headers.get('x-requestid') ||
    response.headers.get('x-request-id') ||
    null

  if (!response.ok) {
    const message = typeof responseBody === 'string'
      ? responseBody
      : responseBody?.message ||
        responseBody?.errorInformation?.reason ||
        responseBody?.reason ||
        `CyberSource error ${response.status}`
    throw new CybsApiError({
      message: String(message),
      status: response.status,
      requestId,
      endpoint: resourcePath,
      responseBody,
    })
  }

  return { responseBody, requestId }
}

async function runMicroformSmoke() {
  const targetOrigin =
    String(process.env.CYBS_MICROFORM_TARGET_ORIGIN || '').trim() ||
    String(process.env.NEXT_PUBLIC_APP_URL || '').trim() ||
    String(process.env.NEXTAUTH_URL || '').trim()

  if (!targetOrigin) {
    throw new Error('Missing target origin. Set CYBS_MICROFORM_TARGET_ORIGIN or NEXT_PUBLIC_APP_URL/NEXTAUTH_URL.')
  }

  console.log('Running CyberSource Microform partial smoke...')
  console.log(`- Host: ${getBaseUrl()}`)
  console.log(`- Target origin: ${targetOrigin}`)
  console.log('- Endpoint: /microform/v2/sessions')

  const sessionPayload = {
    clientVersion: 'v2',
    targetOrigins: [targetOrigin],
    allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
    allowedPaymentTypes: ['CARD'],
  }

  const session = await cybsPost('/microform/v2/sessions', sessionPayload)
  const captureContext =
    session.responseBody?.captureContext ||
    session.responseBody?.token ||
    (typeof session.responseBody === 'string' ? session.responseBody : null)

  if (!captureContext) {
    throw new Error('Microform session did not return captureContext/token.')
  }

  const payload = parseJwtPayload(String(captureContext))
  const ctxData = payload?.ctx?.[0]?.data || {}
  const checks = {
    hasCaptureContext: Boolean(captureContext),
    hasClientLibrary: Boolean(ctxData.clientLibrary),
    hasAllowedPaymentTypes: Array.isArray(ctxData.allowedPaymentTypes),
    hasCardPaymentType: Array.isArray(ctxData.allowedPaymentTypes) && ctxData.allowedPaymentTypes.includes('CARD'),
  }

  console.log(`- Session requestId: ${session.requestId || 'n/a'}`)
  console.log(`- Client library: ${ctxData.clientLibrary || 'n/a'}`)
  console.log(`- Allowed payment types: ${Array.isArray(ctxData.allowedPaymentTypes) ? ctxData.allowedPaymentTypes.join(',') : 'n/a'}`)
  console.log('--- Core checks ---')
  Object.entries(checks).forEach(([k, ok]) => console.log(`  ${ok ? 'PASS' : 'FAIL'} ${k}`))

  const failedCore = Object.values(checks).some((ok) => !ok)
  if (failedCore) {
    throw new Error('Microform core smoke failed.')
  }

  console.log('\n- Endpoint probe: /pts/v2/payments with invalid transient token')
  const probePayload = {
    clientReferenceInformation: { code: `MICRO-PROBE-${Date.now()}` },
    processingInformation: { capture: false, commerceIndicator: 'internet' },
    tokenInformation: { transientTokenJwt: 'ey.invalid.token' },
    orderInformation: {
      amountDetails: {
        totalAmount: process.env.CYBS_SMOKE_AMOUNT || '10.00',
        currency: process.env.CYBS_SMOKE_CURRENCY || 'HNL',
      },
      billTo: {
        firstName: 'Probe',
        lastName: 'Token',
        email: 'probe@example.com',
        country: 'HN',
        locality: 'Tegucigalpa',
        address1: 'N/A',
        administrativeArea: 'FM',
        postalCode: '11101',
        phoneNumber: '00000000',
      },
    },
  }

  try {
    const probe = await cybsPost('/pts/v2/payments', probePayload)
    console.log(`  WARN unexpected success on invalid token, requestId=${probe.requestId || 'n/a'}`)
  } catch (error) {
    if (error instanceof CybsApiError) {
      console.log(`  Probe status: ${error.status}`)
      console.log(`  Probe requestId: ${error.requestId || 'n/a'}`)
      if (error.status === 404) {
        console.log('  WARN /pts/v2/payments returned 404 -> likely merchant enablement/routing issue for tokenized flow.')
      } else {
        console.log('  PASS /pts/v2/payments is reachable (non-404), token validation blocked as expected.')
      }
    } else {
      throw error
    }
  }
}

runMicroformSmoke()
  .then(() => {
    console.log('\nMicroform partial smoke completed.')
  })
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
