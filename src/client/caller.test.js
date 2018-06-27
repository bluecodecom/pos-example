import { createRetryingCaller, setBackoffTime, MAX_RETRIES } from "../../src/client/caller";
import { ErrorResponse } from "../../src/client/ErrorResponse";
import { ERROR_TIMEOUT, ERROR_SYSTEM_FAILURE } from "../../src/util/error-messages";
import { nullProgress } from "./console-progress";

setBackoffTime(0)

it('retries on timeout', async () => {
  let mockCaller = jest.fn().mockImplementation(async () => {
    throw new ErrorResponse('Retry me', ERROR_TIMEOUT)
  })

  let retryingCaller = createRetryingCaller(mockCaller)
 
  expect.assertions(2)

  await expect(retryingCaller('/any', {}, nullProgress)).rejects.toBeInstanceOf(ErrorResponse)

  expect(mockCaller).toHaveBeenCalledTimes(MAX_RETRIES+1)
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

it('recovers from a single failure', async () => {
  let mockCaller = createFailOnceCaller()

  let retryingCaller = createRetryingCaller(mockCaller)
 
  expect.assertions(2)

  await expect(retryingCaller('/any', {})).resolves.toEqual({})

  expect(mockCaller).toHaveBeenCalledTimes(2)
})

it('does not retry on system failure', async () => {
  let mockCaller = jest.fn().mockImplementation(async () => {
    throw new ErrorResponse('Do not retry me', ERROR_SYSTEM_FAILURE)
  })

  let retryingCaller = createRetryingCaller(mockCaller)
 
  expect.assertions(2)

  await expect(retryingCaller('/any', {})).rejects.toBeInstanceOf(ErrorResponse)

  expect(mockCaller).toHaveBeenCalledTimes(1)
})
