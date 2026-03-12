import crypto from 'crypto'

export class CyberSourceApiError extends Error {
  status: number
  requestId: string | null
  responseBody: any
  endpoint: string

  constructor(params: {
    message: string
    status: number
    requestId: string | null
    responseBody: any
    endpoint: string
  }) {
    super(params.message)
    this.name = 'CyberSourceApiError'
    this.status = params.status
    this.requestId = params.requestId
    this.responseBody = params.responseBody
    this.endpoint = params.endpoint
  }
}

function getCyberSourceBaseUrl() {
  const env = (process.env.CYBERSOURCE_ENV || 'test').toLowerCase()
  return env === 'live' ? 'https://api.cybersource.com' : 'https://apitest.cybersource.com'
}

function isBase64(value: string) {
  if (!value) return false
  const normalized = value.replace(/\s+/g, '')
  // Base64 strings should be divisible by 4 after removing padding.
  if (normalized.length % 4 !== 0) return false
  if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) return false
  try {
    return Buffer.from(normalized, 'base64').toString('base64') === normalized
  } catch {
    return false
  }
}

function getSharedSecretBuffer(sharedSecretRaw: string) {
  const sharedSecret = sharedSecretRaw.trim()
  if (!sharedSecret) {
    throw new Error('CYBERSOURCE_SHARED_SECRET está vacío.')
  }
  return isBase64(sharedSecret)
    ? Buffer.from(sharedSecret, 'base64')
    : Buffer.from(sharedSecret, 'utf8')
}

function buildSignature(params: {
  method: string
  resourcePath: string
  host: string
  date: string
  digest?: string
  includeDigest: boolean
  merchantId: string
  keyId: string
  sharedSecret: string
}) {
  const signatureHeaders = params.includeDigest
    ? 'host date (request-target) digest v-c-merchant-id'
    : 'host date (request-target) v-c-merchant-id'
  const signaturePayload =
    `host: ${params.host}\n` +
    `date: ${params.date}\n` +
    `(request-target): ${params.method.toLowerCase()} ${params.resourcePath}\n` +
    `${params.includeDigest ? `digest: ${params.digest}\n` : ''}` +
    `v-c-merchant-id: ${params.merchantId}`

  const hmac = crypto.createHmac('sha256', getSharedSecretBuffer(params.sharedSecret))
  const signature = hmac.update(signaturePayload).digest('base64')

  return `keyid="${params.keyId}", algorithm="HmacSHA256", headers="${signatureHeaders}", signature="${signature}"`
}

async function cyberSourceRequest<TResponse>(
  method: 'GET' | 'POST',
  resourcePath: string,
  payload?: unknown
): Promise<TResponse> {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID?.trim()
  const keyId = process.env.CYBERSOURCE_KEY_ID?.trim()
  const sharedSecret = process.env.CYBERSOURCE_SHARED_SECRET?.trim()

  if (!merchantId || !keyId || !sharedSecret) {
    throw new Error('Faltan credenciales REST de CyberSource (merchant_id, key_id o shared_secret)')
  }

  const baseUrl = getCyberSourceBaseUrl()
  const url = `${baseUrl}${resourcePath}`
  const body = method === 'POST' ? JSON.stringify(payload ?? {}) : undefined
  const host = new URL(baseUrl).host
  const date = new Date().toUTCString()
  const includeDigest = method === 'POST'
  const digest = includeDigest && body
    ? `SHA-256=${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}`
    : undefined
  const signature = buildSignature({
    method,
    resourcePath,
    host,
    date,
    includeDigest,
    digest,
    merchantId,
    keyId,
    sharedSecret,
  })

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Host: host,
    Date: date,
    'v-c-date': date,
    Signature: signature,
    'v-c-merchant-id': merchantId,
  }

  if (includeDigest && digest) {
    headers.Digest = digest
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
    cache: 'no-store',
  })

  const rawBody = await response.text()
  let responseBody: any = {}
  if (rawBody) {
    try {
      responseBody = JSON.parse(rawBody)
    } catch {
      // Capture Context API can return a raw JWT string (not JSON)
      responseBody = rawBody
    }
  }
  if (!response.ok) {
    const requestId =
      response.headers.get('v-c-correlation-id') ||
      response.headers.get('x-requestid') ||
      response.headers.get('x-request-id') ||
      null
    const msg = typeof responseBody === 'string'
      ? responseBody
      : (responseBody as any)?.message ||
        (responseBody as any)?.errorInformation?.reason ||
        (responseBody as any)?.details ||
        (responseBody as any)?.errorInformation?.message ||
        `CyberSource error ${response.status}`
    throw new CyberSourceApiError({
      message: String(msg),
      status: response.status,
      requestId,
      responseBody,
      endpoint: resourcePath,
    })
  }

  return responseBody as TResponse
}

export async function cyberSourcePost<TResponse>(
  resourcePath: string,
  payload: unknown
): Promise<TResponse> {
  return cyberSourceRequest<TResponse>('POST', resourcePath, payload)
}

export async function cyberSourceGet<TResponse>(
  resourcePath: string
): Promise<TResponse> {
  return cyberSourceRequest<TResponse>('GET', resourcePath)
}

