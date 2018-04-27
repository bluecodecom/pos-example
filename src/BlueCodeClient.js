import './typedefs.js'
import { 
  mapKeys,
  camelCaseToSnakeCase, 
  snakeCaseToCamelCase, 
  dateToString, 
  generateMerchantTxId, 
  requireAttribute
} from './client-util.js'

const TIPPING_DISABLED = 'disabled'
const TIPPING_ENABLED = 'enabled'

const DEFAULT_TIMEOUT_MS = 10000
const BACKOFF_TIME_MS = 2000
const MAX_RETRIES = 3

export const STATUS_CONNECTING = 'connecting'
export const STATUS_PROCESSING = 'processing'
export const STATUS_APPROVED = 'approved'
export const STATUS_DECLINED = 'declined'
export const STATUS_ERROR = 'error'
export const STATUS_CANCELED = 'canceled'

/** 
  * @typedef { (message: string, [status]: string) => void } logger
  * 
  * The Progress object can optionally be sent to any endpoint 
  * to receive status updates during the call and to be able to
  * cancel the call.
  * @typedef { Object } progress
  * @property { logger } onProgress - A logger instance that gets 
  *   called with status updates on the call.
  * @property { (() => Promise) => void } onCancellable -
  *   A callback that will receive a cancel method. Call the cancel
  *   method to abort the transaction. Note that the method will
  *   be called multiple times during the transaction; always call
  *   cancel on the latest instance.
  * 
  * @type { logger }
  */
const NULL_LOGGER = (message, status) => {}

/** @type {progress} */
const NULL_PROGRESS = {
  onProgress: NULL_LOGGER,
  onCancellable: (cancel) => {}
}

/**
 * Thrown when the server returns a non 200 status code but does return a JSON response.
 * (There are unusual internal error cases when the server fails to return JSON; in these
 * cases, a normal Error is thrown)
 */
class ErrorResponse extends Error {
  /**
   * @param {{}} response The response the server sent.
   * @param {number} retryIndex
   */
  constructor(message, response, retryIndex) {
    super(message)

    this.response = response
    this.retryIndex = retryIndex
  }
}

/**
 * Thrown when a transaction was cancelled using the {@link progress} object.
 */
class CanceledError extends Error {
  constructor() {
    super('Canceled')

    this.wasCanceled = true
  }
}

/**
 * Waits for a specified number of milliseconds.
 * @param {number} ms 
 * @param {progress} progress 
 */
