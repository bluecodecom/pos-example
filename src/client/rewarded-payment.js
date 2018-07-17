
import { BlueCodeClient } from './BlueCodeClient' // eslint-disable-line no-unused-vars
import * as progress from './console-progress' // eslint-disable-line no-unused-vars
import { ERROR_LOYALTY_NOT_CONFIGURED, STATUS_APPROVED, ERROR_SYSTEM_FAILURE } from '../util/error-messages';
import { ErrorResponse } from './ErrorResponse';

/**
  * Performs a complete payment process including checking for rewards
  * and redeeming the rewards after the transaction.
  * See https://bluecodepayment.readme.io/docs/loyalty 
  *
  * @param { string } barcode The payment code
  * @param { (reward) => boolean } isRewardApplicable Callback that should examine the reward
  *  and determine whether it is applicable to the current basket (typically using the EAN)
  * @param { (rewards: reward[]) => paymentOptions } getPaymentOptions Callback that returns
  *  the final payment options. It is passed any applicable rewards and has the opportunity
  *  to apply any discounts.
  * @param {BlueCodeClient} client 
  * @param {progress} progress
  */
export async function rewardedPayment(barcode, isRewardApplicable, getPaymentOptions, client, progress) {
  let rewards
  
  try {
    rewards = (await client.loyaltyStatus(barcode, progress)).rewards
  }
  catch (e) {
    rewards = []

    if (e.code === ERROR_LOYALTY_NOT_CONFIGURED) {
      progress.onProgress('Loyalty scheme not configured.')
    }
    else {
      progress.onProgress(`Loyalty status call failed: ${e.message} (${e.code}). Assuming no rewards.`)
    }
  }

  let applicableRewards = rewards.filter(isRewardApplicable)
    
  let paymentOptions = getPaymentOptions(applicableRewards)

  // if payment fails we don't catch the exception but instead let it get thrown to the caller
  let paymentResult = await client.pay(paymentOptions, progress)

  if (!paymentResult.merchantTxId) {
    throw new ErrorResponse('Unexpected server response.', ERROR_SYSTEM_FAILURE, paymentResult)
  }

  try {
    for (let reward of applicableRewards) {
      await client.redeemReward(reward.id, progress)
    }
  }
  catch (e) {
    client.cancelRetryingIndefinitely(paymentResult.merchantTxId)
        
    throw e
  }
  
  progress.onProgress(null, STATUS_APPROVED)

  return paymentResult
}