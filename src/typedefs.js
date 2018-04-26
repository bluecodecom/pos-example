/**
 @typedef processingStatus
 @type {Object}
 @property {number} checkStatusIn
 @property {string} merchantTxId
 @property {number} ttl

 @typedef statusResponse
 @type {Object}

 TODO should not have both payment and status
 @property {string} result
 @property {Object} status
 @property {Object} payment
 @property {string} payment.acquirerTxId
 @property {string} payment.code
 @property {string} payment.state

 @typedef paymentResponse
 @type {Object}

 TODO should not have both result and status
 @property {string} result
 @property {Object} status
 @property {string} status.merchantTxId

 @property {Object} payment
 @property {string} payment.acquirerTxId
 @property {number} payment.consumerTipAmount
 @property {number} payment.requestedAmount
 @property {number} payment.totalAmount
 @property {string} payment.merchantTxId
 @property {string} payment.scheme
 @property {string} payment.slipNote
 @property {string} payment.state

 @typedef paymentOptions
 @type {Object}
 @property {string} barcode
 @property {string} branchExtId
 @property {string} currency
 @property {string} merchantTxId
 @property {number} requestedAmount
 @property {number} [discountAmount]
 @property {number} [tipAmount]
 @property {string} [terminal]
 @property {string} [slip]
 @property {string} [operator]
 @property {string} [tippingMode]
 @property {string} [scheme]
 @property {string} [slipDateTime]
*/
