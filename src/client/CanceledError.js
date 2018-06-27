import { ERROR_CANCELLED } from '../util/error-messages'

/**
  * Thrown when a transaction was cancelled using the {@link progress.Progress} object.
  */
export class CanceledError extends Error {
  constructor() {
    super('Canceled')

    this.wasCanceled = true
    this.code = ERROR_CANCELLED
  }
}
