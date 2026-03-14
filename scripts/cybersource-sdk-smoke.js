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

function createTestRequest(cardProfile) {
  const req = new cybersourceRestApi.CreatePaymentRequest()

  const clientReferenceInformation = new cybersourceRestApi.Ptsv2paymentsClientReferenceInformation()
  clientReferenceInformation.code = `SDK-${cardProfile.label.toUpperCase()}-${Date.now()}`
  req.clientReferenceInformation = clientReferenceInformation

  const processingInformation = new cybersourceRestApi.Ptsv2paymentsProcessingInformation()
  processingInformation.capture = false
  processingInformation.commerceIndicator = 'internet'
  req.processingInformation = processingInformation

  const paymentInformation = new cybersourceRestApi.Ptsv2paymentsPaymentInformation()
  const card = new cybersourceRestApi.Ptsv2paymentsPaymentInformationCard()
  card.number = cardProfile.number
  card.expirationMonth = cardProfile.expMonth
  card.expirationYear = cardProfile.expYear
  card.securityCode = cardProfile.cvv
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

function createCaptureRequest(cardProfile) {
  const req = new cybersourceRestApi.CapturePaymentRequest()

  const clientReferenceInformation = new cybersourceRestApi.Ptsv2paymentsClientReferenceInformation()
  clientReferenceInformation.code = `SDK-${cardProfile.label.toUpperCase()}-CAPTURE-${Date.now()}`
  req.clientReferenceInformation = clientReferenceInformation

  const orderInformation = new cybersourceRestApi.Ptsv2paymentsidcapturesOrderInformation()
  const amountDetails = new cybersourceRestApi.Ptsv2paymentsidcapturesOrderInformationAmountDetails()
  amountDetails.totalAmount = process.env.CYBS_SMOKE_AMOUNT || '10.00'
  amountDetails.currency = process.env.CYBS_SMOKE_CURRENCY || 'USD'
  orderInformation.amountDetails = amountDetails
  req.orderInformation = orderInformation

  return req
}

function pickRequestId(response, error) {
  const headers = response?.headers || error?.response?.headers || {}
  return headers['v-c-correlation-id'] || headers['x-requestid'] || headers['x-request-id'] || null
}

function pickBody(response, error) {
  return response?.body || error?.response?.body || error?.response || error
}

const TEST_CARDS = [
  {
    label: 'visa',
    number: '4111111111111111',
    expMonth: '12',
    expYear: '2031',
    cvv: '123',
  },
  {
    label: 'mastercard',
    number: '5555555555554444',
    expMonth: '12',
    expYear: '2031',
    cvv: '123',
  },
  {
    label: 'amex',
    number: '378282246310005',
    expMonth: '12',
    expYear: '2031',
    cvv: '1234',
  },
]

function runSingleSmokeTest(config, cardProfile) {
  const apiClient = new cybersourceRestApi.ApiClient()
  const paymentsApi = new cybersourceRestApi.PaymentsApi(config, apiClient)
  const captureApi = new cybersourceRestApi.CaptureApi(config, apiClient)
  const request = createTestRequest(cardProfile)

  console.log(`\n=== Card: ${cardProfile.label.toUpperCase()} ===`)

  return new Promise((resolve) => {
    paymentsApi.createPayment(request, (error, data, response) => {
      const statusCode = response?.status || error?.status || 'unknown'
      const requestId = pickRequestId(response, error)
      const body = pickBody(response, error)

      console.log(`- AUTH HTTP Status: ${statusCode}`)
      console.log(`- AUTH Request ID: ${requestId || 'n/a'}`)
      if (data?.status) {
        console.log(`- AUTH payment status: ${data.status}`)
      }

      if (error) {
        console.log('- Result: FAIL')
        if (body) {
          console.log('- Response body:')
          console.log(JSON.stringify(body, null, 2))
        }
        resolve({ ok: false, card: cardProfile.label, authStatusCode: statusCode, captureStatusCode: 'skipped' })
        return
      }

      const paymentId = data?.id
      if (!paymentId) {
        console.log('- Result: FAIL')
        console.log('- Missing payment id after authorization.')
        resolve({ ok: false, card: cardProfile.label, authStatusCode: statusCode, captureStatusCode: 'skipped' })
        return
      }

      const captureRequest = createCaptureRequest(cardProfile)
      captureApi.capturePayment(captureRequest, paymentId, (captureError, captureData, captureResponse) => {
        const captureHttpStatus = captureResponse?.status || captureError?.status || 'unknown'
        const captureRequestId = pickRequestId(captureResponse, captureError)
        const captureBody = pickBody(captureResponse, captureError)

        console.log(`- CAPTURE HTTP Status: ${captureHttpStatus}`)
        console.log(`- CAPTURE Request ID: ${captureRequestId || 'n/a'}`)
        if (captureData?.status) {
          console.log(`- CAPTURE status: ${captureData.status}`)
        }

        if (captureError) {
          console.log('- Result: FAIL')
          if (captureBody) {
            console.log('- Capture response body:')
            console.log(JSON.stringify(captureBody, null, 2))
          }
          resolve({
            ok: false,
            card: cardProfile.label,
            authStatusCode: statusCode,
            authPaymentStatus: data?.status || null,
            captureStatusCode: captureHttpStatus,
            captureStatus: captureData?.status || null,
          })
          return
        }

        console.log('- Result: OK')
        resolve({
          ok: true,
          card: cardProfile.label,
          authStatusCode: statusCode,
          authPaymentStatus: data?.status || null,
          captureStatusCode: captureHttpStatus,
          captureStatus: captureData?.status || null,
        })
      })
    })
  })
}

async function runSmokeTest() {
  const config = buildConfig()

  console.log('Running CyberSource SDK smoke test (AUTH + CAPTURE, 3 cards)...')
  console.log(`- Host: ${config.runEnvironment}`)
  console.log(`- Merchant ID: ${config.merchantID}`)
  console.log('- Endpoints: /pts/v2/payments and /pts/v2/payments/{id}/captures')
  console.log(`- Amount: ${process.env.CYBS_SMOKE_AMOUNT || '10.00'}`)
  console.log(`- Currency: ${process.env.CYBS_SMOKE_CURRENCY || 'USD'}`)

  const results = []
  for (const cardProfile of TEST_CARDS) {
    const result = await runSingleSmokeTest(config, cardProfile)
    results.push(result)
  }

  console.log('\n=== Summary ===')
  for (const result of results) {
    console.log(
      `- ${result.card.toUpperCase()}: ${result.ok ? 'OK' : 'FAIL'}` +
        ` auth=${result.authStatusCode}` +
        `${result.authPaymentStatus ? ` authStatus=${result.authPaymentStatus}` : ''}` +
        ` capture=${result.captureStatusCode}` +
        `${result.captureStatus ? ` captureStatus=${result.captureStatus}` : ''}`
    )
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    throw new Error(`Smoke test failed for ${failed.length} card(s).`)
  }
}

runSmokeTest()
  .then(() => {
    console.log('Smoke test completed successfully.')
  })
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
