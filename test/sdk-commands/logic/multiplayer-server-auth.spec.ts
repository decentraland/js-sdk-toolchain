import { initComponents, CliComponents } from '../../../packages/@dcl/sdk-commands/src/components'
import { addSignatureRoute } from '../../../packages/@dcl/sdk-commands/src/logic/multiplayer-server-auth'

type Handler = (ctx: any) => Promise<{ status?: number; body: unknown }>

describe('when the linker dApp posts a multiplayer-server signature', () => {
  let components: CliComponents
  let handler: Handler
  let onSigned: jest.Mock
  let json: jest.Mock
  let response: Awaited<ReturnType<Handler>>

  beforeEach(async () => {
    jest.useFakeTimers()
    components = await initComponents()
    jest.spyOn(components.logger, 'error').mockImplementation(() => undefined)
    onSigned = jest.fn()
    json = jest.fn().mockResolvedValue({ address: '0xexample', authChain: [{ type: 'SIGNER', payload: '0xexample' }] })
    const router = {
      post: jest.fn((_path: string, routeHandler: Handler) => {
        handler = routeHandler
      })
    }
    addSignatureRoute(router as any, components, onSigned)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('and another page in the browser posts it', () => {
    beforeEach(async () => {
      response = await handler({
        request: { headers: new Headers({ origin: 'https://example.com', host: 'localhost:8001' }), json }
      })
      jest.runAllTimers()
    })

    it('should refuse it without reading or using the signature', () => {
      expect({ status: response.status, read: json.mock.calls.length, signed: onSigned.mock.calls.length }).toEqual({
        status: 403,
        read: 0,
        signed: 0
      })
    })
  })

  describe('and the linker page posts it', () => {
    beforeEach(async () => {
      response = await handler({
        request: { headers: new Headers({ origin: 'http://localhost:8001', host: 'localhost:8001' }), json }
      })
      jest.runAllTimers()
    })

    it('should hand the signature to the command', () => {
      expect(onSigned).toHaveBeenCalledWith({
        address: '0xexample',
        authChain: [{ type: 'SIGNER', payload: '0xexample' }]
      })
    })
  })

  describe('and the linker page posts it without an auth chain', () => {
    beforeEach(async () => {
      json.mockReset().mockResolvedValue({ address: '0xexample' })
      response = await handler({
        request: { headers: new Headers({ origin: 'http://localhost:8001', host: 'localhost:8001' }), json }
      })
      jest.runAllTimers()
    })

    it('should answer 400 without using it', () => {
      expect({ status: response.status, signed: onSigned.mock.calls.length }).toEqual({ status: 400, signed: 0 })
    })
  })
})
