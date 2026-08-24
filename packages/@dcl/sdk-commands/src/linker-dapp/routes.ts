import { dirname, resolve } from 'path'
import { Readable } from 'stream'
import { Agent } from 'undici'
import { Router } from '@well-known-components/http-server'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { ChainId } from '@dcl/schemas'
import { AuthChain } from '@dcl/crypto'

import { CliComponents } from '../components'

/**
 * Headers that describe THIS connection rather than the proxied request. Passing them along
 * makes undici reject the request outright or leaves the upstream framing a body that is no
 * longer the one being sent.
 */
const HOP_BY_HOP_HEADERS = new Set([
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

/**
 * Builds the header set to forward upstream, with `overrides` winning over whatever the
 * client sent.
 *
 * Header names are case-insensitive on the wire but not as object keys, so an incoming
 * `host` and an override `Host` would both survive into the request and be sent as two
 * conflicting headers. Names are lowercased and the overridden ones dropped first, so each
 * one is written exactly once.
 */
function forwardedHeaders(
  request: IHttpServerComponent.IRequest,
  overrides: Record<string, string>
): Record<string, string> {
  const overridden = new Set(Object.keys(overrides).map((name) => name.toLowerCase()))
  const headers: Record<string, string> = {}

  for (const [key, value] of request.headers) {
    const name = key.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(name) || overridden.has(name)) continue
    headers[name] = value
  }

  return { ...headers, ...overrides }
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

  // Dispatcher used by the /auth proxy below to skip TLS verification, mirroring the
  // previous `new https.Agent({ rejectUnauthorized: false })` behavior with native fetch.
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

  /* This route acts as a proxy to handle the auth flow with the Decentraland auth dApp,
   * because this latest one validates the communication be on the same domain.
   */
  router.get('/auth/(.*)', async (ctx): Promise<IHttpServerComponent.IResponse> => {
    try {
      const domain = 'decentraland.org'
      const url = `https://${domain}${ctx.url.pathname}${ctx.url.search}`

      // Forward the incoming request to the Decentraland auth endpoint.
      //
      // The client's headers have to be ITERATED, never spread: they live behind a
      // symbol-keyed slot, so a spread copies that symbol and none of the headers — and
      // undici rejects a symbol key outright ("cannot be converted to a ByteString"),
      // taking the whole proxied request down with it.
      const resp = await components.fetch.fetch(url, {
        method: ctx.request.method, // Ensure the correct method (GET in this case).
        headers: forwardedHeaders(ctx.request, {
          host: domain,
          referer: url,
          origin: url
        }),
        body: ctx.request.body as any, // Forward request body if necessary.
        duplex: 'half', // Required by native fetch when streaming a request body.
        dispatcher: insecureDispatcher // Skip TLS verification.
      })

      // undici decompresses the body but leaves content-encoding / content-length in
      // place; forwarding them would make the client re-decode or truncate the body.
      // The headers on a fetch() Response are immutable (mutating them throws
      // `TypeError: immutable`), so build a filtered copy instead of deleting in place.
      const headers: Record<string, string> = {}
      for (const [key, value] of resp.headers) {
        const name = key.toLowerCase()
        if (name === 'content-encoding' || name === 'content-length') continue
        headers[key] = value
      }

      // Return the proxied response, including body, status, and headers.
      // `resp.body` is a web ReadableStream; convert it to a Node stream so the
      // http-server can pipe it (it only handles Node streams / Buffers / strings).
      return {
        body: resp.body ? Readable.fromWeb(resp.body as any) : undefined,
        status: resp.status,
        headers
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
