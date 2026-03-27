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

/** Solo `live` excluía otros valores usados en producción (p. ej. `production`) y apuntaba por error a apitest. */
function isCyberSourceLiveEnv(): boolean {
  const env = (process.env.CYBERSOURCE_ENV || 'test').trim().toLowerCase()
  return (
    env === 'live' ||
    env === 'production' ||
    env === 'prod' ||
    env === '1' ||
    env === 'true'
  )
}

function getCyberSourceBaseUrl() {
  return isCyberSourceLiveEnv()
    ? 'https://api.cybersource.com'
    : 'https://apitest.cybersource.com'
}

/** Host efectivo de la API (para logs: debe ser api.cybersource.com en ventas live). */
export function getCyberSourceApiHostForLogs(): string {
  try {
    return new URL(getCyberSourceBaseUrl()).host
  } catch {
    return 'unknown'
  }
}

function getSharedSecretBuffer(sharedSecretRaw: string): Buffer {
  const sharedSecret = sharedSecretRaw.trim()
  if (!sharedSecret) {
    throw new Error('CYBERSOURCE_SHARED_SECRET está vacío.')
  }
  const cleaned = sharedSecret.replace(/\s+/g, '')
  // CyberSource portal always provides the shared secret as standard base64.
  // Attempt to decode it; if the characters are not base64 or decoding yields
  // an empty buffer, fall back to treating it as a raw UTF-8 string.
  if (/^[A-Za-z0-9+/=]+$/.test(cleaned)) {
    try {
      const decoded = Buffer.from(cleaned, 'base64')
      if (decoded.length > 0) return decoded
    } catch {
      // fall through to UTF-8
    }
  }
  return Buffer.from(sharedSecret, 'utf8')
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
    // SDK de CyberSource usa hal+json; alinear evita rechazos raros en algunos recursos PTS.
    Accept: 'application/hal+json, application/json;q=0.9',
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

export function dedupeCyberSourceIds(ids: string[]): string[] {
  const out: string[] = []
  for (const x of ids) {
    const t = x.trim()
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

/** Respuesta POST /pts/v2/payments/{id}/captures o SDK capturePayment: id de recurso captura (no el payment id). */
export function extractCaptureIdFromCaptureApiResponse(captureResponse: unknown): string | null {
  if (!captureResponse || typeof captureResponse !== 'object') return null
  const o = captureResponse as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  if (id) return id
  const links = (o._links ?? o.links) as Record<string, unknown> | undefined
  const self = links?.self as { href?: string } | undefined
  const href = typeof self?.href === 'string' ? self.href : ''
  const m = href.match(/\/pts\/v2\/captures\/([^/?\s]+)/)
  return m?.[1]?.trim() ?? null
}

/** GET /pts/v2/payments/{id}: enlaces HAL hacia /pts/v2/captures/... */
export function extractAllCaptureIdsFromPaymentHal(p: unknown): string[] {
  const out: string[] = []
  if (!p || typeof p !== 'object') return out
  const raw = ((p as Record<string, unknown>)._links ?? (p as Record<string, unknown>).links) as
    | Record<string, unknown>
    | undefined
  if (!raw || typeof raw !== 'object') return out
  const pushFromHref = (href: string) => {
    const m = href.match(/\/pts\/v2\/captures\/([^/?\s]+)/)
    if (m?.[1]) out.push(m[1].trim())
  }
  for (const v of Object.values(raw)) {
    if (v && typeof v === 'object' && 'href' in (v as object)) {
      pushFromHref(String((v as { href?: string }).href || ''))
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object' && 'href' in item) {
          pushFromHref(String((item as { href?: string }).href || ''))
        }
      }
    }
  }
  return dedupeCyberSourceIds(out)
}

export function extractFirstCaptureIdFromPaymentHal(p: unknown): string | null {
  const all = extractAllCaptureIdsFromPaymentHal(p)
  return all[0] ?? null
}

/** Valor efectivo de entorno REST (mismo criterio que getCyberSourceBaseUrl). */
export function getCyberSourceEnvLabel(): 'live' | 'test' {
  return isCyberSourceLiveEnv() ? 'live' : 'test'
}

