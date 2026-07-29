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
    const response = await components.fetch.fetch(`${sidecarUrl}/${ctx.params.path}${ctx.url.search}`, {
      headers: { connection: 'close' },
      method,
      body: method === 'GET' || method === 'HEAD' ? undefined : (ctx.request.body as any),
      duplex: 'half'
    } as any)

    // undici decompresses the body but leaves the original content-encoding /
    // content-length headers in place; forwarding them would make the client
    // re-decode (or truncate to the compressed length) the already-decoded body.
    response.headers.delete('content-encoding')
    response.headers.delete('content-length')

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      // `response.body` is a web ReadableStream; convert it to a Node stream so
      // the http-server can pipe it (it only handles Node streams / Buffers / strings).
      body: response.body ? Readable.fromWeb(response.body as any) : undefined
    }
  })
}
