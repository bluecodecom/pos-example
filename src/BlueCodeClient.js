import './typedefs.js'
import { 
  mapKeys,
  camelCaseToSnakeCase, 
  snakeCaseToCamelCase, 
  dateToString, 
  generateMerchantTxId, 
  requireAttribute
} from './client-util.js'

import { 
  ERROR_TIMEOUT,
  ERROR_SERVICE_UNAVAILABLE,
  ERROR_CANCELLED,
  ERROR_SYSTEM_FAILURE,
  STATUS_CONNECTING,
  STATUS_PROCESSING,
  STATUS_APPROVED,
  STATUS_CANCELED,
  STATUS_REFUNDED 
} from './error-messages'

import { consoleProgress } from './console-progress'
// seems to be the only way to get the jsdoc Progress class declaration into scope
import * as progress from './console-progress' // eslint-disable-line no-unused-vars

import { NonCanceledTimeouts, createNonCanceledTimeoutError } from './NonCanceledTimeouts'

const DEFAULT_TIMEOUT_MS = 10000
export const BACKOFF_TIME_MS = 2000
const MAX_RETRIES = 3

export const BASE_URL_PRODUCTION = 'https://merchant-api.bluecode.com/v4'
export const BASE_URL_SANDBOX = 'https://merchant-api.bluecode.biz/v4'

const ENDPOINT_CANCEL = '/cancel'
const ENDPOINT_STATUS = '/status'
const ENDPOINT_PAYMENT = '/payment'
const ENDPOINT_REFUND = '/refund'


/**
 * Custom error class that includes an error code that can be used to look up an error message.
 */
export class ErrorResponse extends Error {
  /**
   * @param code A string that serves as error code. 
   *  Used to look up the appropriate error message to display in the POS.
   * @param {{}} response The JSON response the server sent, if any.
   * @param {number} retryIndex
   */
  constructor(message, code, response, retryIndex) {
    super(message)

    this.response = response
    this.retryIndex = retryIndex
    this.code = code
  }
}

/**
 * Thrown when a transaction was cancelled using the {@link progress.Progress} object.
 */
class CanceledError extends Error {
  constructor() {
    super('Canceled')

    this.wasCanceled = true
    this.code = ERROR_CANCELLED
  }
}

/**
 * Waits for a specified number of milliseconds.
 * @param {number} ms 
 * @param {progress.Progress} progress 
 */
export function wait(ms, progress) {
  return new Promise((resolve, reject) => {
    progress.onCancellable(() => reject(new CanceledError()))

    setTimeout(resolve, ms)
  })
}

/**
  * Find the error code in a JSON response.
  * Depending on the call, the error code is either `error_code` or `payment.code`
  */
function getErrorCode(jsonResponse) {
  return jsonResponse.errorCode 
    || (jsonResponse.payment && jsonResponse.payment.code) || ERROR_SYSTEM_FAILURE
}

export class BlueCodeClient {  
  constructor(username, password, baseUrl) {
    if (!username || !password) {
      throw new Error('Missing credentials.')
    }
    
    if (!baseUrl) {
      throw new Error('Missing base URL.')
    }
    
    this.username = username
    this.password = password
    this.baseUrl = baseUrl

    this.nonCanceledTimeouts = new NonCanceledTimeouts(this)
  }

