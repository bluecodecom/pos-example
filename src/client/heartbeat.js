/**
 * Handles the heartbeat call. It is sent on startup, shutdown and every 24 hours
 * between that.
 * @see https://bluecodepayment.readme.io/v4/reference#heartbeat
 * @param {BlueCodeClient} client 
 * @returns {async () => {}} onShutdown
 * @param {string} branchExtId Identifier for the branch (merchant location)
 * @param {string} terminal Identifier for this particular POS
 * @param {{}} mocks Used by the tests to mock setTimeout and clearTimeout
 */
export function heartbeat(client, branchExtId, terminal, mocks) {
  let setTimeout = (mocks && mocks.setTimeout) || window.setTimeout
  let clearTimeout = (mocks && mocks.clearTimeout) || window.clearTimeout

  let didSendStartup = false
  let timeoutId

  function schedule(callback, delayInMinutes) {
    return new Promise( 
      (resolve) => {
        timeoutId = setTimeout(
          () => {
            timeoutId = null
            
            resolve()
          }, 
          delayInMinutes * 60 * 1000)
      })
    .then(callback)
  }

  async function call(event) {
    try {
      await client.heartbeat(event, branchExtId, terminal)
    }
    catch (e) {
      console.warn('While calling heartbeat: ' + e.message)

      return await schedule(() => call(event), 1)
    }
  }

  async function schedulePeriod() {
    let nextPeriodInMinutes = 24 * 60 + Math.round(60 * (Math.random() - 0.5))

    schedule(
      async () => {
        await call('periodic')

        schedulePeriod()
      }, 
      nextPeriodInMinutes)
  }

  async function startup() {
    await call('startup')

    didSendStartup = true

    schedulePeriod()
  }

  schedule(startup, 0.1)

  let onShutdown = async () => {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }

    if (didSendStartup) {
      try {
        await client.heartbeat('shutdown', branchExtId, terminal)
      }
      catch (e) {
        console.warn('While calling heartbeat: ' + e.message)

        // no retry. this is called when the browser is leaving the page;
        // we need to finish quickly.
      }
    }
  }

  return onShutdown
}