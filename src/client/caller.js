import * as progress from './console-progress'  // eslint-disable-line no-unused-vars
import { wait } from './wait'

import { 
  ERROR_TIMEOUT,
  ERROR_UNAVAILABLE,
  ERROR_SYSTEM_FAILURE
} from '../util/error-messages'

import { 
  mapKeys,
  camelCaseToSnakeCase, 
  snakeCaseToCamelCase
} from './client-util.js'

import { consoleProgress } from './console-progress'

import { ErrorResponse } from './ErrorResponse'
import { CanceledError } from './CanceledError'

const DEFAULT_TIMEOUT_MS = 10000
/** Time between retries */
export let BACKOFF_TIME_MS = 2000
export const MAX_RETRIES = 2

export function setBackoffTime(backoffTimeMs) {
  BACKOFF_TIME_MS = backoffTimeMs
}

/**
  * @typedef { function(endpoint: string, payload: Object, progress: progress.Progress) => Promise<Object> } Caller 
  * @param {string} endpoint Should start with a slash.
  * @param {progress.Progress} [progress] Pass a Progress object to get status notifications and be able to cancel.
  * @param {*} payload POST payload. Will be converted into JSON (including converting camel case to snake case)
  * @param {number} [retryIndex] Unset for the first call. 1 on the first retry etc.
  */

/**
  * @param { Caller } delegateCaller
  * @returns Caller
  */
export function createRetryingCaller(delegateCaller) {
  /**
    * @param {string} endpoint
    * @param {progress.Progress} [progress]
    * @param {*} payload
    * @param {number} retryIndex 0 for the first call. 1 on the first retry etc.
    */
  async function retry(endpoint, payload, progress, retryIndex) {
    try {
      return await delegateCaller(endpoint, payload, progress)
    }
    catch (e) {
      if (e.code === ERROR_UNAVAILABLE || e.code === ERROR_TIMEOUT) {
        if (retryIndex < MAX_RETRIES) {
          progress.onProgress(`Could not reach ${endpoint} (${e.code}). Retrying...`)

          await wait(BACKOFF_TIME_MS, progress)
    
          return await retry(endpoint, payload, progress, retryIndex+1)
        }
        else {
          throw new ErrorResponse('Could not reach ' + endpoint + '.', e.code)
        }
      }

      throw e
    }
  }

  return (endpoint, payload, progress) => 
    retry(endpoint, payload, progress || consoleProgress, 0)  
}

/**
  * @type Caller
  * Perform an API call.
  */
export function createCaller(username, password, baseUrl) {
  return (endpoint, payload, progress, retryIndex) => {
    progress = progress || consoleProgress

    let timeoutMs = DEFAULT_TIMEOUT_MS

    progress.onProgress('Calling ' + endpoint + '...')

    return new Promise((resolve, reject) => {

      // we're using XHR rather than fetch() because fetch 
      // does not support aborting the request
      let xhr = new XMLHttpRequest()

      xhr.open('POST', baseUrl + endpoint, true)

      xhr.timeout = timeoutMs
      xhr.responseType = 'json'

      xhr.setRequestHeader('Content-type', 'application/json')
      xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(username + ':' + password))

      let didCancel = false

      // let the progress object know how to cancel the current request.
      // if cancelled, we will throw a CancelError which aborts everything.
      progress.onCancellable(() => {
        didCancel = true

        xhr.abort()
      })

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response)
          }
          else if (didCancel) {
            reject(new CanceledError())
          }
          else if (xhr.status === 0) {
            reject(new ErrorResponse('Timeout or offline.', ERROR_TIMEOUT))
          }
          else if (xhr.status === 503) {
            reject(new ErrorResponse('Server replied with status 503', ERROR_UNAVAILABLE))
          }
          else {
            // test if there was a JSON error response from the server
            // (there might not be on 500 errors)
            if (xhr.response && xhr.response.result) {
              let response = mapKeys(xhr.response, snakeCaseToCamelCase)

              // if there was, include it in the exception so clients get
              // more information
              reject(new ErrorResponse(
                  'Error response ' + getErrorCode(response),
                  getErrorCode(response),
                  response, 
                  retryIndex))
            }
            else {
              reject(new ErrorResponse(
                  'Request to ' + endpoint + ' resulted in status ' + xhr.status, 
                  ERROR_SYSTEM_FAILURE))
            }
          }
        }
      }

      xhr.send(JSON.stringify(mapKeys(payload, camelCaseToSnakeCase)))
    })
    .then(json => {
      let result = mapKeys(json, snakeCaseToCamelCase)

      if (result.result === 'ERROR') {
        throw new ErrorResponse(
          'Call to ' + endpoint + ' failed: ' + JSON.stringify(result), 
          getErrorCode(result), 
          result)
      }

      return result
    })
  }
}

/**
  * Find the error code in a JSON response.
  * Depending on the call, the error code is either `error_code` or `payment.code`
  */
function getErrorCode(jsonResponse) {
  return jsonResponse.errorCode 
    || (jsonResponse.payment && jsonResponse.payment.code) || ERROR_SYSTEM_FAILURE
}


