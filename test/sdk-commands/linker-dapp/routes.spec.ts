import { createRequire } from 'module'
import type { IHttpServerComponent } from '@well-known-components/interfaces'
import { forwardedHeaders } from '../../../packages/@dcl/sdk-commands/src/linker-dapp/routes'

const sdkRequire = createRequire(require.resolve('../../../packages/@dcl/sdk-commands/package.json'))
const { Headers } = sdkRequire('node-fetch')

function requestWithHeaders(headers: Record<string, string>): IHttpServerComponent.IRequest {
  return { headers: new Headers(headers) } as unknown as IHttpServerComponent.IRequest
}

describe('forwardedHeaders', () => {
  let overrides: Record<string, string>
  let request: IHttpServerComponent.IRequest
  let result: Record<string, string>

  beforeEach(() => {
    overrides = {
      host: 'decentraland.org',
      referer: 'https://decentraland.org/auth/requests/abc',
      origin: 'https://decentraland.org/auth/requests/abc'
    }
  })

  describe('when the request headers come from node-fetch', () => {
    beforeEach(() => {
      request = requestWithHeaders({ Authorization: 'Bearer token' })
      result = forwardedHeaders(request, overrides)
    })

    it('should return a plain object without the node-fetch symbol slot that undici rejects', () => {
      expect(Object.getOwnPropertySymbols(result)).toHaveLength(0)
    })

    it('should forward the client header with a lowercased name', () => {
      expect(result.authorization).toBe('Bearer token')
    })
  })

  describe('when the client sends headers that collide with the overrides', () => {
    beforeEach(() => {
      request = requestWithHeaders({ host: 'localhost:3000', origin: 'http://localhost:3000' })
      result = forwardedHeaders(request, overrides)
    })

    it('should use the override host instead of the incoming one', () => {
      expect(result.host).toBe('decentraland.org')
    })

    it('should use the override origin instead of the incoming one', () => {
      expect(result.origin).toBe('https://decentraland.org/auth/requests/abc')
    })
  })

  describe('when the client sends connection-scoped headers', () => {
    beforeEach(() => {
      request = requestWithHeaders({ connection: 'keep-alive', 'content-length': '42', authorization: 'Bearer token' })
      result = forwardedHeaders(request, overrides)
    })

    it('should drop the connection header', () => {
      expect(result.connection).toBeUndefined()
    })

    it('should drop the content-length header', () => {
      expect(result['content-length']).toBeUndefined()
    })

    it('should still forward the end-to-end headers', () => {
      expect(result.authorization).toBe('Bearer token')
    })
  })
})
