/// <reference types="node" />

jest.mock('../../../packages/@dcl/sdk-commands/node_modules/portfinder')
import net from 'net'
import * as pf from '../../../packages/@dcl/sdk-commands/node_modules/portfinder'
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

  it('should return found available port', async () => {
    const pfSpy = jest.spyOn(pf, 'getPortPromise').mockResolvedValueOnce(8000)
    const result = await getPort(NaN, 123)
    expect(result).toBe(8000)
    expect(pfSpy).toBeCalledWith({ port: 0 })
  })

  it('should return fail over port', async () => {
    const pfSpy = jest.spyOn(pf, 'getPortPromise').mockRejectedValue(null)
    const result = await getPort(NaN, 123)
    expect(result).toBe(123)
    expect(pfSpy).toBeCalledWith({ port: 0 })
  })

  it('should fail with an actionable error when the explicit port is taken', async () => {
    const occupied = net.createServer()
    await new Promise<void>((resolve) => occupied.listen(0, '0.0.0.0', resolve))
    const busyPort = (occupied.address() as net.AddressInfo).port

    try {
      const error: Error = await getPort(busyPort, 123).then(
        (port) => new Error(`expected getPort to reject, got ${port}`),
        (e) => e
      )
      expect(error.message).toMatch(new RegExp(`${busyPort}.*already in use`))
      expect(error.message).toMatch(/previous/i)
    } finally {
      await new Promise<void>((resolve) => occupied.close(() => resolve()))
    }
  })

  it('should return the explicit port when it is free', async () => {
    const probe = net.createServer()
    await new Promise<void>((resolve) => probe.listen(0, '0.0.0.0', resolve))
    const freePort = (probe.address() as net.AddressInfo).port
    await new Promise<void>((resolve) => probe.close(() => resolve()))

    expect(await getPort(freePort, 123)).toBe(freePort)
  })
})
