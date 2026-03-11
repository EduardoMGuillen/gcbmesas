import crypto from 'crypto'

function getCyberSourceBaseUrl() {
  const env = (process.env.CYBERSOURCE_ENV || 'test').toLowerCase()
  return env === 'live' ? 'https://api.cybersource.com' : 'https://apitest.cybersource.com'
}

function buildSignature(params: {
  method: string
  resourcePath: string
  host: string
  date: string
  digest: string
  merchantId: string
  keyId: string
  sharedSecret: string
}) {
  const signatureHeaders = 'host date (request-target) digest v-c-merchant-id'
  const signaturePayload =
    `host: ${params.host}\n` +
    `date: ${params.date}\n` +
    `(request-target): ${params.method.toLowerCase()} ${params.resourcePath}\n` +
    `digest: ${params.digest}\n` +
    `v-c-merchant-id: ${params.merchantId}`

  const hmac = crypto.createHmac(
    'sha256',
    Buffer.from(params.sharedSecret, 'base64').toString('utf8').length > 0
      ? Buffer.from(params.sharedSecret, 'base64')
      : Buffer.from(params.sharedSecret)
  )
  const signature = hmac.update(signaturePayload).digest('base64')

  return `keyid="${params.keyId}", algorithm="HmacSHA256", headers="${signatureHeaders}", signature="${signature}"`
}

export async function cyberSourcePost<TResponse>(
  resourcePath: string,
  payload: unknown
): Promise<TResponse> {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID
  const keyId = process.env.CYBERSOURCE_KEY_ID
  const sharedSecret = process.env.CYBERSOURCE_SHARED_SECRET

  if (!merchantId || !keyId || !sharedSecret) {
    throw new Error('Faltan credenciales REST de CyberSource (merchant_id, key_id o shared_secret)')
  }

  const baseUrl = getCyberSourceBaseUrl()
  const url = `${baseUrl}${resourcePath}`
  const body = JSON.stringify(payload)
  const host = new URL(baseUrl).host
  const date = new Date().toUTCString()
  const digest = `SHA-256=${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}`
  const signature = buildSignature({
    method: 'POST',
    resourcePath,
    host,
    date,
    digest,
    merchantId,
    keyId,
    sharedSecret,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Host: host,
      Date: date,
      Digest: digest,
      Signature: signature,
      'v-c-merchant-id': merchantId,
    },
    body,
    cache: 'no-store',
  })

  const responseBody = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg =
      (responseBody as any)?.message ||
      (responseBody as any)?.details ||
      (responseBody as any)?.errorInformation?.message ||
      `CyberSource error ${response.status}`
    throw new Error(String(msg))
  }

  return responseBody as TResponse
}

