import { CyberSourceApiError } from '@/lib/cybersource'

type DirectPaymentParams = {
  paymentReference: string
  amount: string
  currency: string
  cardNumber: string
  cardExpMonth: string
  cardExpYear: string
  cardCvv: string
  cardHolderName: string
  email: string
  billToAddress1: string
  billToLocality: string
  billToAdministrativeArea: string
  billToPostalCode: string
  billToCountry: string
}

type UnifiedPaymentParams = {
  paymentReference: string
  transientToken: string
  amount: string
  currency: string
  commerceIndicator?: string
  billTo: {
    firstName: string
    lastName: string
    email: string
    country: string
    locality: string
    address1: string
    administrativeArea: string
    postalCode: string
    phoneNumber: string
  }
  consumerAuthInfo?: Record<string, string | undefined> | null
}

function getRunEnvironmentHost() {
  const env = (process.env.CYBERSOURCE_ENV || 'test').toLowerCase()
  return env === 'live' ? 'api.cybersource.com' : 'apitest.cybersource.com'
}

export async function cyberSourceDirectPaymentViaSdk(params: DirectPaymentParams): Promise<any> {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID?.trim()
  const keyId = process.env.CYBERSOURCE_KEY_ID?.trim()
  const sharedSecret = process.env.CYBERSOURCE_SHARED_SECRET?.trim()

  if (!merchantId || !keyId || !sharedSecret) {
    throw new Error('Faltan credenciales REST de CyberSource (merchant_id, key_id o shared_secret)')
  }

  const cybersourceRestApi: any = await import('cybersource-rest-client')
  const sdk = (cybersourceRestApi as any).default || cybersourceRestApi

  const configObject = {
    authenticationType: 'http_signature',
    runEnvironment: getRunEnvironmentHost(),
    merchantID: merchantId,
    merchantKeyId: keyId,
    merchantsecretKey: sharedSecret,
    logConfiguration: {
      enableLog: false,
    },
  }

  const apiClient = new sdk.ApiClient()
  const requestObj = new sdk.CreatePaymentRequest()

  requestObj.clientReferenceInformation = { code: params.paymentReference }
  requestObj.processingInformation = {
    // Keep this aligned with the sample path that succeeded in smoke tests.
    capture: false,
  }
  requestObj.paymentInformation = {
    card: {
      number: params.cardNumber,
      expirationMonth: params.cardExpMonth.padStart(2, '0'),
      expirationYear: params.cardExpYear,
    },
  }
  requestObj.orderInformation = {
    amountDetails: {
      totalAmount: params.amount,
      currency: params.currency,
    },
    billTo: {
      firstName: params.cardHolderName.trim().split(' ')[0] || 'John',
      lastName: params.cardHolderName.trim().split(' ').slice(1).join(' ') || 'Doe',
      email: params.email,
      country: params.billToCountry,
      locality: params.billToLocality,
      address1: params.billToAddress1,
      administrativeArea: params.billToAdministrativeArea,
      postalCode: params.billToPostalCode,
      phoneNumber: '4158880000',
    },
  }

  const paymentsApi = new sdk.PaymentsApi(configObject, apiClient)

  return await new Promise((resolve, reject) => {
    paymentsApi.createPayment(requestObj, (error: any, data: any, response: any) => {
      if (!error) {
        resolve(data || response?.body || {})
        return
      }

      const status = Number(response?.status || error?.status || 500)
      const headers = response?.headers || error?.response?.headers || {}
      const requestId =
        headers['v-c-correlation-id'] ||
        headers['x-requestid'] ||
        headers['x-request-id'] ||
        null
      const responseBody = response?.body || error?.response?.body || error?.response || error
      const message =
        (typeof responseBody === 'string' && responseBody) ||
        responseBody?.message ||
        responseBody?.response?.rmsg ||
        `CyberSource error ${status}`

      reject(
        new CyberSourceApiError({
          message: String(message),
          status,
          requestId,
          responseBody,
          endpoint: '/pts/v2/payments',
        })
      )
    })
  })
}

