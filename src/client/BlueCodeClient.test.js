import { BlueCodeClient, BASE_URL_PRODUCTION, ENDPOINT_CANCEL, ENDPOINT_PAYMENT, ENDPOINT_STATUS } from './BlueCodeClient';
import { ErrorResponse } from './ErrorResponse';
import { ERROR_SYSTEM_FAILURE, ERROR_LIMIT_EXCEEDED, STATUS_APPROVED, STATUS_DECLINED, ERROR_TIMEOUT, ERROR_UNAVAILABLE, ERROR_MERCHANT_TX_ID_NOT_UNIQUE } from '../util/error-messages';
import { wait } from './wait';
import { nullProgress, consoleProgress } from './console-progress';
import { createRetryingCaller, setBackoffTime } from './caller';
import * as caller from './caller.js' // eslint-disable-line no-unused-vars
import * as progress from './console-progress' // eslint-disable-line no-unused-vars
import { CanceledError } from './CanceledError';
import { getLocalStorage } from '../util/local-storage';

// note that the XHR caller converts snake case to camel case and vice versa, 
// so we are only dealing with camel case here, even though the actual responses
// are in snake case 
export const APPROVED_RESPONSE = {
  result: 'OK',
  payment: {
    state: STATUS_APPROVED,
    merchantTxId: 'tx-1234',
    acquirerTxId: 'ABCDEF123400001111222',
    scheme: 'BLUE_CODE',
    totalAmount: 100,
    requestedAmount: 100,
    consumerTipAmount: 0,
    slip_note: 'www.bluecode.com'
  }
}

const DECLINED_RESPONSE = {
  result: 'OK',
  payment: {
    state: STATUS_DECLINED,
    code: ERROR_LIMIT_EXCEEDED,
    acquirerTxId: 'ABCDEF123400001111222'
  }
}

let PROCESSING_RESPONSE = {
  result: 'PROCESSING',
  status: {
    merchantTxId: 'tx-1234',
    checkStatusIn: 1,
    ttl: 30000
  }
}

// set retry period to zero to speed up tests.
setBackoffTime(0)

/** @param {caller.Caller} caller */
const createClient = (caller) =>
  new BlueCodeClient('foo', 'bar', BASE_URL_PRODUCTION, (caller))

it('handles payments with immediate approval', () => {
  let caller = jest.fn().mockImplementation(async () => APPROVED_RESPONSE)

  let client = createClient(caller)

  expect.assertions(1)

  return expect(
      client.pay(
        { 
          branchExtId: 'foo', 
          barcode: '1234', 
          requestedAmount: 100 
        }, 
        nullProgress)
    )
    .resolves
    .toEqual(APPROVED_RESPONSE.payment)
})

it('handles declined payments', () => {
  let caller = jest.fn().mockImplementation(async () => DECLINED_RESPONSE)

  let client = createClient(caller)

  expect.assertions(1)

  return expect(
      client.pay(
        { 
          branchExtId: 'foo', 
          barcode: '1234', 
          requestedAmount: 100 
        }, 
        nullProgress)
    )
    .rejects
    .toEqual(new ErrorResponse(`Payment state: ${STATUS_DECLINED}, code ${ERROR_LIMIT_EXCEEDED}`, 1))
})

it('handles payments with PROCESSING response', () => {
  let callCount = 0
  
  let caller = jest.fn().mockImplementation(async () => 
    (callCount++ == 0 ? PROCESSING_RESPONSE : APPROVED_RESPONSE))
  
  let client = createClient(caller)

  expect.assertions(1)

  return expect(
      client.pay(
        { 
          branchExtId: 'foo', 
          barcode: '1234', 
          requestedAmount: 100 
        }, 
        nullProgress)
    )
    .resolves
    .toEqual(APPROVED_RESPONSE.payment)
})

