import * as path from 'path'

import { CliComponents } from '../../components'
import { getCatalystBaseUrl } from '../../logic/config'
import { drainResponse } from '../../logic/fetch'
import { getPort } from '../../logic/get-free-port'
import { ABGEN_VERSION, resolveAbgenBin } from './abgen-binary'

const READY_TIMEOUT_MS = 15_000
const READY_POLL_INTERVAL_MS = 250
const READY_REQUEST_TIMEOUT_MS = 2_000

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
  const port = await getPort(0)
  const url = `http://127.0.0.1:${port}`
  const catalystUrl = await getCatalystBaseUrl(components)
  // next to scene.json: converted bundles survive preview restarts (never
  // reconverted) and stay per-scene; the leading dot rides the default
  // dcl-ignore, keeping the dir out of the watcher and deployments
  const cacheRoot = path.join(projectRoot, '.dcl-optimized-assets')

  // ABGEN_* variables already present in the environment win over this wiring
  const env: Record<string, string> = {
    HTTP_SERVER_HOST: '127.0.0.1',
    HTTP_SERVER_PORT: port.toString(),
    ABGEN_CATALYST_URL: process.env.ABGEN_CATALYST_URL || `http://127.0.0.1:${previewPort}/content`,
    ABGEN_WORLDS_CONTENT_URL: process.env.ABGEN_WORLDS_CONTENT_URL || `${catalystUrl}/content`,
    ABGEN_OUT_ROOT: process.env.ABGEN_OUT_ROOT || path.join(cacheRoot, 'out'),
    ABGEN_CACHE_DIR: process.env.ABGEN_CACHE_DIR || path.join(cacheRoot, 'cache'),
    RUST_LOG: process.env.RUST_LOG || 'abgen=info,tower_http=warn'
  }

  // shell-less spawn: paths with spaces need no quoting, and kill() reaches abgen itself
  let exited = false
  components.spawner
    .exec(process.cwd(), bin, [], { env, silent: false, shell: false })
    .catch((error: Error) => components.logger.warn(`asset-bundles: ${bin} exited (${error.message})`))
    .finally(() => {
      exited = true
    })

  const deadline = Date.now() + READY_TIMEOUT_MS
  while (Date.now() < deadline && !exited) {
    if (await isReady(components, url)) return url
    await sleep(READY_POLL_INTERVAL_MS)
  }

  components.logger.warn(
    `asset-bundles: ${bin} did not come up on ${url}. Install abgen ${ABGEN_VERSION} (put abgen on the PATH or set ABGEN_BIN) to serve asset bundles in preview, or run without --asset-bundles.`
  )
  return undefined
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