// Shared helper to reject a payment SDK promise
function rejectPaymentError(
  reject: (reason: any) => void,
  error: any,
  response: any,
  endpoint: string
) {
  const status = Number(response?.status || error?.status || 500)
  const headers = response?.headers || error?.response?.headers || {}
  const requestId =
    headers['v-c-correlation-id'] ||
    headers['x-requestid'] ||
    headers['x-request-id'] ||
    null
  const responseBody = response?.body || error?.response?.body || error?.response || error
  const message =
    (typeof responseBody === 'string' && responseBody) ||
    responseBody?.message ||
    responseBody?.response?.rmsg ||
    `CyberSource error ${status}`
  reject(
    new CyberSourceApiError({
      message: String(message),
      status,
      requestId,
      responseBody,
      endpoint,
    })
  )
}

export async function cyberSourceUnifiedPaymentViaSdk(params: UnifiedPaymentParams): Promise<any> {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID?.trim()
  const keyId = process.env.CYBERSOURCE_KEY_ID?.trim()
  const sharedSecret = process.env.CYBERSOURCE_SHARED_SECRET?.trim()

  if (!merchantId || !keyId || !sharedSecret) {
    throw new Error('Faltan credenciales REST de CyberSource (merchant_id, key_id o shared_secret)')
  }

  const cybersourceRestApi: any = await import('cybersource-rest-client')
  const sdk = (cybersourceRestApi as any).default || cybersourceRestApi

  const configObject = {
    authenticationType: 'http_signature',
    runEnvironment: getRunEnvironmentHost(),
    merchantID: merchantId,
    merchantKeyId: keyId,
    merchantsecretKey: sharedSecret,
    logConfiguration: { enableLog: false },
  }

  const apiClient = new sdk.ApiClient()
  const requestObj = new sdk.CreatePaymentRequest()

  requestObj.clientReferenceInformation = { code: params.paymentReference }
  requestObj.processingInformation = {
    capture: false,
    commerceIndicator: params.commerceIndicator || 'internet',
  }
  // Transient token from Microform v2 — card data is embedded, do NOT add paymentInformation.card.
  // Only authenticationTransactionId (enrollment-internal) causes CyberSource to look for
  // paymentAccountInformation.card.number → 400; the 3DS result fields (cavv, eciRaw, xid,
  // acsTransactionId, threeDSServerTransactionId, directoryServerTransactionId) must be sent.
  requestObj.tokenInformation = {
    transientTokenJwt: params.transientToken,
  }
  if (params.consumerAuthInfo) {
    requestObj.consumerAuthenticationInformation = params.consumerAuthInfo
  }
  // billTo triggers country validation on the payments endpoint in some environments.
  // The card/billing data is already embedded in the Microform transient token.
  requestObj.orderInformation = {
    amountDetails: {
      totalAmount: params.amount,
      currency: params.currency,
    },
  }

  const paymentsApi = new sdk.PaymentsApi(configObject, apiClient)

  const authResponse: any = await new Promise((resolve, reject) => {
    paymentsApi.createPayment(requestObj, (error: any, data: any, response: any) => {
      if (!error) {
        resolve(data || response?.body || {})
        return
      }
      rejectPaymentError(reject, error, response, '/pts/v2/payments')
    })
  })

  // Separate capture step (capture:false above does auth-only, this settles the funds)
  const authId = String(authResponse?.id || '')
  const authStatus = String(authResponse?.status || '').toUpperCase()
  const okAuthStatuses = ['AUTHORIZED', 'AUTHORIZED_PENDING_REVIEW', 'PENDING_AUTHENTICATION']
  if (!authId || !okAuthStatuses.includes(authStatus)) {
    return authResponse
  }

  const captureRequestObj = new sdk.CapturePaymentRequest()
  captureRequestObj.clientReferenceInformation = { code: `${params.paymentReference}-CAP` }
  captureRequestObj.orderInformation = {
    amountDetails: { totalAmount: params.amount, currency: params.currency },
  }

  const captureApi = new sdk.CaptureApi(configObject, new sdk.ApiClient())

  const captureResponse: any = await new Promise((resolve, reject) => {
    captureApi.capturePayment(
      captureRequestObj,
      authId,
      (error: any, data: any, response: any) => {
        if (!error) {
          resolve(data || response?.body || {})
          return
        }
        rejectPaymentError(reject, error, response, `/pts/v2/payments/${authId}/captures`)
      }
    )
  })

  // Return a merged response that confirm-payment route can interpret the same way
  return {
    ...authResponse,
    captureId: String(captureResponse?.id || authId),
    captureStatus: String(captureResponse?.status || '').toUpperCase(),
  }
}

