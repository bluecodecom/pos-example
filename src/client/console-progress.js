/**
  * A Progress object can optionally be sent to any endpoint 
  * to receive status updates during the call and to be able to
  * cancel the call.
  * @typedef { Object } Progress
  * @property { function onProgress(message: string, [status]: string) => void } onProgress - 
  *   A "logger" that gets called with status updates during the call.
  * @property { function onCancellable(() => Promise) } onCancellable -
  *   A callback that will receive a cancel method. Call the cancel
  *   method to abort the transaction. Note that `onCancellable` will
  *   be called multiple times during the transaction; always call
  *   cancel on the latest instance.
  */
 
/**
  * @type {Progress}
  */
export const consoleProgress = {
  onProgress: (message, status) => {
    // a null message is allowed if the call is intended to just change status
    if (message != null) {
      console.log(message)
    }
  },
  onCancellable: (cancel) => {}
}

export const nullProgress = {
  onProgress: (message, status) => {},
  onCancellable: (cancel) => {}
}
