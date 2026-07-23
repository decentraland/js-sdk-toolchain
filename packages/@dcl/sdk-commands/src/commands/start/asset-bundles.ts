import * as path from 'path'
import portfinder from 'portfinder'

import { CliComponents } from '../../components'
import { printProgressInfo, printProgressStep } from '../../logic/beautiful-logs'
import { getCatalystBaseUrl } from '../../logic/config'
import { drainResponse } from '../../logic/fetch'
import { getPort } from '../../logic/get-free-port'
import { b64UrlHashingFunction } from '../../logic/project-files'
import { ABGEN_VERSION, resolveAbgenBin } from './abgen-binary'

const READY_TIMEOUT_MS = 15_000
const READY_POLL_INTERVAL_MS = 250
const READY_REQUEST_TIMEOUT_MS = 2_000
const PREWARM_POLL_MS = 2_500
const PREWARM_FALLBACK_EVERY_TICKS = 4 // seconds-heartbeat cadence when /progress is unavailable
const PREWARM_TIMEOUT_MS = 15 * 60_000
const PREWARM_RETRY_DELAY_MS = 2_000

// abgen's default port, and the Explorer's default `optimized-assets-url`:
// preferring it lets a connected Unity Editor find the sidecar with zero
// configuration. Scans upward when taken (the deeplink carries the real URL).
const PREFERRED_SIDECAR_PORT = 5147

/**
 * Boots an `abgen` sidecar: an ab-cdn-compatible server that JIT-converts the
 * scene being previewed into asset bundles, reading it through the preview's
 * own /content endpoints. Returns the sidecar URL once it answers /readyz, or
 * undefined — with a warning — when the binary is missing or never comes up.
 * The binary resolves from $ABGEN_BIN, then a cached copy of the pinned abgen
 * release, then `abgen` on the PATH, and downloads the release only when none exist.
 */
export async function runAssetBundlesSidecar(
  components: Pick<CliComponents, 'fetch' | 'logger' | 'spawner' | 'config' | 'fs'>,
  previewPort: number,
  projectRoot: string
): Promise<string | undefined> {
  const bin = await resolveAbgenBin(components)
  const port = await portfinder.getPortPromise({ port: PREFERRED_SIDECAR_PORT }).catch(() => getPort(0))
  const url = `http://127.0.0.1:${port}`
  const catalystUrl = await getCatalystBaseUrl(components)
  // next to scene.json: converted bundles survive preview restarts (never
  // reconverted) and stay per-scene; the leading dot rides the default
  // dcl-ignore, keeping the dir out of the watcher and deployments
  const cacheRoot = path.join(projectRoot, '.dcl-optimized-assets')

  // Wearables/emotes and every other non-local entity stream prebuilt from the
  // production CDN (abgen's upstream read-through) instead of being converted
  // locally per scene — only the previewed scene is ever built. The worlds
  // content fallback is disabled so nothing remote is even convertible.
  const upstreamAbCdn = catalystUrl.includes('.zone')
    ? 'https://ab-cdn.decentraland.zone'
    : 'https://ab-cdn.decentraland.org'

  // The eager index lane is off: the explorer's registry POSTs (/entities/active)
  // are about wearables and emotes, and eager-building those against the preview
  // server can only 404 (it serves the local scene's files, not remote entities) —
  // the upstream read-through covers them. The previewed scene still converts JIT
  // on its manifest request. Platforms are narrowed to the host as belt-and-braces
  // for anyone re-enabling the lane via env.
  const hostPlatform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux'

  // ABGEN_* variables already present in the environment win over this wiring
  const env: Record<string, string> = {
    HTTP_SERVER_HOST: '127.0.0.1',
    HTTP_SERVER_PORT: port.toString(),
    ABGEN_CATALYST_URL: process.env.ABGEN_CATALYST_URL || `http://127.0.0.1:${previewPort}/content`,
    ABGEN_WORLDS_CONTENT_URL: process.env.ABGEN_WORLDS_CONTENT_URL || 'off',
    ABGEN_UPSTREAM_AB_CDN: process.env.ABGEN_UPSTREAM_AB_CDN || upstreamAbCdn,
    ABGEN_INDEX_BUILD_PLATFORMS: process.env.ABGEN_INDEX_BUILD_PLATFORMS || hostPlatform,
    ABGEN_INDEX_EAGER_BUILD: process.env.ABGEN_INDEX_EAGER_BUILD || 'off',
    ABGEN_OUT_ROOT: process.env.ABGEN_OUT_ROOT || path.join(cacheRoot, 'out'),
    ABGEN_CACHE_DIR: process.env.ABGEN_CACHE_DIR || path.join(cacheRoot, 'cache'),
    // warnings only: abgen's per-asset INFO output would drown the conversion
    // heartbeat below; export RUST_LOG to get the full sidecar logs back
    RUST_LOG: process.env.RUST_LOG || 'abgen=warn,tower_http=warn'
  }

  // shell-less spawn: paths with spaces need no quoting, and kill() reaches abgen itself.
  // Silent by default: the sidecar's per-file ABGEN_BUILD telemetry would drown the
  // conversion heartbeat; exporting RUST_LOG opts back into the full sidecar output.
  let exited = false
  components.spawner
    .exec(process.cwd(), bin, [], { env, silent: !process.env.RUST_LOG, shell: false })
    .catch((error: Error) => components.logger.warn(`asset-bundles: ${bin} exited (${error.message})`))
    .finally(() => {
      exited = true
    })

  const deadline = Date.now() + READY_TIMEOUT_MS
  while (Date.now() < deadline && !exited) {
    if (await isReady(components, url)) {
      await prewarmScene(components, url, projectRoot, hostPlatform, () => !exited)
      return url
    }
    await sleep(READY_POLL_INTERVAL_MS)
  }

  components.logger.warn(
    `asset-bundles: ${bin} did not come up on ${url}. Install abgen ${ABGEN_VERSION} (put abgen on the PATH or set ABGEN_BIN) to serve asset bundles in preview, or run without --asset-bundles.`
  )
  return undefined
}

