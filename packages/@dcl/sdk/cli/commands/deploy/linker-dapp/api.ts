import { createServerComponent, FullHttpServerComponent, Router } from '@well-known-components/http-server'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { createRecordConfigComponent } from '@well-known-components/env-config-provider'
import { createConsoleLogComponent } from '@well-known-components/logger'
import { dirname, resolve } from 'path'
import { EventEmitter } from 'events'
import fs from 'fs-extra'
import portfinder from 'portfinder'
import { ChainId, Scene } from '@dcl/schemas'
import urlParse from 'url'
import querystring from 'querystring'

import { getPointers } from './catalyst-pointers'
import { getCustomConfig } from './config'
import { IFile } from '../../../utils/scene'
import { getObject } from '../../preview/coordinates'

export type LinkerResponse = {
  address: string
  signature: string
  chainId?: ChainId
}

type DeployInfo = {
  linkerResponse?: LinkerResponse
  status?: 'deploying' | 'success'
}

/**
 * Events emitted by this class:
 *
 * link:ready   - The server is up and running
 * link:success - Signatire success
 * link:error   - The transaction failed and the server was closed
 */

type Route = (
  path: string,
  fn: (ctx: IHttpServerComponent.DefaultContext) => Promise<IHttpServerComponent.IResponse>
) => void

type Async = 'async'
type Method = 'get' | 'post'
type AsyncMethod = `${Async}${Capitalize<Method>}`

type AsyncRouter = Router<Record<string, unknown>> & {
  [key in AsyncMethod]: Route
}

export class LinkerAPI extends EventEmitter {
  private scene: Scene
  private files: IFile[]
  private app: FullHttpServerComponent<Record<string, unknown>> | undefined
  private deployInfo: DeployInfo

  constructor(scene: Scene, files: IFile[]) {
    super()
    this.scene = scene
    this.files = files
    this.deployInfo = {}
    this.app = undefined
  }

  link(dir: string, port: number, isHttps: boolean, rootCID: string, skipValidations: boolean) {
    return new Promise(async (_resolve, reject) => {
      let resolvedPort = port

      if (!resolvedPort) {
        try {
          resolvedPort = await portfinder.getPortPromise()
        } catch (e) {
          resolvedPort = 4044
        }
      }

      const config = createRecordConfigComponent({
        HTTP_SERVER_PORT: resolvedPort.toString(),
        HTTP_SERVER_HOST: '0.0.0.0',
        ...process.env
      })
      const logs = await createConsoleLogComponent({})

      const queryParams = querystring.stringify(await this.getSceneInfo(rootCID, skipValidations))
      const protocol = isHttps ? 'https' : 'http'
      const url = `${protocol}://localhost:${resolvedPort}`

      const router = this.setRoutes(rootCID, skipValidations)

      this.on('link:error', (err) => reject(err))

      const components = { config, logs }
      const https = isHttps ? await this.getCredentials() : undefined

      this.app = await createServerComponent(components, { https })

      this.app.setContext(components)
      this.app.use(router.allowedMethods())
      this.app.use(router.middleware())

      if (this.app.start) {
        // don't want to use LifeCycle so...
        await this.app.start({
          started() {
            return true
          },
          live() {
            return true
          },
          getComponents() {
            return components
          }
        })
        this.emit('link:ready', { url, params: queryParams })
      }
    })
  }

  async getCredentials() {
    const privateKey = await fs.readFile(resolve(__dirname, '../../../certs/localhost.key'), 'utf-8')
    const certificate = await fs.readFile(resolve(__dirname, '../../../certs/localhost.crt'), 'utf-8')
    return { key: privateKey, cert: certificate }
  }

  async getSceneInfo(rootCID: string, skipValidations: boolean) {
    const { LANDRegistry, EstateRegistry } = getCustomConfig()
    const {
      scene: { parcels, base },
      display
    } = this.scene

    return {
      baseParcel: base,
      parcels,
      rootCID,
      landRegistry: LANDRegistry,
      estateRegistry: EstateRegistry,
      debug: !!process.env.DEBUG,
      title: display?.title,
      description: display?.description,
      skipValidations
    }
  }

