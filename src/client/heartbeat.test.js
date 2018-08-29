import { heartbeat } from './heartbeat'
import { wait } from './wait'

let callbacks = []

// mock for setTimeout so we don't have to wait.
function setTimeout(callback) {
  callbacks.push(callback)

  return callback
}

function clearTimeout(callback) {
  callbacks = callbacks.filter(c => c !== callback)
}

// call all pending setTimeouts. 
// jest has a method runOnlyPendingTimers that does the same thing
// but it seems to be screwing up async processing so can't use it.
function fastForward() {
  callbacks.forEach((callback) => callback())
  callbacks = []
}

it('calls startup, pending and shutdown', async () => {
  const BRANCH_EXT_ID = 'branch'
  const TERMINAL = 'terminal'

  let client = {
    heartbeat: () => {}
  }

  function mockHeartbeat() {
    client.heartbeat = jest.fn().mockImplementation(async (event) => {})
  }

  async function expectHeartbeat(expectedEvent) {
    mockHeartbeat()

    fastForward()

    // let promises run
    await wait(0)

    expect(client.heartbeat).toBeCalledWith(expectedEvent, BRANCH_EXT_ID, TERMINAL)
    expect(client.heartbeat).toHaveBeenCalledTimes(1)
  }

  let stopHeartbeat = heartbeat(client, BRANCH_EXT_ID, TERMINAL, {setTimeout, clearTimeout})

  await expectHeartbeat('startup')

  await expectHeartbeat('periodic')

  mockHeartbeat()

  stopHeartbeat()

  expect(client.heartbeat).toBeCalledWith('shutdown', BRANCH_EXT_ID, TERMINAL)

  expect(callbacks.length).toEqual(0)
})
