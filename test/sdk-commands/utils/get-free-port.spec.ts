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

  it('never returns a port that is taken on 0.0.0.0, the address the preview server binds', async () => {
    // occupy the base port (8000) with an IPv4-only listener, like a leftover preview server;
    // a hostless probe binds the IPv6 wildcard and, on macOS, misses this listener entirely
    const blocker = net.createServer()
    blocker.unref()
    const blocked = await new Promise<boolean>((resolve) => {
      blocker.once('error', () => resolve(false))
      blocker.listen(8000, '0.0.0.0', () => resolve(true))
    })
    try {
      const result = await getPort(NaN, 123)
      if (blocked) expect(result).not.toBe(8000)
      // the returned port must be bindable on 0.0.0.0, exactly like the real server binds it
      const server = net.createServer()
      server.unref()
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(result, '0.0.0.0', () => resolve())
      })
      await new Promise((resolve) => server.close(resolve))
    } finally {
      if (blocked) await new Promise((resolve) => blocker.close(resolve))
    }
  })

  it('should return the fail-over port when probing fails', async () => {
    jest.spyOn(net, 'createServer').mockImplementation(() => {
      throw new Error('probe failed')
    })
    const result = await getPort(NaN, 123)
    expect(result).toBe(123)
  })
})
