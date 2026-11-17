import {
  isLinkerOrigin,
  setSignInRoutes
} from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/sign-in'

type Handler = (ctx: unknown) => Promise<{ status?: number; body: { success: boolean; error?: string } }>

describe('when checking where a sign-in request comes from', () => {
  describe('and it comes from the linker page on localhost', () => {
    it('should accept it', () => {
      expect(isLinkerOrigin('http://localhost:8001', 'localhost:8001')).toBe(true)
    })
  })

  describe('and it comes from another site', () => {
    it('should refuse it', () => {
      expect(isLinkerOrigin('https://example.com', 'localhost:8001')).toBe(false)
    })
  })

  describe('and a rebinding domain points at the linker', () => {
    it('should refuse it even though the origin matches the host', () => {
      expect(isLinkerOrigin('http://rebind.example.com:8001', 'rebind.example.com:8001')).toBe(false)
    })
  })

  describe('and it has no origin', () => {
    it('should refuse it', () => {
      expect(isLinkerOrigin(null, 'localhost:8001')).toBe(false)
    })
  })
})

describe('when the linker posts a sign-in', () => {
  let handler: Handler
  let onSigned: jest.Mock
  let json: jest.Mock
  let response: Awaited<ReturnType<Handler>>

  beforeEach(() => {
    onSigned = jest.fn()
    json = jest.fn().mockResolvedValue({ address: '0xexample', authChain: 'not a chain' })
    const router = {
      post: jest.fn((_path: string, routeHandler: Handler) => {
        handler = routeHandler
      })
    }
    setSignInRoutes(router as unknown as Parameters<typeof setSignInRoutes>[0], '0xephemeral', 'message', onSigned)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and another page in the browser posts it', () => {
    beforeEach(async () => {
      response = await handler({
        request: { headers: new Headers({ origin: 'https://example.com', host: 'localhost:8001' }), json }
      })
    })

    it('should refuse it without reading the signature', () => {
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
    })

    it('should validate the signature it sent', () => {
      expect(response).toEqual({
        status: 400,
        body: { success: false, error: 'The wallet did not sign the insights session' }
      })
    })
  })
})
