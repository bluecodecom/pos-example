import { NonCanceledTimeouts } from "./NonCanceledTimeouts";
import { setBackoffTime } from "./caller";
import { wait } from "./wait";
import { consoleProgress, nullProgress } from "./console-progress";
import { getLocalStorage } from "../util/local-storage";
import { ErrorResponse } from "./ErrorResponse";
import { ERROR_TIMEOUT } from "../util/error-messages";

const merchantTxId = 1234

setBackoffTime(0)

it('cancels added transactions', async () => {
  let cancel = jest.fn().mockImplementation(async () => {})
  let timeouts = new NonCanceledTimeouts(cancel)
  getLocalStorage().clear()

  expect.assertions(1)

  timeouts.add(merchantTxId, nullProgress)

  await wait(1)

  await expect(cancel).toBeCalledWith(merchantTxId, nullProgress)
})

// this test is identical to the previous one but lacks a wait before the final expect.
// we want cancels to start immediately, not after a retry delay
it('cancels added transactions synchronously', async () => {
  let cancel = jest.fn().mockImplementation(async () => {})
  let timeouts = new NonCanceledTimeouts(cancel)
  getLocalStorage().clear()

  expect.assertions(1)

  timeouts.add(merchantTxId, nullProgress)

  await expect(cancel).toBeCalledWith(merchantTxId, nullProgress)
})

it('reports isStillCanceling correctly', async () => {
  let cancel = async () => {}
  let timeouts = new NonCanceledTimeouts(cancel)
  getLocalStorage().clear()

  expect(timeouts.isStillCanceling()).toBeFalsy()

  timeouts.add(merchantTxId, nullProgress)

  expect(timeouts.isStillCanceling()).toBeTruthy()

  // wait for cancel to run
  await wait(1)

  expect(timeouts.isStillCanceling()).toBeFalsy()
})

function createFailOnceCaller() {
  let callCount = 0

  return jest.fn().mockImplementation(async () => {
      if (callCount++ == 0) {
        throw new ErrorResponse('Retry me', ERROR_TIMEOUT)
      }
      else {
        return {}
      }
    })
}

it('retries added transactions', async () => {
  let cancel = createFailOnceCaller()

  let timeouts = new NonCanceledTimeouts(cancel)
  getLocalStorage().clear()

  expect.assertions(1)

  timeouts.add(merchantTxId, nullProgress)

  await wait(5)

  await expect(cancel).toHaveBeenCalledTimes(2)
})