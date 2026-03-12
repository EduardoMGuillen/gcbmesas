'use strict'

const cybersourceRestApi = require('cybersource-rest-client')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })
dotenv.config()

function requiredEnv(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return String(value).trim()
}

function getRunEnvironment() {
  const customHost = process.env.CYBERSOURCE_RUN_ENV_HOST
  if (customHost && customHost.trim()) return customHost.trim()
  const env = (process.env.CYBERSOURCE_ENV || 'test').toLowerCase()
  return env === 'live' ? 'api.cybersource.com' : 'apitest.cybersource.com'
}

function buildConfig() {
  return {
    authenticationType: 'http_signature',
    runEnvironment: getRunEnvironment(),
    merchantID: requiredEnv('CYBERSOURCE_MERCHANT_ID'),
    merchantKeyId: requiredEnv('CYBERSOURCE_KEY_ID'),
    merchantsecretKey: requiredEnv('CYBERSOURCE_SHARED_SECRET'),
    logConfiguration: {
      enableLog: false,
    },
  }
}

function createTestRequest() {
  const req = new cybersourceRestApi.CreatePaymentRequest()

  const clientReferenceInformation = new cybersourceRestApi.Ptsv2paymentsClientReferenceInformation()
  clientReferenceInformation.code = `SDK-SMOKE-${Date.now()}`
  req.clientReferenceInformation = clientReferenceInformation

  const processingInformation = new cybersourceRestApi.Ptsv2paymentsProcessingInformation()
  processingInformation.capture = false
  processingInformation.commerceIndicator = 'internet'
  req.processingInformation = processingInformation

  const paymentInformation = new cybersourceRestApi.Ptsv2paymentsPaymentInformation()
  const card = new cybersourceRestApi.Ptsv2paymentsPaymentInformationCard()
  card.number = '4111111111111111'
  card.expirationMonth = '12'
  card.expirationYear = '2031'
  paymentInformation.card = card
  req.paymentInformation = paymentInformation

  const orderInformation = new cybersourceRestApi.Ptsv2paymentsOrderInformation()
  const amountDetails = new cybersourceRestApi.Ptsv2paymentsOrderInformationAmountDetails()
  amountDetails.totalAmount = process.env.CYBS_SMOKE_AMOUNT || '10.00'
  amountDetails.currency = process.env.CYBS_SMOKE_CURRENCY || 'USD'
  orderInformation.amountDetails = amountDetails

  const billTo = new cybersourceRestApi.Ptsv2paymentsOrderInformationBillTo()
  billTo.firstName = 'Test'
  billTo.lastName = 'Merchant'
  billTo.address1 = '1 Market St'
  billTo.locality = 'San Francisco'
  billTo.administrativeArea = 'CA'
  billTo.postalCode = '94105'
  billTo.country = 'US'
  billTo.email = 'test@cybs.com'
  billTo.phoneNumber = '4158880000'
  orderInformation.billTo = billTo
  req.orderInformation = orderInformation

  return req
}

function runSmokeTest() {
  const config = buildConfig()
  const apiClient = new cybersourceRestApi.ApiClient()
  const paymentsApi = new cybersourceRestApi.PaymentsApi(config, apiClient)
  const request = createTestRequest()

  console.log('Running CyberSource SDK smoke test...')
  console.log(`- Host: ${config.runEnvironment}`)
  console.log(`- Merchant ID: ${config.merchantID}`)
  console.log('- Endpoint: /pts/v2/payments')

  return new Promise((resolve, reject) => {
    paymentsApi.createPayment(request, (error, data, response) => {
      const statusCode = response?.status || error?.status || 'unknown'
      const headers = response?.headers || error?.response?.headers || {}
      const requestId = headers['v-c-correlation-id'] || headers['x-request-id'] || null
      const body = response?.body || error?.response?.body || error?.response || error

      console.log(`- HTTP Status: ${statusCode}`)
      console.log(`- Request ID: ${requestId || 'n/a'}`)
      if (body) {
        console.log('- Response body:')
        console.log(JSON.stringify(body, null, 2))
      }

      if (error) {
        return reject(new Error(`Smoke test failed with status ${statusCode}`))
      }

      console.log('- Payment status:', data?.status || 'n/a')
      resolve()
    })
  })
}

runSmokeTest()
  .then(() => {
    console.log('Smoke test completed successfully.')
  })
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
