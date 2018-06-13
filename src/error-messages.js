// client-side status values
export const STATUS_CONNECTING = 'CONNECTING'
export const STATUS_PROCESSING = 'PROCESSING'

// server-side payment status values 
export const STATUS_APPROVED = 'APPROVED'
export const STATUS_CANCELED = 'CANCELED'
export const STATUS_REFUNDED = 'REFUNDED'

// client-side error codes
export const ERROR_TIMEOUT = 'TIMEOUT'
export const ERROR_CANCELLED = 'CANCELLED'

// server-side error codes
export const ERROR_SYSTEM_FAILURE = 'SYSTEM_FAILURE'
export const ERROR_ISSUER_NOT_SUPPORTED = 'ISSUER_NOT_SUPPORTED'
export const ERROR_INVALID_BARCODE = 'INVALID_BARCODE'
export const ERROR_INVALID_BRANCH = 'INVALID_BRANCH'
export const ERROR_FRAUD_DETECTED = 'FRAUD_DETECTED'
export const ERROR_INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS'
export const ERROR_INVALID_STATE = 'INVALID_STATE'
export const ERROR_LIMIT_EXCEEDED = 'LIMIT_EXCEEDED'
export const ERROR_TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND'
export const ERROR_AMOUNT_TOO_HIGH = 'AMOUNT_TOO_HIGH'
export const ERROR_UNAUTHORIZED = 'UNAUTHORIZED'

export const MESSAGES = {
  'en': {
    [ERROR_TIMEOUT]: 'Could not reach server. Internet connection might not work. Please try again.',
    [ERROR_CANCELLED]: 'Transaction cancelled.',
    [ERROR_SYSTEM_FAILURE]: 'Unexpected technical error. Please try again.',
    [ERROR_ISSUER_NOT_SUPPORTED]: 'The customer\'s Blue Code account is not supported.',
    [ERROR_INVALID_BARCODE]: 'Invalid barcode. Ask the customer to generate a new code and try again.',
    [ERROR_INVALID_BRANCH]: 'Wrong configuration (invalid branch ID). Please contact an administrator.',
    [ERROR_FRAUD_DETECTED]: 'Payment was declined. Use a different form of payment.',
    [ERROR_INSUFFICIENT_FUNDS]: 'Payment was declined. Use a different form of payment.',
    [ERROR_INVALID_STATE]: 'Payment was declined. Use a different form of payment.',
    [ERROR_LIMIT_EXCEEDED]: 'Payment was declined. Use a different form of payment.',
    [ERROR_TRANSACTION_NOT_FOUND]: 'Unknown transaction. Could not refund.',
    [ERROR_AMOUNT_TOO_HIGH]: 'Amount to refund is too high. Leave amount empty to do a complete refund.',
    [ERROR_UNAUTHORIZED]: 'Wrong configuration (username or password is invalid). Please contact an administrator.',
    [STATUS_CONNECTING]: 'Connecting...',
    [STATUS_PROCESSING]: 'Processing...',
    [STATUS_APPROVED]: 'Payment successful.',
    [STATUS_CANCELED]: 'Transaction cancelled.',
    [STATUS_REFUNDED]: 'Refund succesful.'
  },
  'de': {
    [ERROR_TIMEOUT]: 'Server konnte nicht erreicht werden. Eventuell funktioniert die Internetverbindung nicht. Versuchen Sie es bitte erneut.',
    [ERROR_CANCELLED]: 'Vorgang abgebrochen. Die Transaktion wurde nicht durchgeführt.',
    [ERROR_SYSTEM_FAILURE]: 'Systemfehler. Versuchen Sie es bitte später erneut.',
    [ERROR_ISSUER_NOT_SUPPORTED]: 'Dieses Blue Code-Konto wird leider nicht unterstützt.',
    [ERROR_INVALID_BARCODE]: 'Falscher Strichcode. Bitten Sie den Kunden einen neuen Code zu generieren und versuchen Sie es erneut.',
    [ERROR_INVALID_BRANCH]: 'Falsche Kassenkonfiguration (Blue Code Branch ID ist ungültig). Bitte einen Administrator kontaktieren.',
    [ERROR_FRAUD_DETECTED]: 'Zahlung wurde abgelehnt. Bitte anderes Zahlungsmittel benutzen.',
    [ERROR_INSUFFICIENT_FUNDS]: 'Zahlung wurde abgelehnt. Bitte anderes Zahlungsmittel benutzen.',
    [ERROR_INVALID_STATE]: 'Zahlung wurde abgelehnt. Bitte anderes Zahlungsmittel benutzen.',
    [ERROR_LIMIT_EXCEEDED]: 'Zahlung wurde abgelehnt. Bitte anderes Zahlungsmittel benutzen.',
    [ERROR_TRANSACTION_NOT_FOUND]: 'Unbekannte Transaktion. Rückerstattung wurde nicht durchgeführt.',
    [ERROR_AMOUNT_TOO_HIGH]: 'Rückerstattungsbetrag ist zu hoch. Geben Sie keinen Betrag an um die Transaktion vollständig zu rückerstatten.',
    [ERROR_UNAUTHORIZED]: 'Falsche Kassenkonfiguration (Benutzername oder Passwort ist ungültig). Bitte einen Administrator kontaktieren.',
    [STATUS_CONNECTING]: 'Verbindung wird aufgebaut...',
    [STATUS_PROCESSING]: 'In Behandlung...',
    [STATUS_APPROVED]: 'Bezahlung erfolgreich.',
    [STATUS_CANCELED]: 'Vorgang abgebrochen. Die Transaktion wurde nicht durchgeführt.',
    [STATUS_REFUNDED]: 'Rückerstattung erfolgreich.'
  }
}