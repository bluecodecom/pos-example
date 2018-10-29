// client-side status values
export const STATUS_CONNECTING = 'CONNECTING'
export const STATUS_PROCESSING = 'PROCESSING'
export const STATUS_ERROR = 'ERROR'

// server-side payment status values 
export const STATUS_APPROVED = 'APPROVED'
export const STATUS_CANCELED = 'CANCELED'
export const STATUS_REFUNDED = 'REFUNDED'
export const STATUS_DECLINED = 'DECLINED'
export const STATUS_FAILURE = 'FAILURE'

// this is the response to a "register" call; a request for a QR code
// for a payment where the user pays by scanning the QR code
export const STATUS_REGISTERED = 'REGISTERED'

// client-side error codes
export const ERROR_TIMEOUT = 'TIMEOUT'
export const ERROR_CANCELED = 'CANCELLED'
export const ERROR_NON_CANCELED_TIMEOUTS = 'NON_CANCELED_TIMEOUTS' // see the docs in NonCanceledTimeouts

// server-side error codes
export const ERROR_SYSTEM_FAILURE = 'SYSTEM_FAILURE'
export const ERROR_UNAVAILABLE = 'SERVICE_UNAVAILABLE' // this is a 503 status code
export const ERROR_ISSUER_NOT_SUPPORTED = 'ISSUER_NOT_SUPPORTED'
export const ERROR_INVALID_BARCODE = 'INVALID_BARCODE'
export const ERROR_BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND'
export const ERROR_INVALID_PARAMETER = 'ERROR_INVALID_PARAMETER'
export const ERROR_FRAUD_DETECTED = 'FRAUD_DETECTED'
export const ERROR_INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS'
export const ERROR_INVALID_STATE = 'INVALID_STATE'
export const ERROR_LIMIT_EXCEEDED = 'LIMIT_EXCEEDED'
export const ERROR_CANCELED_BY_USER = 'CANCELLED_BY_USER'
export const ERROR_TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND' 
export const ERROR_AMOUNT_TOO_HIGH = 'AMOUNT_TOO_HIGH'
export const ERROR_UNAUTHORIZED = 'UNAUTHORIZED'
export const ERROR_MERCHANT_TX_ID_NOT_UNIQUE = 'MERCHANT_TX_ID_NOT_UNIQUE'
export const ERROR_LOYALTY_NOT_CONFIGURED = 'LOYALTY_NOT_CONFIGURED'