// ─── Payer Authentication (3DS) via SDK ────────────────────────────────────

type BillTo = {
  firstName: string
  lastName: string
  email: string
  country: string
  locality: string
  address1: string
  administrativeArea: string
  postalCode: string
  phoneNumber: string
}

type PayerAuthSetupParams = {
  paymentReference: string
  transientToken: string
  amount: string
  currency: string
  billTo: BillTo
  cardType?: string
}

type BrowserInfo = {
  browserLanguage?: string
  browserUserAgent?: string
  browserAcceptHeader?: string
  browserJavascriptEnabled?: boolean
  browserJavaEnabled?: boolean
  browserColorDepth?: string
  browserScreenHeight?: string
  browserScreenWidth?: string
  browserTimeZone?: string
}

type PayerAuthEnrollParams = {
  paymentReference: string
  transientToken: string
  referenceId: string
  returnUrl: string
  amount: string
  currency: string
  billTo: BillTo
  cardType?: string
  browserInfo?: BrowserInfo
}

type PayerAuthValidateParams = {
  authenticationTransactionId: string
}

function buildPayerAuthSdkConfig(sdk: any): { configObject: any; buildApiClient: () => any } {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID?.trim()
  const keyId = process.env.CYBERSOURCE_KEY_ID?.trim()
  const sharedSecret = process.env.CYBERSOURCE_SHARED_SECRET?.trim()
  if (!merchantId || !keyId || !sharedSecret) {
    throw new Error('Faltan credenciales REST de CyberSource')
  }
  const configObject = {
    authenticationType: 'http_signature',
    runEnvironment: getRunEnvironmentHost(),
    merchantID: merchantId,
    merchantKeyId: keyId,
    merchantsecretKey: sharedSecret,
    logConfiguration: { enableLog: false },
  }
  return { configObject, buildApiClient: () => new sdk.ApiClient() }
}

export async function cyberSourcePayerAuthSetupViaSdk(params: PayerAuthSetupParams): Promise<any> {
  const cybersourceRestApi: any = await import('cybersource-rest-client')
  const sdk = (cybersourceRestApi as any).default || cybersourceRestApi
  const { configObject, buildApiClient } = buildPayerAuthSdkConfig(sdk)

  const requestObj = new sdk.PayerAuthSetupRequest()
  requestObj.clientReferenceInformation = { code: `${params.paymentReference}-3DS-SETUP` }
  requestObj.tokenInformation = { transientTokenJwt: params.transientToken }
  // Setup only needs amount to initiate device fingerprinting; billTo is for enrollment.
  // Sending billTo here triggers country validation on the risk endpoint and can cause 400.
  requestObj.orderInformation = {
    amountDetails: { totalAmount: params.amount, currency: params.currency },
  }
  if (params.cardType) {
    requestObj.paymentInformation = { card: { type: params.cardType } }
  }

  const api = new sdk.PayerAuthenticationApi(configObject, buildApiClient())
  return new Promise((resolve, reject) => {
    api.payerAuthSetup(requestObj, (error: any, data: any, response: any) => {
      if (!error) { resolve(data || response?.body || {}); return }
      rejectPaymentError(reject, error, response, '/risk/v1/authentication-setups')
    })
  })
}

