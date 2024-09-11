import { dirname, resolve } from 'path'
import fetch from 'node-fetch'
import https from 'https'
import { Router } from '@well-known-components/http-server'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { ChainId } from '@dcl/schemas'
import { AuthChain } from '@dcl/crypto'

import { CliComponents } from '../components'

/**
 * Set common routes to use on Linker dApp
 * @param components Server components
 * @param info Info to be sent within /api/info body response
 * @param mainRoute route to return the Linker dApp
 */
export function setRoutes<T extends { [key: string]: any }>(
  components: Pick<CliComponents, 'fs' | 'logger' | 'fetch' | 'config'>,
  info: T,
  mainRoute = '/'
) {
  const { fs } = components
  const router = new Router()
  const linkerDapp = dirname(require.resolve('@dcl/linker-dapp/package.json'))

  router.get(mainRoute, async () => ({
    headers: { 'Content-Type': 'text/html' },
    body: fs.createReadStream(resolve(linkerDapp, 'index.html'))
  }))

  router.get('/static/:type/:path', async (ctx) => {
    const contentType = getContentType(ctx.params.type)
    return {
      headers: { 'Content-Type': contentType },
      body: fs.createReadStream(resolve(linkerDapp, 'static', ctx.params.type, ctx.params.path))
    }
  })

  router.get('/assets/:path', async (ctx) => {
    const contentType = getContentTypeFromPath(ctx.params.path)
    return {
      headers: { 'Content-Type': contentType },
      body: fs.createReadStream(resolve(linkerDapp, 'assets', ctx.params.path))
    }
  })

  /* This route acts as a proxy to handle the auth flow with the Decentraland auth dApp,
   * because this latest one validates the communication be on the same domain.
   */
  router.get('/auth/login', async (ctx): Promise<IHttpServerComponent.IResponse> => {
    try {
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      })

      const url = 'https://decentraland.org/auth/login'

      // Forward the incoming request to the Decentraland auth endpoint.
      const resp = await fetch(url, {
        method: ctx.request.method, // Ensure the correct method (GET in this case).
        headers: ctx.request.headers, // Forward headers for proper proxy behavior.
        body: ctx.request.body, // Forward request body if necessary.
        agent: httpsAgent // Use the insecure HTTPS agent.
      })

      // Remove content-encoding header if present to prevent issues with compressed responses.
      resp.headers.delete('content-encoding')

      // Return the proxied response, including body, status, and headers.
      return {
        body: resp.body,
        status: resp.status,
        headers: resp.headers
      }
    } catch (error) {
      return {
        status: 500,
        body: `Proxy error: ${error instanceof Error ? error.message : error}`
      }
    }
  })

  router.get('/manifest.json', async () => ({
    headers: { 'Content-Type': 'application/json' },
    body: fs.createReadStream(resolve(linkerDapp, 'manifest.json'))
  }))

  router.get('/api/info', async () => ({
    body: info
  }))

  return { router }
}

function getContentType(type: string) {
  switch (type) {
    case 'css':
      return 'text/css'
    case 'js':
      return 'application/js'
    case 'media':
    default:
      return 'text/plain'
  }
}

function getContentTypeFromPath(path: string) {
  const ext = path.split('.').pop()
  switch (ext) {
    case 'css':
      return 'text/css'
    case 'js':
      return 'application/javascript'
    case 'media':
    default:
      return 'text/plain'
  }
}

export interface LinkerResponse {
  address: string
  authChain: AuthChain
  chainId?: ChainId
}
