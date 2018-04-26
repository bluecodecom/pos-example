import './typedefs.js'

const TIPPING_DISABLED = 'disabled'
const TIPPING_ENABLED = 'enabled'

const DEFAULT_TIMEOUT_MS = 10000
const BACKOFF_TIME_MS = 2000
const MAX_RETRIES = 3

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

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
   * @param {*} payload 
   */
  call(endpoint, payload, timeoutMs, retryIndex) {
    retryIndex = retryIndex || 0
    timeoutMs = timeoutMs || DEFAULT_TIMEOUT_MS

    return new Promise((resolve, reject) => {
      let retry = async () => {
        if (retryIndex < MAX_RETRIES) {
          await wait(BACKOFF_TIME_MS)

          console.warn('Timeout calling ' + endpoint + '. Retrying...')

          this.call(endpoint, payload, timeoutMs, retryIndex+1)
            .then(resolve)
            .catch(reject)
        }
        else {
          reject('Request to ' + endpoint + ' timed out.')
        }
      }

      let xhr = new XMLHttpRequest()
  
      xhr.open('POST', this.baseUrl + endpoint, true)

      xhr.timeout = timeoutMs
      xhr.responseType = 'json'

      xhr.setRequestHeader('Content-type', 'application/json')
      xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(this.username + ':' + this.password))

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response)
          }
          else if (xhr.status === 0) {
            retry()
          }
          else {
            reject('Request to ' + endpoint + ' resulted in status ' + xhr.status)
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
   * @return {statusResponse} 
  */
  status(merchantTxId) {
    return this.call('/status', { merchantTxId })
  }

  /**
   * @async
   * @param {string} merchantTxId 
   * @return {statusResponse} 
  */
  cancel(merchantTxId) {
    return this.call('/cancel', { merchantTxId })
  }

  async payAndWaitForProcessing(paymentOptions) {
    let response = await this.call('/payment', paymentOptions)
  
    let startTime = new Date().getTime()

    while (response.result === 'PROCESSING') {
      /** @type {processingStatus} */
      let paymentStatus = response.status
      
      let timeElapsed = new Date().getTime() - startTime

      if (timeElapsed > paymentStatus.ttl) {
        throw new Error('Payment timed out.')
      }

      console.log('Blue Code returned PROCESSING. Waiting...')
      await wait(paymentStatus.checkStatusIn)

      response = await this.status(paymentOptions.merchantTxId)
    }

    return response
  }

  /**
   * @param {paymentOptions} paymentOptions 
   * @return {Promise<paymentResponse>}
   */
  async pay(paymentOptions) {
    /** @type {paymentOptions} */
    let defaults = {
      scheme: 'AUTO',
      currency: 'EUR',
      merchantTxId: generateMerchantTxId(),
      slipDateTime: dateToString(new Date())
    }

    paymentOptions = { ...defaults, ...paymentOptions }

    requireAttribute(paymentOptions, 'barcode')
    requireAttribute(paymentOptions, 'branchExtId')
    requireAttribute(paymentOptions, 'requestedAmount')

    /** @type {paymentResponse} */
    let response

    try {
      response = await this.payAndWaitForProcessing(paymentOptions)
    }
    catch (e) {
      console.error(e)

      this.cancel(paymentOptions.merchantTxId)
      .catch(e => console.error('Unable to cancel payment ' + paymentOptions.merchantTxId + ': ' + e.message, e))

      throw e
    }

    if (!response.payment) {
      throw new Error('Unexpected response to payment call.')
    }

    if (response.payment.state !== 'APPROVED') {
      throw new Error('Payment failed: ' + response.payment.state + ', code ' + response.payment.code)
    }

    return response.payment
  }
}
