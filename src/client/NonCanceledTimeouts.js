import { getLocalStorage } from '../util/local-storage'
import { ERROR_NON_CANCELED_TIMEOUTS, ERROR_TIMEOUT, ERROR_UNAVAILABLE } from '../util/error-messages'
import { ENDPOINT_CANCEL } from './BlueCodeClient'
import { ErrorResponse } from './ErrorResponse' // eslint-disable-line no-unused-vars
import { BACKOFF_TIME_MS } from './caller' // eslint-disable-line no-unused-vars

import { consoleProgress } from './console-progress'
// seems to be the only way to get the jsdoc Progress class declaration into scope
import * as progress from './console-progress' // eslint-disable-line no-unused-vars
import * as caller from './caller' // eslint-disable-line no-unused-vars

const TIMED_OUT_TRANSACTION_KEY = 'timedOutTransaction'

/**
  * Keeps track of any timed out payment transactions. If a timeout occurs, we need to make sure the
  * transaction is canceled, because it will be in an unknown state (the request might have reached
  * the server or it might not). If the cancelation also times out, however, we need to keep retrying
  * until it doesn't.
  * 
  * While there is a cancelation that has timed out, there is no point in trying to call Blue Code
  * as all further calls are very likely to fail too, and we don't want to keep queueing up new
  * calls for cancellation.
  *
  * For this reason, only a single transaction is stored. {@link #isStillCanceling} should be called
  * by the client to check if there are any cancelations pending. If there are, no new transactions
  * should be initiated.
  */
export class NonCanceledTimeouts {
  /**
   * @param { function(merchantTxId: string, progress: progress.Progress) => Promise<void> } cancel 
   */
  constructor(cancel) {
    this.cancel = cancel
  }

  /**
    * Should be called when the app first opens. Will retrieve the any pending cancelation and retry it. 
    */
  retryPersisted() {
    let merchantTxIdToCancel = this.getMerchantTxIdToCancel()

    if (merchantTxIdToCancel != null) {
      setTimeout(() =>
          this.retryCancelUntilTimeoutIsGone(merchantTxIdToCancel),
          0)
    }
  }

  /**
    * Returns whether we are still canceling a previous transaction. 
    * No new calls should be attempted while this method returns true.
    */
  isStillCanceling() {
    return getLocalStorage().getItem(TIMED_OUT_TRANSACTION_KEY) != null
  }

  /**
   * @param {string} merchantTxId 
   * @param {progress.Progress} [progress]
   */
  add(merchantTxId, progress) {
    progress = progress || consoleProgress
    let previousMerchantTxId = this.getMerchantTxIdToCancel()

    if (previousMerchantTxId != null && previousMerchantTxId !== merchantTxId) {
      console.error(new Error('Added a non-canceled transaction while one already existed.').stack)
    }

    this.setMerchantTxIdToCancel(merchantTxId)

    if (previousMerchantTxId !== merchantTxId) {
      this.retryCancelUntilTimeoutIsGone(merchantTxId, progress)
    }
  }

  getMerchantTxIdToCancel() {
    return getLocalStorage().getItem(TIMED_OUT_TRANSACTION_KEY)
  }

  /**
    * @param {string} merchantTxId 
    */
  setMerchantTxIdToCancel(merchantTxId) {
    getLocalStorage().setItem(TIMED_OUT_TRANSACTION_KEY, merchantTxId)
  }

  clearMerchantTxIdToCancel() {
    getLocalStorage().removeItem(TIMED_OUT_TRANSACTION_KEY)
  }

  /**
    * Private.
    * @param {string} merchantTxId 
    * @param {progress.Progress} [progress]
    */
  retryCancelUntilTimeoutIsGone(merchantTxId, progress) {
    progress = progress || consoleProgress

    // run the cancelation in the background, so no await
    this.cancel(merchantTxId, progress)
    .then(() => {
        progress.onProgress('Cancel of ' + merchantTxId + ' successful.')

        this.clearMerchantTxIdToCancel()
      }
    )
    .catch(e => {
        let isOffline = 
          e.code === ERROR_TIMEOUT
          || e.code === ERROR_UNAVAILABLE

        if (isOffline) {
          setTimeout(() => this.retryCancelUntilTimeoutIsGone(merchantTxId), BACKOFF_TIME_MS)
        }
        else {
          console.error('Unable to cancel payment ' + merchantTxId 
            + '. The transaction may or may not have been performed: ' + e.message, e)

          this.clearMerchantTxIdToCancel()
        }
      }
    )
  }
}

export function createNonCanceledTimeoutError() {
  return new ErrorResponse(
    'Still trying to cancel a previous, timed out transaction', 
    ERROR_NON_CANCELED_TIMEOUTS)
}

/**
  * Creates a caller that blocks any calls attempted while there are still pending cancels. 
  * @param { caller.Caller } delegateCaller
  * @param { NonCanceledTimeouts } nonCanceledTimeouts
  * @returns caller.Caller
  */
 export function createCallerBlockingCallsWhileStillCanceling(delegateCaller, nonCanceledTimeouts) {
  return (endpoint, payload, progress) => {
    if (endpoint !== ENDPOINT_CANCEL && nonCanceledTimeouts.isStillCanceling()) {
      return Promise.reject(createNonCanceledTimeoutError())
    }
    else {
      return delegateCaller(endpoint, payload, progress)
    }
  }
}
