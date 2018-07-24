import { getTerminalId } from './terminal-id'

it('returns a terminal ID', () => {
  expect(getTerminalId()).toBeTruthy()
})

it('maintains a constant terminal ID', () => {
  // calling getTerminalId twice returns the same value.
  expect(getTerminalId()).toEqual(getTerminalId())
})