export function wait(ms, progress) {
  return new Promise((resolve, reject) => {
    progress.onCancellable(() => reject(new CanceledError()))

    setTimeout(resolve, ms)
  })
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
  }

  /**
   * Perform an API call.
   * @param {string} endpoint Should start with a slash.
   * @param {progress} progress
   * @param {*} payload POST payload. Will be converted into JSON (including converting camel case to snake case)
   * @param {number} [retryIndex] Unset for the first call. 1 on the first retry etc.
   */
  call(endpoint, payload, progress, retryIndex) {
    retryIndex = retryIndex || 0
    progress = progress || NULL_PROGRESS

    let timeoutMs = DEFAULT_TIMEOUT_MS

    progress.onProgress('Calling ' + endpoint + '...')

    return new Promise((resolve, reject) => {
      let retry = async () => {
        if (retryIndex < MAX_RETRIES) {
          await wait(BACKOFF_TIME_MS, progress)

          progress.onProgress('Timeout calling ' + endpoint + '. Retrying...')

          try {
            resolve(await this.call(endpoint, payload, progress, retryIndex+1))
          }
          catch (e) {
            reject(e)
          }
        }
        else {
          reject(new Error('Request to ' + endpoint + ' timed out.'))
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
          else if (xhr.status === 0) {
            // status 0 means either a timeout, offline or a cancel.
            if (didCancel) {
              reject(new CanceledError())
            }
            else {
              retry()
            }
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
                response, 
                retryIndex))
            }
            else {
              reject(new Error('Request to ' + endpoint + ' resulted in status ' + xhr.status))
            }
          }
        }
      }
  
      xhr.send(JSON.stringify(mapKeys(payload, camelCaseToSnakeCase)))
    })
    .then(json => {
      let result = mapKeys(json, snakeCaseToCamelCase)

      if (result.result === 'ERROR') {
        throw new Error('Call to ' + endpoint + ' failed: ' + JSON.stringify(result))
      }

      return result
    })
  }

  /**
   * Get the payment status on a transaction.
   * @async
   * @param {string} merchantTxId 
   * @param {progress} [progress]
   * @return {statusResponse} 
  */
  status(merchantTxId, progress) {
    return this.call('/status', { merchantTxId }, progress)
  }

  /**
   * Cancel a transaction.
   * @async
   * @param {string} merchantTxId 
   * @param {progress} [progress]
   * @return {statusResponse} 
  */
  cancel(merchantTxId, progress) {
    return this.call('/cancel', { merchantTxId }, progress)
  }

  /**
   * Utility for the payment call. Handles retries but no other error handling.
   * @param {paymentOptions} paymentOptions 
   * @param {progress} [progress]
   * @return {Promise<statusResponse>}
   */
  async payAndWaitForProcessing(paymentOptions, progress) {
    progress = progress || NULL_PROGRESS

    let response
    
    try {
      response = await this.call('/payment', paymentOptions, progress)
    }
    catch (e) {
      // we will receive this error if the first transaction was in fact processed, 
      // despite the client receiving a timeout. we now know the transaction was in
      // fact successful.
      if (e.retryIndex > 0 && e.response && e.response.errorCode == 'MERCHANT_TX_ID_NOT_UNIQUE') {
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
        throw new Error('Payment timed out.')
      }

      progress.onProgress('Got response PROCESSING. Will call status endpoint again in ' + 
        Math.round(paymentStatus.checkStatusIn / 1000) + 's...', STATUS_PROCESSING)

      await wait(paymentStatus.checkStatusIn, progress)

      progress.onProgress('Calling status endpoint...', STATUS_PROCESSING)

      response = await this.status(paymentOptions.merchantTxId, progress)

      let payment = response.payment

      if (response.result != 'PROCESSING' && (!payment || payment.state != 'APPROVED')) {
        throw new ErrorResponse(
          'Payment state ' + payment.state + ', code ' + payment.code,
          response,
          0)
      }
    }

    return response
  }

  /**
   * Perform a payment.
   * @param {paymentOptions} paymentOptions 
   * @param {progress} [progress]
   * @return {Promise<statusResponse>}
   */
  async pay(paymentOptions, progress) {
    progress = progress || NULL_PROGRESS

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
        throw new Error('Unexpected response to payment call.')
      }
    }
    catch (e) {
      console.error(e)

      if (e.wasCanceled) {
        progress.onProgress('Canceled.', STATUS_CANCELED)        
      }
      else {
        progress.onProgress('Fatal error: ' + e.message, STATUS_ERROR)

        let needsCancel = 
          !e.response 
          || !e.response.payment 
          || e.response.payment.code == 'SYSTEM_FAILURE'

        if (needsCancel) {
          this.cancel(paymentOptions.merchantTxId, progress)
          .then(() => progress.onProgress('Cancel successful.'))
          .catch(e => console.error('Unable to cancel payment ' + paymentOptions.merchantTxId + ': ' + e.message, e))
        }
      }

      throw e
    }

    let isApproved = response.payment.state === 'APPROVED'

    let message = 'Payment status: ' + response.payment.state + 
      (response.payment.code ? ', code ' + response.payment.code : '')

    progress.onProgress(message, isApproved ? STATUS_APPROVED : STATUS_DECLINED)

    if (!isApproved) {
      throw new Error(message)
    }

    return response.payment
  }
}