  /**
    * Perform an API call.
    * @param {string} endpoint Should start with a slash.
    * @param {progress.Progress} progress
    * @param {*} payload POST payload. Will be converted into JSON (including converting camel case to snake case)
    * @param {number} [retryIndex] Unset for the first call. 1 on the first retry etc.
    */
  call(endpoint, payload, progress, retryIndex) {
    retryIndex = retryIndex || 0
    progress = progress || consoleProgress

    let timeoutMs = DEFAULT_TIMEOUT_MS

    progress.onProgress('Calling ' + endpoint + '...')

    return new Promise((resolve, reject) => {
      if (endpoint !== ENDPOINT_CANCEL && this.nonCanceledTimeouts.isStillCanceling()) {
        reject(createNonCanceledTimeoutError())

        return
      }

      let retry = async (errorCode) => {
        if (retryIndex < MAX_RETRIES) {
          await wait(BACKOFF_TIME_MS, progress)

          progress.onProgress(`Could not reach ${endpoint} (${errorCode}). Retrying...`)

          try {
            resolve(await this.call(endpoint, payload, progress, retryIndex+1))
          }
          catch (e) {
            reject(e)
          }
        }
        else {
          reject(new ErrorResponse('Could not reach ' + endpoint + '.', errorCode))
        }
      }

      // we're using XHR rather than fetch() because fetch 
      // does not support aborting the request
      let xhr = new XMLHttpRequest()
  
      xhr.open('POST', this.baseUrl + endpoint, true)

      xhr.timeout = timeoutMs
      xhr.responseType = 'json'

      xhr.setRequestHeader('Content-type', 'application/json')
      xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(this.username + ':' + this.password))

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
          else if (
              // status 0 means either a timeout, offline or a cancel.
              xhr.status === 0 
              // 503 means the service is overloaded; retry
              || xhr.status === 503) {
            retry(xhr.status === 503 ? ERROR_SERVICE_UNAVAILABLE : ERROR_TIMEOUT)
          }
          else {
            // test if there was a JSON error response from the server
            // (there might not be on 500 errors)
            if (xhr.response && xhr.response.result) {
              let response = mapKeys(xhr.response, snakeCaseToCamelCase)

              // if there was, include it in the exception so clients get
              // more information
              reject(new ErrorResponse(
                  'Error response ' + response.errorCode,
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

  /**
   * Get the payment status on a transaction.
   * @async
   * @param {string} merchantTxId 
   * @param {progress.Progress} [progress]
   * @return {statusResponse} 
  */
  status(merchantTxId, progress) {
    return this.call(ENDPOINT_STATUS, { merchantTxId }, progress)
  }

  /**
   * Cancel a transaction.
   * @async
   * @param {string} merchantTxId 
   * @param {progress.Progress} [progress]
   * @return {statusResponse} 
  */
  cancel(merchantTxId, progress) {
    return this.call(ENDPOINT_CANCEL, { merchantTxId }, progress)
  }

  /**
   * Refund a transaction.
   * @async
   * @param {string} acquirerTxId 
   * @param {number} [amount]
   * @param {string} [reason]
   * @param {progress.Progress} [progress]
   * @return {statusResponse} 
  */
  async refund(acquirerTxId, amount, reason, progress) {
    try {
      let payload = { 
        acquirerTxId, 
        reason 
      }

      if (amount > 0) {
        payload = { amount , ...payload }
      }

      await this.call(ENDPOINT_REFUND, payload, progress)

      progress.onProgress('Refund successful.', STATUS_REFUNDED)
    }
    catch (e) {
      progress.onProgress('Refund failed: ' + e.response.errorCode, e.code)

      throw e
    }
  }

  /**
   * Utility for the payment call. Handles retries but no other error handling.
   * @param {paymentOptions} paymentOptions 
   * @param {progress.Progress} [progress]
   * @return {Promise<statusResponse>}
   */
  async payAndWaitForProcessing(paymentOptions, progress) {
    progress = progress || consoleProgress

    let response
    
    try {
      response = await this.call(ENDPOINT_PAYMENT, paymentOptions, progress)
    }
    catch (e) {
      // we will receive this error if the first transaction was in fact processed, 
      // despite the client receiving a timeout. we now know the transaction was in
      // fact successful.
      if (e.retryIndex > 0 && e.response && e.response.errorCode === 'MERCHANT_TX_ID_NOT_UNIQUE') {
        progress.onProgress('Transaction ID not unique. Seems like the first attempt got through.')

        return await this.status(paymentOptions.merchantTxId, progress)
      }
      // something else went wrong. if the server passed us information on the payment
      // (i.e. it was a rejection), use it to throw a nicer error message
      else if (e.response && e.response.payment) {
        /** @type {statusResponse} */
        let payment = e.response.payment
        
        throw new ErrorResponse(
          'Payment state ' + payment.state + ', code ' + payment.code,
          payment.code,
          e.response,
          e.retryIndex
        )
      }
      else {
        throw e
      }
    }
  
    let startTime = new Date().getTime()

    while (response.result === 'PROCESSING') {
      /** @type {processingStatus} */
      let paymentStatus = response.status
      
      let timeElapsed = new Date().getTime() - startTime

      if (timeElapsed > paymentStatus.ttl) {
        throw new ErrorResponse('Payment timed out.', ERROR_TIMEOUT)
      }

      progress.onProgress('Got response PROCESSING. Will call status endpoint again in ' + 
        Math.round(paymentStatus.checkStatusIn / 1000) + 's...', STATUS_PROCESSING)

      await wait(paymentStatus.checkStatusIn, progress)

      response = await this.status(paymentOptions.merchantTxId, progress)

      let payment = response.payment

      if (response.result !== 'PROCESSING' && (!payment || payment.state !== 'APPROVED')) {
        throw new ErrorResponse(
          'Payment state ' + payment.state + ', code ' + payment.code,
          payment.code,
          response,
          0)
      }
    }

    return response
  }

  /**
   * Perform a payment.
   * @param {paymentOptions} paymentOptions 
   * @param {progress.Progress} [progress]
   * @return {Promise<statusResponse>}
   */
  async pay(paymentOptions, progress) {
    progress = progress || consoleProgress

    /** @type {paymentOptions} */
    let defaults = {
      scheme: 'AUTO',
      currency: 'EUR',
      merchantTxId: generateMerchantTxId(),
      slipDateTime: dateToString(new Date())
    }

    progress.onProgress(null, STATUS_CONNECTING)

    paymentOptions = { ...defaults, ...paymentOptions }

    requireAttribute(paymentOptions, 'barcode')
    requireAttribute(paymentOptions, 'branchExtId')
    requireAttribute(paymentOptions, 'requestedAmount')

    /** @type {statusResponse} */
    let response

    try {
      response = await this.payAndWaitForProcessing(paymentOptions, progress)
  
      if (!response.payment) {
        throw new ErrorResponse('Unexpected response to payment call.', ERROR_SYSTEM_FAILURE, response)
      }
    }
    catch (e) {
      console.error(e)

      let needsCancel = true

      if (e.wasCanceled) {
        progress.onProgress('Canceled.', STATUS_CANCELED)        
      }
      else {
        progress.onProgress('Fatal error: ' + e.message, e.code)

        needsCancel = 
          // undefined state. better cancel.
          !e.code 
          // we can't be sure if the server received the call or not. cancel
          || e.code === ERROR_TIMEOUT
          // server crashed. we can't be sure whether the transaction was registered or not.
          || e.code === ERROR_SYSTEM_FAILURE
      }

      if (needsCancel) {
        this.nonCanceledTimeouts.add(paymentOptions.merchantTxId, progress)
      }

      throw e
    }

    let isApproved = response.payment.state === STATUS_APPROVED

    let message = 'Payment status: ' + response.payment.state + 
      (response.payment.code ? ', code ' + response.payment.code : '')

    progress.onProgress(message, response.payment.code || response.payment.state)

    if (!isApproved) {
      throw new ErrorResponse(message, response.payment.code, response)
    }

    return response.payment
  }
}