  private setRoutes(rootCID: string, skipValidations: boolean) {
    const router = new Router() as AsyncRouter
    const linkerDapp = dirname(require.resolve('@dcl/linker-dapp/package.json'))

    /**
     * Async method to try/catch errors
     */
    const methods: Capitalize<Method>[] = ['Get', 'Post']
    for (const method of methods) {
      const asyncMethod: AsyncMethod = `async${method}`
      router[asyncMethod] = async (path, fn) => {
        const originalMethod = method.toLocaleLowerCase() as Method
        router[originalMethod](path, async (ctx) => {
          try {
            const resp = await fn(ctx)
            return resp
          } catch (e) {
            console.log(e)
            return {}
          }
        })
      }
    }

    router.get('/', async () => {
      return {
        headers: { 'Content-Type': 'text/html' },
        body: fs.createReadStream(resolve(linkerDapp, 'index.html'))
      }
    })

    router.get('/static/css/:path', async (ctx) => {
      return {
        headers: { 'Content-Type': 'text/css' },
        body: fs.createReadStream(resolve(linkerDapp, 'static', 'css', ctx.params.path))
      }
    })

    router.get('/static/js/:path', async (ctx) => {
      return {
        headers: { 'Content-Type': 'application/js' },
        body: fs.createReadStream(resolve(linkerDapp, 'static', 'js', ctx.params.path))
      }
    })

    router.get('/manifest.json', async () => {
      return {
        headers: { 'Content-Type': 'application/json' },
        body: fs.createReadStream(resolve(linkerDapp, 'manifest.json'))
      }
    })

    router.get('/static/media/:path', async (ctx) => {
      return {
        headers: { 'Content-Type': 'text/plain' },
        body: fs.createReadStream(resolve(linkerDapp, 'static', 'media', ctx.params.path))
      }
    })

    router.asyncGet('/api/info', async () => {
      return {
        body: await this.getSceneInfo(rootCID, skipValidations)
      }
    })

    router.asyncGet('/api/files', async () => {
      return {
        body: this.files.map((file) => ({
          name: file.path,
          size: file.size
        }))
      }
    })

    router.asyncGet('/api/catalyst-pointers', async () => {
      const { x, y } = getObject(this.scene.scene.base)
      const pointer = `${x},${y}`
      const chainId = this.deployInfo.linkerResponse?.chainId || 1
      const network = chainId === ChainId.ETHEREUM_MAINNET ? 'mainnet' : 'goerli'
      const value = await getPointers(pointer, network)

      return {
        body: {
          catalysts: value,
          status: this.deployInfo.status ?? ''
        }
      }
    })

    router.get('/api/close', async (ctx) => {
      const { ok, reason } = urlParse.parse(ctx.url.toString(), true).query

      if (ok === 'true') {
        const value = JSON.parse(reason?.toString() || '{}') as LinkerResponse
        this.deployInfo = { ...this.deployInfo, linkerResponse: value }
        this.emit('link:success', value)
      }

      this.emit('link:error', new Error(`Failed to link: ${reason}`))
      return {}
    })

    router.asyncPost('/api/deploy', async (ctx) => {
      type Body = {
        address: string
        signature: string
        chainId: ChainId
      }
      const value = (await ctx.request.json()) as Body

      if (!value.address || !value.signature || !value.chainId) {
        throw new Error(`Invalid payload: ${Object.keys(value).join(' - ')}`)
      }

      this.deployInfo = { ...this.deployInfo, linkerResponse: value, status: 'deploying' }
      this.emit('link:success', value)
      // this.emit('link:error', new Error(`Failed to link: ${reason}`))
      return {}
    })

    return router
  }
}
