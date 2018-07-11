import { 
  dateToString, 
  generateMerchantTxId, 
  requireAttribute
} from './client-util.js'

import { 
  ERROR_SYSTEM_FAILURE,
  ERROR_TIMEOUT,
  STATUS_CONNECTING,
  STATUS_PROCESSING,
  STATUS_APPROVED,
  STATUS_CANCELED,
  STATUS_REFUNDED 
} from '../util/error-messages'

import { ErrorResponse } from './ErrorResponse'
import { consoleProgress } from './console-progress'
// seems to be the only way to get the jsdoc Progress class declaration into scope
import * as progress from './console-progress' // eslint-disable-line no-unused-vars
import * as caller from './caller.js' // eslint-disable-line no-unused-vars

import { createCallerBlockingCallsWhileStillCanceling, NonCanceledTimeouts } from './NonCanceledTimeouts'
import { wait } from './wait'
import { createRetryingCaller, createCaller } from './caller.js';

export const BASE_URL_PRODUCTION = 'https://merchant-api.bluecode.com/v4'
export const BASE_URL_SANDBOX = 'https://merchant-api.bluecode.biz/v4'

export const ENDPOINT_CANCEL = '/cancel'
export const ENDPOINT_STATUS = '/status'
export const ENDPOINT_PAYMENT = '/payment'
export const ENDPOINT_REFUND = '/refund'
export const ENDPOINT_LOYALTY_STATUS = '/loyalty/status'
export const ENDPOINT_REDEEM_REWARD = '/rewards/redeem'

/**
 @typedef processingStatus
 @type {Object}
 @property {number} checkStatusIn
 @property {string} merchantTxId
 @property {number} ttl

 @typedef statusResponse
 @type {Object}
 @property {string} result
 @property {Object} status
 @property {string} status.merchantTxId
 @property {number} status.checkStatusIn
 @property {number} status.ttl

 @property {Object} payment
 @property {string} payment.acquirerTxId
 @property {string} payment.code
 @property {string} payment.state

 @typedef paymentOptions
 @type {Object}
 @property {string} barcode
 @property {string} branchExtId
 @property {string} currency
 @property {string} merchantTxId
 @property {number} requestedAmount
 @property {number} [discountAmount]
 @property {number} [purchase_amount]
 @property {number} [tipAmount]
 @property {string} [terminal]
 @property {string} [slip]
 @property {string} [operator]
 @property {string} [tippingMode]
 @property {string} [scheme]
 @property {string} [slipDateTime]

 @typedef {Object} reward 
 @property {string} reward.id
 @property {string} reward.ean
 @property {Object} data 

 @typedef loyaltyStatusResponse
 @property {string} result
 @property {reward[]} rewards
 @property {Object} default
 @property {number} default.points
 @property {string} default.membership_number
 @property {string} default.membership_id
 @property {Object} default.data
*/

/**
  * The class performing high-level Blue Code API calls. Manages error handling, retries etc.
  */
export class BlueCodeClient {  
  /**
    * @param {string} username 
    * @param {string} password 
    * @param {string} baseUrl See BASE_URL_ constants above. 
    * @param {caller.Caller} [caller] Optional. Used by tests to inject test callers.  
    */
  constructor(username, password, baseUrl, caller) {
    if (!username || !password) {
      throw new Error('Missing credentials.')
    }
    
    if (!baseUrl) {
      throw new Error('Missing base URL.')
    }
    
    this.username = username
    this.password = password
    this.baseUrl = baseUrl

    this.nonCanceledTimeouts = new NonCanceledTimeouts(
      (merchantTxId, progress) => this.cancel(merchantTxId, progress))

    // The caller is a function that performs the actual XHR calls. Decorators handle retries etc.
    this.caller = caller 
      || createCallerBlockingCallsWhileStillCanceling(createRetryingCaller(createCaller(username, password, baseUrl)), 
      this.nonCanceledTimeouts)
  }

