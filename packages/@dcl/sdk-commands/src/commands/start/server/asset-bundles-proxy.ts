import { Router } from '@well-known-components/http-server'
import { Readable } from 'stream'

import { CliComponents } from '../../../components'
import { PreviewComponents } from '../types'

/**
 * Mounts the abgen sidecar behind the preview server: every request under
 * /optimized-assets streams through to the sidecar, so clients only ever see
 * the realm origin they already have — the sidecar's port stays a private
 * implementation detail of sdk-commands.
 *
 * The target URL is late-bound (a getter, not a value) because the sidecar
 * boots after the preview server is up — it reads the scene through the
 * preview's own /content endpoints. Until it answers /readyz the route
 * responds 503.
 */
export function setupAssetBundlesProxy(
  components: Pick<CliComponents, 'fetch'>,
  router: Router<PreviewComponents>,
  getSidecarUrl: () => string | undefined
) {
  router.all('/optimized-assets/:path+', async (ctx) => {
    const sidecarUrl = getSidecarUrl()
    if (!sidecarUrl) {
      return { status: 503, body: { ok: false, error: 'the asset-bundles sidecar is not running' } }
    }

    const method = ctx.request.method.toUpperCase()

    // forward the client's headers (the sidecar 415s JSON POSTs without their
    // content-type) minus the per-connection ones, which must describe the
    // proxy→sidecar leg instead: undici manages host and keep-alive itself, the
    // re-streamed body invalidates content-length, and accept-encoding is
    // dropped so undici negotiates (and transparently decodes) its own encoding.
    const requestHeaders = Object.fromEntries(ctx.request.headers)
    delete requestHeaders['host']
    delete requestHeaders['connection']
    delete requestHeaders['content-length']
    delete requestHeaders['accept-encoding']

    // The route pattern types :path+ as string[], but the runtime hands it over as one string.
    const rawPath = Array.isArray(ctx.params.path) ? ctx.params.path.join('/') : ctx.params.path

    // Explorer requests v49+ scene bundles by their digest-bearing file name under the
    // CDN's shared {version}/assets/ prefix (unity-explorer#9442). The sidecar serves
    // those same files through its flat /assets/{file} lane (bundle-index lookup) but
    // has no version-prefixed route, so strip the version segment on the way through.
    // TODO: drop once abgen serves GET /{version}/assets/{file} natively.
    const path = rawPath.replace(/^v\d+\/assets\//, 'assets/')

    const response = await components.fetch.fetch(`${sidecarUrl}/${path}${ctx.url.search}`, {
      headers: requestHeaders,
      method,
      body: method === 'GET' || method === 'HEAD' ? undefined : (ctx.request.body as any),
      duplex: 'half'
    } as any)

    // undici decompresses the body but leaves the original content-encoding /
    // content-length headers in place; forwarding them would make the client
    // re-decode (or truncate to the compressed length) the already-decoded body.
    // fetch() responses carry immutable Headers, so filter instead of delete.
    const headers = Object.fromEntries(response.headers)
    delete headers['content-encoding']
    delete headers['content-length']

    return {
      status: response.status,
      headers,
      // `response.body` is a web ReadableStream; convert it to a Node stream so
      // the http-server can pipe it (it only handles Node streams / Buffers / strings).
      body: response.body ? Readable.fromWeb(response.body as any) : undefined
    }
  })
}