it('respects TTL of PROCESSING response', async () => {
  const RESPONSE = {
    result: 'PROCESSING',
    status: {
      merchantTxId: 'tx-1234',
      // check status twice, then the TTL will be exceeded
      checkStatusIn: 2,
      ttl: 5
    }
  }

  let callCountByEndpoint = {}

  let caller = 
    async (endpoint, payload, progress) => {
      callCountByEndpoint[endpoint] = (callCountByEndpoint[endpoint] || 0) + 1

      return {
        [ENDPOINT_PAYMENT]: RESPONSE,
        [ENDPOINT_STATUS]: RESPONSE,
        [ENDPOINT_CANCEL]: {}
      }[endpoint]
    }
  
  let client = createClient(caller)

  expect.assertions(3)

  await expect(
      client.pay(
        { 
          branchExtId: 'foo', 
          barcode: '1234', 
          requestedAmount: 100 
        }, 
        nullProgress)
    )
    .rejects
    .toEqual(new ErrorResponse('Payment timed out.', ERROR_TIMEOUT))

  // it's called once after two ms, once more after four. 
  // the client then waits two more ms and finds out the ttl has been exceeded.

  // it's entirely possible to execute less than two times in case the event 
  // loop is busy and we don't have time to execute twice; what we're mainly 
  // testing is anyway that it does abort after the TTL is expired.
  expect(callCountByEndpoint[ENDPOINT_STATUS]).toBeLessThanOrEqual(2)

  // cancel after the ttl expires
  expect(callCountByEndpoint[ENDPOINT_CANCEL]).toEqual(1)
})

it('handles manual cancellation', async () => {
  /** @type {function() => Promise<any>} */
  let cancel

  /** @type {progress.Progress} */
  let progress = { 
    ... nullProgress, 
    ... {
      // when we call pay, the progress object will receive a method
      // that can be used for canceling the call.
      onCancellable: (gotCancel) => cancel = gotCancel
    }
  }

  /** @type {caller.Caller} */
  let caller = jest.fn().mockImplementation(
    (endpoint, payload, progress) => ({
      [ENDPOINT_PAYMENT]: 
        new Promise((resolve, reject) => {
          // when payment is called, we will just hang (return an unresovled Promise).
          // we need to let the progress object know how to cancel the call. 
          // this is equivalent to what xhrCaller is doing, 
          // except it also closes the HTTP connection
          progress.onCancellable(() => reject(new CanceledError()))
        }),
      [ENDPOINT_CANCEL]: Promise.resolve({})
      }[endpoint])
    )

  const merchantTxId = 'abcd'
  let client = createClient(caller)
  getLocalStorage().clear()

  expect.assertions(2)

  let paymentResult = client.pay(
    { 
      branchExtId: 'foo', 
      barcode: '1234', 
      requestedAmount: 100,
      merchantTxId 
    }, 
    progress)

  cancel()

  await expect(paymentResult)
    .rejects
    .toBeInstanceOf(CanceledError)

  // expect the cancel endpoint to be called
  return expect(caller).toBeCalledWith(ENDPOINT_CANCEL, {merchantTxId}, progress)
})

it('cancels payments failing due to SYSTEM_FAILURE', async () => {
  let callCount = 0

  let caller = jest.fn().mockImplementation(async () => {
    if (callCount++ == 0) {
      throw new ErrorResponse('Failure', ERROR_SYSTEM_FAILURE)
    }
    else {
      return {}
    }
  })

  const merchantTxId = 'abcd'
  let client = createClient(caller)

  expect.assertions(2)

  // expect the payment call to fail
  await expect(
      client.pay({ 
        branchExtId: 'foo', 
        barcode: '1234', 
        requestedAmount: 100,
        merchantTxId
      }, nullProgress)
    )
    .rejects
    .toBeInstanceOf(ErrorResponse)

  // expect cancel to be called
  return expect(caller).toBeCalledWith(ENDPOINT_CANCEL, {merchantTxId}, nullProgress)
})

