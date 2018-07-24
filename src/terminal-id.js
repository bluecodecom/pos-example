import { getLocalStorage } from './util/local-storage'
import { randomString } from './util/client-util';

const TERMINAL_KEY = 'terminal-id'

/**
  * Returns a ID uniquely identifying this POS. Used for the heartbeat call.
  * We're generating a random ID since there is no way to identify a browser,
  * but a real terminal would probably have a more reliable ID 
  * (the MAC address could be used)
  */
export function getTerminalId() {
  let terminalId = getLocalStorage().getItem(TERMINAL_KEY)
  
  if (!terminalId) {
    terminalId = randomString()

    getLocalStorage().setItem(TERMINAL_KEY, terminalId)
  }
  
  return terminalId
}