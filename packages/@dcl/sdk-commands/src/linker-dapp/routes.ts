import { dirname, resolve } from 'path'
import { Readable } from 'stream'
import { Agent } from 'undici'
import { Router } from '@well-known-components/http-server'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { ChainId } from '@dcl/schemas'
import { AuthChain } from '@dcl/crypto'

import { CliComponents } from '../components'

const STRIPPED_REQUEST_HEADERS = new Set([
  'connection',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
])

export function forwardedHeaders(
  request: IHttpServerComponent.IRequest,
  overrides: Record<string, string>
): Record<string, string> {
  const overriddenNames = new Set(Object.keys(overrides).map((name) => name.toLowerCase()))
  const forwarded: Record<string, string> = {}

  for (const [key, value] of request.headers) {
    const name = key.toLowerCase()
    if (STRIPPED_REQUEST_HEADERS.has(name) || overriddenNames.has(name)) continue
    forwarded[name] = value
  }

  return { ...forwarded, ...overrides }
}

/**
 * Builds the headers returned to the linker-dapp client from a proxied fetch response.
 *
 * undici transparently decompresses the body but leaves the upstream `content-encoding` and
 * `content-length` in place; forwarding them would make the client re-decode an already-decoded
 * body or truncate it at the wrong length, so both are dropped and the framing is recomputed
 * downstream.
 */
export function proxiedResponseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of headers) {
    const name = key.toLowerCase()
    if (['content-encoding', 'content-length'].includes(name)) continue
    result[name] = value
  }

  return result
}

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

  const insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } })

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

  router.get('/auth/(.*)', async (ctx): Promise<IHttpServerComponent.IResponse> => {
    try {
      const domain = 'decentraland.org'
      const url = `https://${domain}${ctx.url.pathname}${ctx.url.search}`

      const response = await components.fetch.fetch(url, {
        method: ctx.request.method,
        headers: forwardedHeaders(ctx.request, {
          host: domain,
          referer: url,
          origin: url
        }),
        body: ctx.request.body as any,
        duplex: 'half',
        dispatcher: insecureDispatcher
      })

      const responseHeaders = proxiedResponseHeaders(response.headers)

      return {
        body: response.body ? Readable.fromWeb(response.body as any) : undefined,
        status: response.status,
        headers: responseHeaders
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
  deleteSignature?: string
}