/** this tests the interactions of retry and cancel strategies that are otherwise only tested in isolation. */
it('handles a complex sequence of failures', async () => {
  let callCount = 0
  const FAILURE_MESSAGE = 'Fatal failure.'

  let caller = jest.fn().mockImplementation(async () => {
    callCount++

    // the payment first times out...
    if (callCount == 1) {
      throw new ErrorResponse('Timeout', ERROR_TIMEOUT)
    }
    // then fails.
    else if (callCount == 2) {
      throw new ErrorResponse(FAILURE_MESSAGE, ERROR_SYSTEM_FAILURE)
    }
    // the subsequent cancellation first encounters a 503...
    else if (callCount == 3) {
      throw new ErrorResponse('503', ERROR_UNAVAILABLE)
    }
    // then succeeds.
    else {
      return {}
    }
  })

  const merchantTxId = 'abcd'

  // note that we wrap the caller in a retrying caller like the production code does with the xhrCaller. 
  // the retrying caller is tested elsewhere but not together with the client.
  let client = createClient(createRetryingCaller(caller))

  expect.assertions(4)

  // this will perform the first three calls: payment (timeout), payment (failure), cancel (503)
  await expect(
      client.pay({ 
        branchExtId: 'foo', 
        barcode: '1234', 
        requestedAmount: 100,
        merchantTxId
      }, nullProgress)
    )
    .rejects
    .toEqual(new ErrorResponse(FAILURE_MESSAGE, ERROR_SYSTEM_FAILURE))

  // if you get two calls here, the semantics of the NonCanceledTimeouts probably changed so 
  // that the first call is not synchronous (it should be)
  expect(caller).toHaveBeenCalledTimes(3)

  // the final cancel will run asynchronously and will succeed
  await wait(1)

  expect(caller).toHaveBeenCalledTimes(4)

  // expect cancel to be called
  return expect(caller).toBeCalledWith(ENDPOINT_CANCEL, {merchantTxId}, nullProgress)
})

/**
 * This is based on an actual situation when the sandbox was not behaving as it should.
 * The first payment call times out, the second returns MERCHANT_TX_ID_NOT_UNIQUE at 
 * which point it should treat the request as successful, check the status and 
 * retry if processing.
 */
it('handles a timeout during payment followed by a processing response', async () => {
  let callCount = 0

  let caller = async (endpoint) => {
    callCount++

    // the payment first times out...
    if (callCount == 1) {
      throw new ErrorResponse('Timeout', ERROR_TIMEOUT)
    }
    // then responds with the first call having been successful.
    else if (callCount == 2) {
      throw new ErrorResponse('Turns out the first payment call actually succeeded.', ERROR_MERCHANT_TX_ID_NOT_UNIQUE)
    }
    else if (callCount == 3) {
      expect(endpoint).toBe('/status')

      return PROCESSING_RESPONSE
    }
    // and only on the second status call succeeds.
    else if (callCount == 4) {
      expect(endpoint).toBe('/status')

      return APPROVED_RESPONSE
    }
    else {
      return {}
    }
  }

  const merchantTxId = 'abcd'

  // wrap the caller in a retrying caller like the production code does, 
  // since it's the retry behavior we're testing
  let client = createClient(createRetryingCaller(caller))

  expect.assertions(4)

  await expect(
      client.pay({ 
        branchExtId: 'foo', 
        barcode: '1234', 
        requestedAmount: 100,
        merchantTxId
      }, consoleProgress)
    )
    .resolves
    .toEqual(APPROVED_RESPONSE.payment)

  expect(callCount).toBe(4)
})

/**
 * @param {(client: BlueCodeClient) => void} call
 */
function testSimpleCall(call) {
  const RESPONSE = { result: 'OK' }
  let caller = jest.fn().mockImplementation(async () => RESPONSE)

  let client = createClient(caller)

  expect.assertions(1)

  return expect(
      call(client)
    )
    .resolves
    .toEqual(RESPONSE)
}

it('handles approved refunds', () => {
  testSimpleCall(
    (client) => 
      client.refund('1234', 123, null, nullProgress))
})

it('handles successful loyalty status calls', () => {
  testSimpleCall(
    (client) => 
      client.loyaltyStatus('1234', nullProgress))
})

it('handles successful redemption of rewards refunds', () => {
  testSimpleCall(
    (client) => 
      client.redeemReward('1234', nullProgress))
})
