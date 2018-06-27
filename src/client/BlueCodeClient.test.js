import { BlueCodeClient, BASE_URL_PRODUCTION, ENDPOINT_CANCEL } from "./BlueCodeClient";
import { ErrorResponse } from "./ErrorResponse";
import { ERROR_SYSTEM_FAILURE } from "../util/error-messages";
import { wait } from "./wait";
import { nullProgress } from "./console-progress";

const APPROVED_RESPONSE = {
  result: "OK",
  payment: {
    state: "APPROVED",
    merchant_tx_id: "tx-1234",
    acquirer_tx_id: "ABCDEF123400001111222",
    scheme: "BLUE_CODE",
    total_amount: 100,
    requested_amount: 100,
    consumer_tip_amount: 0,
    slip_note: "www.bluecode.com"
  }
}

it('handles payments with immediate approval', () => {
  let caller = jest.fn().mockImplementation(async () => APPROVED_RESPONSE)

  let client = new BlueCodeClient('foo', 'bar', BASE_URL_PRODUCTION, caller)

  expect.assertions(1);

  return expect(
      client.pay({ 
          branchExtId: 'foo', 
          barcode: '1234', 
          requestedAmount: 100 
      }, nullProgress)
    )
    .resolves
    .toEqual(APPROVED_RESPONSE.payment)
})

it('handles payments with PROCESSING response', () => {
  let PROCESSING_RESPONSE = {
    result: "PROCESSING",
    status: {
      merchant_tx_id: "tx-1234",
      check_status_in: 1,
      ttl: 30000
    }
  }
  
  let callCount = 0
  
  let caller = jest.fn().mockImplementation(async () => 
  (callCount++ == 0 ? PROCESSING_RESPONSE : APPROVED_RESPONSE))
  
  let client = new BlueCodeClient('foo', 'bar', BASE_URL_PRODUCTION, caller)

  expect.assertions(1);

  return expect(
      client.pay({ 
        branchExtId: 'foo', 
        barcode: '1234', 
        requestedAmount: 100 
      }, nullProgress)
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

  expect.assertions(2);

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

  await wait(1)

  // expect cancel to be called
  return expect(caller).toBeCalledWith(ENDPOINT_CANCEL, {merchantTxId}, nullProgress)
})