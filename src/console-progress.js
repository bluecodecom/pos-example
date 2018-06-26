/**
  * A Progress object can optionally be sent to any endpoint 
  * to receive status updates during the call and to be able to
  * cancel the call.
  * @typedef { Object } Progress
  * @property { function onProgress(message: string, [status]: string) => void } onProgress - A logger instance that gets 
  *   called with status updates on the call.
  * @property { function onCancellable(() => Promise) } onCancellable -
  *   A callback that will receive a cancel method. Call the cancel
  *   method to abort the transaction. Note that the method will
  *   be called multiple times during the transaction; always call
  *   cancel on the latest instance.
  */
 
/**
  * @type {Progress}
  */
export const consoleProgress = {
  onProgress: (message, status) => {
    console.log(message)
  },
  onCancellable: (cancel) => {}
}

