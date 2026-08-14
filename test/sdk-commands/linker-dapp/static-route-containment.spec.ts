import {
  createTestServerComponent,
  ITestHttpServerComponent
} from '../../../packages/@dcl/sdk-commands/node_modules/@well-known-components/http-server'
import { createFsComponent, IFileSystemComponent } from '../../../packages/@dcl/sdk-commands/src/components/fs'
import { setUpManager } from '../../../packages/@dcl/sdk-commands/src/commands/quests/utils'
import { setRoutes } from '../../../packages/@dcl/sdk-commands/src/linker-dapp/routes'

describe('dApp static route containment', () => {
  let components: Parameters<typeof setRoutes>[0]
  let createReadStream: jest.SpyInstance
  let fs: IFileSystemComponent
  let server: ITestHttpServerComponent<Record<string, never>>

  beforeEach(() => {
    fs = createFsComponent()
    createReadStream = jest.spyOn(fs, 'createReadStream')
    components = {
      config: {} as Parameters<typeof setRoutes>[0]['config'],
      fetch: { fetch: jest.fn() },
      fs,
      logger: {} as Parameters<typeof setRoutes>[0]['logger']
    }
    server = createTestServerComponent()
  })

  afterEach(() => {
    createReadStream.mockRestore()
    server.resetMiddlewares()
  })

  describe('when a Linker asset path escapes its asset directory', () => {
    let response: Awaited<ReturnType<ITestHttpServerComponent<Record<string, never>>['fetch']>>

    beforeEach(async () => {
      const { router } = setRoutes(components, {})
      server.use(router.middleware())
      response = await server.fetch('/assets/%2e%2e%2fpackage.json')
    })

    it('should respond with not found', () => {
      expect(response.status).toBe(404)
    })
  })

  describe('when a Linker static path escapes its type directory', () => {
    let response: Awaited<ReturnType<ITestHttpServerComponent<Record<string, never>>['fetch']>>

    beforeEach(async () => {
      const { router } = setRoutes(components, {})
      server.use(router.middleware())
      response = await server.fetch('/static/js/%2e%2e%2f%2e%2e%2fpackage.json')
    })

    it('should respond with not found', () => {
      expect(response.status).toBe(404)
    })
  })

  describe('when a Quest Manager asset path escapes its package directory', () => {
    let response: Awaited<ReturnType<ITestHttpServerComponent<Record<string, never>>['fetch']>>

    beforeEach(async () => {
      const { router } = setUpManager(components)
      server.use(router.middleware())
      response = await server.fetch('/%2e%2e%2fpackage.json')
    })

    it('should respond with not found', () => {
      expect(response.status).toBe(404)
    })
  })
})
