import { BlueCodeClient, BASE_URL_PRODUCTION, ENDPOINT_CANCEL } from "./BlueCodeClient";
import { ErrorResponse } from "./ErrorResponse";
import { ERROR_SYSTEM_FAILURE, ERROR_LIMIT_EXCEEDED, STATUS_APPROVED, STATUS_DECLINED, ERROR_TIMEOUT, ERROR_UNAVAILABLE } from "../util/error-messages";
import { wait } from "./wait";
import { nullProgress, consoleProgress } from "./console-progress";
import { createRetryingCaller, setBackoffTime } from "./caller";

const APPROVED_RESPONSE = {
  result: "OK",
  payment: {
    state: STATUS_APPROVED,
    merchant_tx_id: "tx-1234",
    acquirer_tx_id: "ABCDEF123400001111222",
    scheme: "BLUE_CODE",
    total_amount: 100,
    requested_amount: 100,
    consumer_tip_amount: 0,
    slip_note: "www.bluecode.com"
  }
}

const DECLINED_RESPONSE = {
  result: "OK",
  payment: {
    state: STATUS_DECLINED,
    code: ERROR_LIMIT_EXCEEDED,
    acquirer_tx_id: "ABCDEF123400001111222"
  }
}

let PROCESSING_RESPONSE = {
  result: "PROCESSING",
  status: {
    merchant_tx_id: "tx-1234",
    check_status_in: 1,
    ttl: 30000
  }
}

// set retry period to zero to speed up tests.
setBackoffTime(0)

it('handles payments with immediate approval', () => {
  let caller = jest.fn().mockImplementation(async () => APPROVED_RESPONSE)

  let client = new BlueCodeClient('foo', 'bar', BASE_URL_PRODUCTION, caller)

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

  let client = new BlueCodeClient('foo', 'bar', BASE_URL_PRODUCTION, caller)

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
  
  let client = new BlueCodeClient('foo', 'bar', BASE_URL_PRODUCTION, caller)

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
  let client = new BlueCodeClient('foo', 'bar', BASE_URL_PRODUCTION, caller)

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
  let client = new BlueCodeClient('foo', 'bar', BASE_URL_PRODUCTION, createRetryingCaller(caller))

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