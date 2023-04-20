jest.mock('../../../packages/@dcl/sdk-commands/node_modules/portfinder')
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
})
