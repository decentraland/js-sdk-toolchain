import { Router } from '@well-known-components/http-server'
import { Readable } from 'stream'

import { CliComponents } from '../../../components'
import { AssetBundles } from '../asset-bundles'
import { PreviewComponents } from '../types'

/**
 * Serves the ab-cdn surface the explorer expects, under the realm origin:
 *
 *   GET {realm}/optimized-assets/manifest/{entity}_{platform}.json
 *   GET {realm}/optimized-assets/{version}/{cid}/{file}
 *
 * The previewed scene is converted in-process (../asset-bundles) and answered
 * from memory. Everything else — wearables, emotes, any entity that is not the
 * scene under preview — reads through to the production ab-cdn: the preview
 * server holds the local scene's files, so converting those here could only
 * fail.
 */
export function setupAssetBundlesProxy(
  components: Pick<CliComponents, 'fetch'>,
  router: Router<PreviewComponents>,
  getAssetBundles: () => AssetBundles | undefined
) {
  router.get('/optimized-assets/manifest/:name', async (ctx) => {
    const assetBundles = getAssetBundles()
    if (!assetBundles) return { status: 503, body: { ok: false, error: 'asset bundles are not enabled' } }

    const parsed = parseManifestName(ctx.params.name)
    if (!parsed) return { status: 404, body: { ok: false, error: 'malformed manifest name' } }

    if (parsed.entityId !== assetBundles.entityId) {
      if (!safeSegments(ctx.params.name)) {
        return { status: 400, body: { ok: false, error: 'illegal manifest name' } }
      }
      return readThrough(components, assetBundles, `manifest/${ctx.params.name}`, ctx.url.search)
    }

    // The explorer asking early must wait, not see a 404 and fall back to raw
    // GLTFs for good.
    await assetBundles.ready
    const scene = assetBundles.get(parsed.platform)
    if (!scene) return { status: 404, body: { ok: false, error: 'the scene was not converted' } }

    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: scene.manifest
    }
  })

  router.get('/optimized-assets/:version/:cid/:file', async (ctx) => {
    const assetBundles = getAssetBundles()
    if (!assetBundles) return { status: 503, body: { ok: false, error: 'asset bundles are not enabled' } }

    const { version, cid, file } = ctx.params
    if (cid === assetBundles.entityId) {
      await assetBundles.ready
      for (const platform of platformsOf(assetBundles)) {
        const data = assetBundles.get(platform)?.bundles.get(file)
        if (data) {
          return {
            status: 200,
            headers: { 'content-type': 'application/octet-stream' },
            body: data
          }
        }
      }
      return { status: 404, body: { ok: false, error: 'no such bundle' } }
    }

    if (!safeSegments(version, cid, file)) {
      return { status: 400, body: { ok: false, error: 'illegal bundle path' } }
    }
    return readThrough(components, assetBundles, `${version}/${cid}/${file}`, ctx.url.search)
  })
}

/** `{entityId}_{platform}.json` — the ab-cdn manifest naming. */
function parseManifestName(name: string): { entityId: string; platform: string } | undefined {
  const stem = name.endsWith('.json') ? name.slice(0, -'.json'.length) : undefined
  if (!stem) return undefined
  const underscore = stem.lastIndexOf('_')
  if (underscore <= 0) return undefined
  return { entityId: stem.slice(0, underscore), platform: stem.slice(underscore + 1) }
}

function platformsOf(assetBundles: AssetBundles): string[] {
  return ['windows', 'mac', 'linux', 'webgl'].filter((p) => assetBundles.get(p))
}

/** ab-cdn path segments are hashes and bundle names; nothing else is legal. */
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/

function safeSegments(...segments: string[]): boolean {
  return segments.every((seg) => SAFE_SEGMENT.test(seg) && seg !== '.' && seg !== '..')
}

// The upstream is a third party and this reply carries the realm's origin:
// forwarding wholesale would let it set cookies and CSP for a preview server
// that serves Access-Control-Allow-Origin: *.
const FORWARDED_HEADERS = ['content-type', 'etag', 'cache-control', 'last-modified']

async function readThrough(
  components: Pick<CliComponents, 'fetch'>,
  assetBundles: AssetBundles,
  suffix: string,
  search: string
) {
  const response = await components.fetch.fetch(`${assetBundles.upstreamAbCdn}/${suffix}${search}`)

  const headers: Record<string, string> = {}
  for (const name of FORWARDED_HEADERS) {
    const value = response.headers.get(name)
    if (value) headers[name] = value
  }

  return {
    status: response.status,
    headers,
    // Streamed: these are tens of MB each and the explorer asks for many at
    // once, so buffering put every body in the dev server's heap.
    body: response.body ? Readable.fromWeb(response.body as any) : undefined
  }
}
