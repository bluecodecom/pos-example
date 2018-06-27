import { CanceledError } from './CanceledError'
import { consoleProgress } from './console-progress';

/**
  * Waits for a specified number of milliseconds.
  * @param {number} ms 
  * @param {progress.Progress} progress 
  */
export function wait(ms, progress) {
  progress = progress || consoleProgress

  return new Promise((resolve, reject) => {
    // if a cancellation request comes there is no cleanup to be
    // done but we must throw an error to abort processing
    progress.onCancellable(() => reject(new CanceledError()))

    setTimeout(resolve, ms)
  })
}
