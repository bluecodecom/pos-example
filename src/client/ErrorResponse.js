/**
 * Custom error class that includes an error code that can be used to look up an error message.
 */
export class ErrorResponse extends Error {
  /**
   * @param code A string that serves as error code. 
   *  Used to look up the appropriate error message to display in the POS.
   * @param {{}} response The JSON response the server sent, if any.
   * @param {number} retryIndex
   */
  constructor(message, code, response, retryIndex) {
    super(message)

    this.response = response
    this.retryIndex = retryIndex
    this.code = code
  }
}