  /**
    * Call an endpoint.
    * @param {string} endpoint Should start with a slash.
    * @param {progress.Progress} progress
    * @param {*} payload POST payload. Will be converted into JSON (including converting camel case to snake case)
    */
  call(endpoint, payload, progress) {
    progress = progress || consoleProgress

    progress.onProgress(null, STATUS_CONNECTING)

    return this.caller(endpoint, payload, progress)
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
    * If the server is not reachable, this call will retry twice. 
    * If the retries fail, the call will reject the promise.
    * Frequently, you want to retry indefinitely, in which  
    * case you should use @{link #cancelRetryingIndefinitely}
    * @async
    * @param {string} merchantTxId 
    * @param {progress.Progress} [progress]
    * @return {statusResponse} 
    */
  cancel(merchantTxId, progress) {
    return this.call(ENDPOINT_CANCEL, { merchantTxId }, progress)
  }

  /**
    * Same as cancel but will go on trying to cancel until the call
    * succeeds. While cancels are running, no other transaction can 
    * be initiated. 
    * The method does not return anything since it can be assumed
    * the cancel will always eventually succeed.
    * @param {string} merchantTxId 
    * @param {progress.Progress} [progress]
    */
  cancelRetryingIndefinitely(merchantTxId, progress) {
    this.nonCanceledTimeouts.add(merchantTxId, progress)
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

      let result = await this.call(ENDPOINT_REFUND, payload, progress)

      progress.onProgress('Refund successful.', STATUS_REFUNDED)

      return result
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
      
      let checkStatusIn = parseInt(paymentStatus.checkStatusIn, 10) || 1000
      let ttl = parseInt(paymentStatus.ttl, 10) || 10000
      let timeElapsed = new Date().getTime() - startTime

      if (timeElapsed + checkStatusIn > ttl) {
        throw new ErrorResponse('Payment timed out.', ERROR_TIMEOUT)
      }

      progress.onProgress('Got response PROCESSING. after ' + timeElapsed + '/' + ttl +' Will call status endpoint again in ' + 
        Math.round(checkStatusIn / 1000) + 's...', STATUS_PROCESSING)

      await wait(checkStatusIn, progress)

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

    if (!response.result) {
      throw new ErrorResponse('Unexpected response to payment call (missing "result").', ERROR_SYSTEM_FAILURE, response)
    }

    return response
  }

  /**
   * Perform a payment.
   * Note: this call does not check for loyalty rewards. Use {@link rewarded-payment} for that.
   * @param {paymentOptions} paymentOptions 
   * @param {progress.Progress} [progress]
   * @return {Promise<statusResponse>}
   */
  async pay(paymentOptions, progress, shouldCancelOnFailure = true) {
    progress = progress || consoleProgress

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

    /** @type {statusResponse} */
    let response

    try {
      response = await this.payAndWaitForProcessing(paymentOptions, progress)
  
      if (!response.payment) {
        throw new ErrorResponse('Unexpected response to payment call.', ERROR_SYSTEM_FAILURE, response)
      }
    }
    catch (e) {
      console.error(`${e.message} (${e.code})`)

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

      if (needsCancel && shouldCancelOnFailure) {
        // the cancellation can run in the background; waiting for it to complete
        // adds no value.
        this.cancelRetryingIndefinitely(paymentOptions.merchantTxId, progress)
      }

      throw e
    }

    let paymentState = (response.payment && response.payment.state) || '<missing>'
    let paymentCode = response.payment && response.payment.code

    let isApproved = paymentState === STATUS_APPROVED

    let message = 'Payment state: ' + paymentState + 
      (paymentCode ? ', code ' + paymentCode : '')

    progress.onProgress(message, paymentCode || paymentState)

    if (!isApproved) {
      throw new ErrorResponse(message, response.payment.code, response)
    }

    return response.payment
  }

  /**
   * Returns information on the user's loyalty programs, including any current rewards.
   * See rewarded-payment
   * @param {string} barcode
   * @param {progress.progress} progress
   * @return {Promise<loyaltyStatusResponse>}
   */
  async loyaltyStatus(barcode, progress) {
    /** @type {loyaltyStatusResponse} */
    let status = await this.call(ENDPOINT_LOYALTY_STATUS, { barcode }, progress)
    
    if (status.result !== 'OK') {
      // this should never happen
      throw new ErrorResponse(
        `Got error result but no error HTTP status for ${ENDPOINT_LOYALTY_STATUS}`, 
        status.error_code || ERROR_SYSTEM_FAILURE, 
        status)
    }

    let rewardCount = (status.rewards || []).length

    progress.onProgress(
      rewardCount 
        ? `Loyalty status: ${rewardCount} reward${ rewardCount > 1 ? 's' : ''}.` 
        : `Loyalty status: no activated rewards.`)

    return status
  }

  /**
   * Marks a reward as redeemed and therefore note usable again. Should be called after a 
   * payment has been made where the reward was applied in the form of a discount.
   * See rewarded-payment
   * @param {string} rewardId 
   * @param {progress.progress} progress 
   */
  async redeemReward(rewardId, progress) {
    let response = await this.call(ENDPOINT_REDEEM_REWARD, { rewardId }, progress)

    if (response.result !== 'OK') {
      // this should never happen
      throw new ErrorResponse(
        `Got error result but no error HTTP status for ${ENDPOINT_REDEEM_REWARD}`, 
        response.status.error_code || ERROR_SYSTEM_FAILURE, 
        response)
    }

    progress.onProgress(`Marked reward ${rewardId} as redeemed.`)

    return response
  }
}