export async function cyberSourcePayerAuthEnrollViaSdk(params: PayerAuthEnrollParams): Promise<any> {
  const cybersourceRestApi: any = await import('cybersource-rest-client')
  const sdk = (cybersourceRestApi as any).default || cybersourceRestApi
  const { configObject, buildApiClient } = buildPayerAuthSdkConfig(sdk)

  const requestObj = new sdk.CheckPayerAuthEnrollmentRequest()
  requestObj.clientReferenceInformation = { code: `${params.paymentReference}-3DS-AUTH` }
  requestObj.consumerAuthenticationInformation = {
    referenceId: params.referenceId,
    returnUrl: params.returnUrl,
    transactionMode: 'eCommerce',
  }
  requestObj.tokenInformation = { transientTokenJwt: params.transientToken }
  // billTo triggers country validation on the risk endpoint → 400 for some countries.
  // The billing address is sent separately in the payment authorization step.
  requestObj.orderInformation = {
    amountDetails: { totalAmount: params.amount, currency: params.currency },
  }
  if (params.cardType) {
    requestObj.paymentInformation = { card: { type: params.cardType } }
  }
  // 3DS2 requires browser data; without it the Directory Server returns error 201.
  // CyberSource SDK field names differ from 3DS spec names:
  //   browserLanguage      → httpBrowserLanguage
  //   browserUserAgent     → userAgentBrowserValue
  //   browserAcceptHeader  → httpAcceptContent
  //   browserColorDepth    → httpBrowserColorDepth
  //   browserScreenHeight  → httpBrowserScreenHeight
  //   browserScreenWidth   → httpBrowserScreenWidth
  //   browserJavaEnabled   → httpBrowserJavaEnabled
  //   browserTimeZone      → httpBrowserTimeDifference
  if (params.browserInfo) {
    const b = params.browserInfo
    requestObj.deviceInformation = {
      ...(b.browserLanguage     && { httpBrowserLanguage:  b.browserLanguage }),
      ...(b.browserUserAgent    && { userAgentBrowserValue: b.browserUserAgent }),
      ...(b.browserAcceptHeader && { httpAcceptContent:    b.browserAcceptHeader }),
      ...(b.browserColorDepth   && { httpBrowserColorDepth:     b.browserColorDepth }),
      ...(b.browserScreenHeight && { httpBrowserScreenHeight:   b.browserScreenHeight }),
      ...(b.browserScreenWidth  && { httpBrowserScreenWidth:    b.browserScreenWidth }),
      ...(b.browserTimeZone     && { httpBrowserTimeDifference: b.browserTimeZone }),
      browserJavascriptEnabled: b.browserJavascriptEnabled ?? true,
      httpBrowserJavaEnabled:   b.browserJavaEnabled       ?? false,
    }
  }

  const api = new sdk.PayerAuthenticationApi(configObject, buildApiClient())
  return new Promise((resolve, reject) => {
    api.checkPayerAuthEnrollment(requestObj, (error: any, data: any, response: any) => {
      if (!error) { resolve(data || response?.body || {}); return }
      rejectPaymentError(reject, error, response, '/risk/v1/authentications')
    })
  })
}

export async function cyberSourcePayerAuthValidateViaSdk(params: PayerAuthValidateParams): Promise<any> {
  const cybersourceRestApi: any = await import('cybersource-rest-client')
  const sdk = (cybersourceRestApi as any).default || cybersourceRestApi
  const { configObject, buildApiClient } = buildPayerAuthSdkConfig(sdk)

  const requestObj = new sdk.ValidateRequest()
  requestObj.consumerAuthenticationInformation = {
    authenticationTransactionId: params.authenticationTransactionId,
  }

  const api = new sdk.PayerAuthenticationApi(configObject, buildApiClient())
  return new Promise((resolve, reject) => {
    api.validateAuthenticationResults(requestObj, (error: any, data: any, response: any) => {
      if (!error) { resolve(data || response?.body || {}); return }
      rejectPaymentError(reject, error, response, '/risk/v1/authentication-results')
    })
  })
}
