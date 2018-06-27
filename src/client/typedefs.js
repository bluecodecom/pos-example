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
 @property {number} [tipAmount]
 @property {string} [terminal]
 @property {string} [slip]
 @property {string} [operator]
 @property {string} [tippingMode]
 @property {string} [scheme]
 @property {string} [slipDateTime]
*/