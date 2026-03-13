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