export const MESSAGES = {
  'en': {
    [ERROR_TIMEOUT]: 'Could not reach server. Internet connection might not work. Please try again.',
    [ERROR_NON_CANCELED_TIMEOUTS]: 'Blue Code is currently unable to process transactions. Please try again later.',
    [ERROR_UNAVAILABLE]: 'Blue Code is currently unable to process transactions. Please try again.',
    [ERROR_CANCELED]: 'Transaction cancelled.',
    [ERROR_SYSTEM_FAILURE]: 'Unexpected technical error. Please try again. Contact support if the problem persists.',
    [ERROR_INVALID_PARAMETER]: 'Fatal technical error ("invalid parameter"). Please contact support.',
    [ERROR_MERCHANT_TX_ID_NOT_UNIQUE]: 'Internal error ("transaction ID not unique"). Please try again. Contact support if the problem persists.',
    [ERROR_ISSUER_NOT_SUPPORTED]: 'The customer\'s Blue Code account is not supported.',
    [ERROR_INVALID_BARCODE]: 'Invalid barcode. Ask the customer to generate a new code and try again.',
    [ERROR_BRANCH_NOT_FOUND]: 'Wrong configuration (invalid branch ID). Please contact an administrator.',
    [ERROR_FRAUD_DETECTED]: 'Payment was declined. Use a different form of payment.',
    [ERROR_INSUFFICIENT_FUNDS]: 'Payment was declined. Use a different form of payment.',
    [ERROR_INVALID_STATE]: 'Payment was declined. Use a different form of payment.',
    [ERROR_LIMIT_EXCEEDED]: 'Payment was declined. Use a different form of payment.',
    [ERROR_CANCELED_BY_USER]: 'The customer canceled the payment in the app.',
    [ERROR_TRANSACTION_NOT_FOUND]: 'Unknown transaction. Could not refund.',
    [ERROR_AMOUNT_TOO_HIGH]: 'The transaction has either already been refunded or the amount to refund is too high.',
    [ERROR_UNAUTHORIZED]: 'Wrong configuration (username or password is invalid). Please contact an administrator.',
    [STATUS_CONNECTING]: 'Connecting...',
    [STATUS_PROCESSING]: 'Processing...',
    [STATUS_APPROVED]: 'Payment successful.',
    [STATUS_CANCELED]: 'Transaction cancelled.',
    [STATUS_REFUNDED]: 'Refund succesful.'
  },
  'de': {
    [ERROR_TIMEOUT]: 'Server konnte nicht erreicht werden. Eventuell funktioniert die Internetverbindung nicht. Versuchen Sie es bitte erneut.',
    [ERROR_NON_CANCELED_TIMEOUTS]: 'Blue Code kann gerade keine Transaktionen annehmen. Versuchen Sie es später bitte erneut.',
    [ERROR_UNAVAILABLE]: 'Blue Code kann gerade keine Transaktionen annehmen. Versuchen Sie es bitte erneut.',
    [ERROR_CANCELED]: 'Vorgang abgebrochen. Die Transaktion wurde nicht durchgeführt.',
    [ERROR_SYSTEM_FAILURE]: 'Systemfehler. Versuchen Sie es bitte später erneut. Bitte kontaktieren Sie die Service-Hotline wenn der Fehler besteht.',
    [ERROR_INVALID_PARAMETER]: 'Technischer Fehler ("invalid parameter"). Bitte kontaktieren Sie die Service-Hotline.',
    [ERROR_MERCHANT_TX_ID_NOT_UNIQUE]: 'Technischer Fehler ("transaction ID not unique"). Bitte versuchen Sie es erneut. Kontaktieren Sie die Service-Hotline wenn der Fehler besteht.',
    [ERROR_ISSUER_NOT_SUPPORTED]: 'Dieses Blue Code-Konto wird leider nicht unterstützt.',
    [ERROR_INVALID_BARCODE]: 'Falscher Strichcode. Bitten Sie den Kunden einen neuen Code zu generieren und versuchen Sie es erneut.',
    [ERROR_BRANCH_NOT_FOUND]: 'Falsche Kassenkonfiguration (Blue Code Branch ID ist ungültig). Bitte einen Administrator kontaktieren.',
    [ERROR_FRAUD_DETECTED]: 'Zahlung wurde abgelehnt. Bitte anderes Zahlungsmittel benutzen.',
    [ERROR_INSUFFICIENT_FUNDS]: 'Zahlung wurde abgelehnt. Bitte anderes Zahlungsmittel benutzen.',
    [ERROR_INVALID_STATE]: 'Zahlung wurde abgelehnt. Bitte anderes Zahlungsmittel benutzen.',
    [ERROR_LIMIT_EXCEEDED]: 'Zahlung wurde abgelehnt. Bitte anderes Zahlungsmittel benutzen.',
    [ERROR_CANCELED_BY_USER]: 'Der Kunde hat die Bezahlung in der App abgelehnt.',
    [ERROR_TRANSACTION_NOT_FOUND]: 'Unbekannte Transaktion. Rückerstattung wurde nicht durchgeführt.',
    [ERROR_AMOUNT_TOO_HIGH]: 'Die Transaktion ist entweder schon vollständig rückerstattet oder Sie haben einen zu hohen Rückerstattungsbetrag angegeben.',
    [ERROR_UNAUTHORIZED]: 'Falsche Kassenkonfiguration (Benutzername oder Passwort ist ungültig). Bitte einen Administrator kontaktieren.',
    [STATUS_CONNECTING]: 'Verbindung wird aufgebaut...',
    [STATUS_PROCESSING]: 'In Behandlung...',
    [STATUS_APPROVED]: 'Bezahlung erfolgreich.',
    [STATUS_CANCELED]: 'Vorgang abgebrochen. Die Transaktion wurde nicht durchgeführt.',
    [STATUS_REFUNDED]: 'Rückerstattung erfolgreich.'
  }
}