/**
 * Converts the previewed scene before the explorer ever asks: the sidecar holds a
 * manifest request open until the conversion finishes, so awaiting one here means
 * the explorer's own manifest fetch is always a cache hit and cannot time out on a
 * large first-time conversion. Conversions persist in .dcl-optimized-assets, so
 * only the first run of a scene pays this wait; failures keep the pre-existing
 * degrade (the explorer falls back to raw GLTFs).
 */
async function prewarmScene(
  components: Pick<CliComponents, 'fetch' | 'logger'>,
  url: string,
  projectRoot: string,
  platform: string,
  sidecarAlive: () => boolean
): Promise<void> {
  // the same id the preview content server hands out for this scene
  const entityId = b64UrlHashingFunction(projectRoot)
  const started = Date.now()
  const deadline = started + PREWARM_TIMEOUT_MS
  const elapsed = () => Math.round((Date.now() - started) / 1000)
  printProgressInfo(components.logger, 'asset-bundles: converting the scene (cached after the first run)...')
  let ticks = 0
  const heartbeat = setInterval(() => {
    ticks++
    void (async () => {
      // per-asset progress from the sidecar; falls back to a plain elapsed-time
      // heartbeat against sidecars that predate the /progress route
      const progress = await fetchBuildProgress(components, url, entityId)
      if (progress) {
        printProgressStep(components.logger, `converting ${progress.file}`, progress.done, progress.total)
      } else if (ticks % PREWARM_FALLBACK_EVERY_TICKS === 0) {
        printProgressInfo(components.logger, `asset-bundles: still converting... (${elapsed()}s)`)
      }
    })()
  }, PREWARM_POLL_MS)
  let lastError = 'timed out'
  try {
    // A single held request can die a transport death minutes in; the conversion keeps
    // running server-side regardless, and a retried request attaches to the in-flight
    // build (or hits the finished cache), so just keep asking until the deadline.
    while (Date.now() < deadline) {
      try {
        const response = await components.fetch.fetch(`${url}/manifest/${entityId}_${platform}.json`, {
          signal: AbortSignal.timeout(deadline - Date.now())
        })
        const manifest = (await response.json()) as { exitCode?: number; files?: string[] }
        if (response.ok && manifest.exitCode === 0) {
          components.logger.log(
            `asset-bundles: scene converted (${manifest.files?.length ?? 0} bundles, ${elapsed()}s)`
          )
        } else {
          components.logger.warn(
            `asset-bundles: scene conversion reported exitCode ${manifest.exitCode}; assets that failed to convert will load as raw GLTFs`
          )
        }
        return
      } catch (error: any) {
        lastError = error.message
        // a dead sidecar can never answer: stop retrying and let the explorer degrade
        if (!sidecarAlive() || !(await isReady(components, url))) {
          components.logger.warn(
            `asset-bundles: the sidecar went away during conversion (${lastError}); previewing with raw GLTFs`
          )
          return
        }
        await sleep(PREWARM_RETRY_DELAY_MS)
      }
    }
    components.logger.warn(
      `asset-bundles: scene pre-conversion did not finish (${lastError}); the explorer may need a reload once conversion completes`
    )
  } finally {
    clearInterval(heartbeat)
  }
}

async function fetchBuildProgress(
  components: Pick<CliComponents, 'fetch'>,
  url: string,
  entityId: string
): Promise<{ done: number; total: number; file: string } | undefined> {
  try {
    const response = await components.fetch.fetch(`${url}/progress/${entityId}`, {
      signal: AbortSignal.timeout(1_000)
    })
    if (!response.ok) return undefined
    const progress = (await response.json()) as { done?: number; total?: number; file?: string }
    if (typeof progress.done !== 'number' || typeof progress.total !== 'number' || !progress.total) return undefined
    return { done: progress.done, total: progress.total, file: progress.file ?? '' }
  } catch {
    return undefined
  }
}

async function isReady(components: Pick<CliComponents, 'fetch'>, url: string): Promise<boolean> {
  try {
    const response = await components.fetch.fetch(`${url}/readyz`, {
      signal: AbortSignal.timeout(READY_REQUEST_TIMEOUT_MS)
    })
    await drainResponse(response)
    return response.ok
  } catch {
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
