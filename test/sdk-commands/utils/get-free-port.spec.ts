jest.mock('net', () => ({ __esModule: true, ...jest.requireActual('net') }))

import * as net from 'net'
import { getPort } from '../../../packages/@dcl/sdk-commands/src/logic/get-free-port'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('utils/get-free-port', () => {
  it('should return the same port provided', async () => {
    const result = await getPort(8, 123)
    expect(result).toBe(8)
  })

  it('should return a free port from the OS when none is provided', async () => {
    const result = await getPort(NaN, 123)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(65536)
  })

  it('should return the fail-over port when probing fails', async () => {
    jest.spyOn(net, 'createServer').mockImplementation(() => {
      throw new Error('probe failed')
    })
    const result = await getPort(NaN, 123)
    expect(result).toBe(123)
  })
})
