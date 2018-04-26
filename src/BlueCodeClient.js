import './typedefs.js'

const TIPPING_DISABLED = 'disabled'
const TIPPING_ENABLED = 'enabled'

const DEFAULT_TIMEOUT_MS = 10000
const BACKOFF_TIME_MS = 2000
const MAX_RETRIES = 3

export const STATUS_CONNECTING = 'connecting'
export const STATUS_PROCESSING = 'processing'
export const STATUS_APPROVED = 'accepted'
export const STATUS_REJECTED = 'rejected'
export const STATUS_ERROR = 'error'
export const STATUS_CANCELED = 'canceled'

/** 
  * @typedef { (message: string, [status]: string) => void } logger
  * 
  * @typedef { Object } progress
  * @property { logger } onProgress
  * @property { (() => Promise) => void } onCancellable
  * 
  * @type { logger }
  */
const NULL_LOGGER = (message, status) => {}

/** @type {progress} */
const NULL_PROGRESS = {
  onProgress: NULL_LOGGER,
  onCancellable: (cancel) => {}
}

function randomString() {
  let A = 'a'.charCodeAt(0)

  return '            '
    .split('')
    .map(() => String.fromCharCode(Math.round(Math.random()*25) + A))
    .join('')
}

function generateMerchantTxId() {
  return randomString()
}

function mapKeys(object, mapFunction) {
  if (object == null) {
    return object
  }
  else {
    return Object.keys(object)
      .reduce((newObject, key) => {
        let value = object[key]

        if (typeof value === 'object') {
          value = mapKeys(value, mapFunction)
        }

        newObject[mapFunction(key)] = value

        return newObject 
      }, {})
  }
}

class CanceledError extends Error {
  constructor() {
    super('Canceled')

    this.wasCanceled = true
  }
}

/**
 * @param {number} ms 
 * @param {progress} progress 
 */
function wait(ms, progress) {
  return new Promise((resolve, reject) => {
    progress.onCancellable(() => reject(new CanceledError()))

    setTimeout(resolve, ms)
  })
}

function camelCaseToSnakeCase(camelCaseString) {
  return camelCaseString
    .replace(/([A-Z])/g, (x, upperCaseChar) => '_' + upperCaseChar.toLowerCase())
}

function snakeCaseToCamelCase(snakeCaseString) {
  return snakeCaseString
    .replace(/_([a-z])/g, (x, lowerCaseChar) => lowerCaseChar.toUpperCase())
}

function dateToString(date) {
  let dateWithMillis = date.toISOString()
  
  let dateWithoutMillis = dateWithMillis.slice(0, - '.000Z'.length) + 'Z'

  return dateWithoutMillis
}

function requireAttribute(json, attribute) {
  if (json[attribute] === null || json[attribute] === undefined) {
    throw new Error('Missing attribute "' + attribute + '" in ' + JSON.stringify(json))
  }
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
   * @param {string} endpoint Should start with a slash.
   * @param {progress} progress
   * @param {number} retryIndex
   * @param {*} payload 
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

      let xhr = new XMLHttpRequest()
  
      xhr.open('POST', this.baseUrl + endpoint, true)

      xhr.timeout = timeoutMs
      xhr.responseType = 'json'

      xhr.setRequestHeader('Content-type', 'application/json')
      xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(this.username + ':' + this.password))

      let didCancel = false

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
            if (didCancel) {
              reject(new CanceledError())
            }
            else {
              retry()
            }
          }
          else {
            reject(new Error('Request to ' + endpoint + ' resulted in status ' + xhr.status))
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
   * @async
   * @param {string} merchantTxId 
   * @param {progress} [progress]
   * @return {statusResponse} 
  */
  status(merchantTxId, progress) {
    return this.call('/status', { merchantTxId }, progress)
  }

  /**
   * @async
   * @param {string} merchantTxId 
   * @param {progress} [progress]
   * @return {statusResponse} 
  */
  cancel(merchantTxId, progress) {
    return this.call('/cancel', { merchantTxId }, progress)
  }

  /**
   * @param {paymentOptions} paymentOptions 
   * @param {progress} [progress]
   * @return {Promise<paymentResponse>}
   */
  async payAndWaitForProcessing(paymentOptions, progress) {
    progress = progress || NULL_PROGRESS

    let response = await this.call('/payment', paymentOptions, progress)
  
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
    }

    return response
  }

  /**
   * @param {paymentOptions} paymentOptions 
   * @param {progress} [progress]
   * @return {Promise<paymentResponse>}
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

    /** @type {paymentResponse} */
    let response

    try {
      response = await this.payAndWaitForProcessing(paymentOptions, progress)
  
      if (!response.payment) {
        throw new Error('Unexpected response to payment call.')
      }
    }
    catch (e) {
      if (e.wasCanceled) {
        progress.onProgress('Canceled.', STATUS_CANCELED)        
      }
      else {
        progress.onProgress('Fatal error: ' + e.message, STATUS_ERROR)
      }

      console.error(e)

      this.cancel(paymentOptions.merchantTxId, progress)
      .then(() => progress.onProgress('Cancel successful.', STATUS_CANCELED))
      .catch(e => console.error('Unable to cancel payment ' + paymentOptions.merchantTxId + ': ' + e.message, e))

      throw e
    }

    let isApproved = response.payment.state === 'APPROVED'

    progress.onProgress('Payment status: ' + response.payment.state, isApproved ? STATUS_APPROVED : STATUS_REJECTED)

    if (!isApproved) {
      throw new Error('Payment failed: ' + response.payment.state + ', code ' + response.payment.code)
    }

    return response.payment
  }
}
