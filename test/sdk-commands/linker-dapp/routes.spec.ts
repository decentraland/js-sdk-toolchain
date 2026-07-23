import {
  createTestServerComponent,
  ITestHttpServerComponent
} from '../../../packages/@dcl/sdk-commands/node_modules/@well-known-components/http-server'
import { IFetchComponent } from '../../../packages/@dcl/sdk-commands/src/components/fetch'
import { createFsComponent } from '../../../packages/@dcl/sdk-commands/src/components/fs'
import { setRoutes } from '../../../packages/@dcl/sdk-commands/src/linker-dapp/routes'

describe('linker dApp routes', () => {
  let components: Parameters<typeof setRoutes>[0]
  let fetch: jest.MockedFunction<IFetchComponent['fetch']>
  let server: ITestHttpServerComponent<Record<string, never>>

  beforeEach(() => {
    fetch = jest.fn().mockResolvedValue({
      body: null,
      headers: new Map<string, string>(),
      status: 200
    })
    components = {
      config: {} as Parameters<typeof setRoutes>[0]['config'],
      fetch: { fetch },
      fs: createFsComponent(),
      logger: {} as Parameters<typeof setRoutes>[0]['logger']
    }
    server = createTestServerComponent()

    const { router } = setRoutes(components, {})
    server.use(router.middleware())
    server.use(router.allowedMethods())
  })

  afterEach(() => {
    fetch.mockReset()
    server.resetMiddlewares()
  })

  describe('when the auth endpoint proxies a request', () => {
    it('should use the fetch client default TLS verification', async () => {
      await server.fetch('/auth/login')

      expect(fetch.mock.calls[0][1]).not.toHaveProperty('dispatcher')
    })
  })
})
