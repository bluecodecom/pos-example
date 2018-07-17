
import { rewardedPayment } from './rewarded-payment'
import { nullProgress } from './console-progress'
import { APPROVED_RESPONSE } from './BlueCodeClient.test'
import { ErrorResponse } from './ErrorResponse';
import { ERROR_LOYALTY_NOT_CONFIGURED, ERROR_SYSTEM_FAILURE } from '../util/error-messages';

const NO_REWARDS_RESPONSE = {
  result: 'OK',
  rewards: [],
  default: null,
  apps: []
}

const REWARD_ID = '9876'

const REWARD_RESPONSE = {
  result: 'OK',
  rewards: [
    {
      id: REWARD_ID,
      ean: '9919564985450'
    }
  ],
  default: null,
  apps: []
}

const FULL_AMOUNT = 100
const DISCOUNTED_AMOUNT = FULL_AMOUNT / 2

function isRewardApplicable(reward) {
  return true
}

function getPaymentOptions(rewards) {
  return {
    requestedAmount: rewards.length ? DISCOUNTED_AMOUNT : FULL_AMOUNT
  }
}

async function pay() {
  return APPROVED_RESPONSE.payment
}

it('handles payments that do not result in rewards', async () => {
  expect.assertions(1)

  let loyaltyStatus = jest.fn().mockImplementation(async () => NO_REWARDS_RESPONSE)

  let client = {
    loyaltyStatus,
    pay,
    redeemReward: () => { throw new Error('Not supposed to be called.') },
    cancelRetryingIndefinitely: () => { throw new Error('Not supposed to be called.') },
  }

  let paymentResponse = await rewardedPayment('1234', isRewardApplicable, getPaymentOptions, client, nullProgress)

  expect(loyaltyStatus).toHaveBeenCalledTimes(1)
})

it('handles rewards', async () => {
  expect.assertions(4)

  let loyaltyStatus = 
    async () => REWARD_RESPONSE

  let pay = jest.fn().mockImplementation(
    async (options) => {
      expect(options.requestedAmount).toEqual(DISCOUNTED_AMOUNT)

      return APPROVED_RESPONSE.payment
    })

  let redeemReward = jest.fn().mockImplementation(
    async (rewardId) => { 
      expect(rewardId).toEqual(REWARD_ID) 
    })

  let client = {
    loyaltyStatus,
    pay,
    redeemReward,
    cancelRetryingIndefinitely: () => { throw new Error('Not supposed to be called.') },
  }

  let paymentResponse = await rewardedPayment('1234', isRewardApplicable, getPaymentOptions, client, nullProgress)

  expect(redeemReward).toHaveBeenCalledTimes(1)
  expect(pay).toHaveBeenCalledTimes(1)
})

it('ignores rewards if loyalty status says they are not configured', async () => {
  expect.assertions(1)

  let loyaltyStatus = jest.fn().mockImplementation(
    async () => { 
      throw new ErrorResponse('Not configured', ERROR_LOYALTY_NOT_CONFIGURED) 
    })

  let client = {
    loyaltyStatus,
    pay,
    redeemReward: () => { throw new Error('Not supposed to be called.') },
    cancelRetryingIndefinitely: () => { throw new Error('Not supposed to be called.') },
  }

  let paymentResponse = await rewardedPayment('1234', isRewardApplicable, getPaymentOptions, client, nullProgress)

  expect(loyaltyStatus).toHaveBeenCalledTimes(1)
})

it('cancels payments if redeem reward fails', async () => {
  expect.assertions(4)

  const ERROR = new ErrorResponse('Failed', ERROR_SYSTEM_FAILURE)

  let loyaltyStatus = 
    async () => REWARD_RESPONSE

  let pay = jest.fn().mockImplementation(
    async (options) => APPROVED_RESPONSE.payment)

  let redeemReward = jest.fn().mockImplementation(
    async (rewardId) => { 
      throw ERROR
    })

  let cancelRetryingIndefinitely = jest.fn().mockImplementation(
    async (merchantTxId) => {
      expect(merchantTxId).toEqual(APPROVED_RESPONSE.payment.merchantTxId)
    })

  let client = {
    loyaltyStatus,
    pay,
    redeemReward,
    cancelRetryingIndefinitely
  }

  await expect(rewardedPayment('1234', isRewardApplicable, getPaymentOptions, client, nullProgress)).rejects.toEqual(ERROR)

  expect(redeemReward).toHaveBeenCalledTimes(1)
  expect(cancelRetryingIndefinitely).toHaveBeenCalledTimes(1)
})
