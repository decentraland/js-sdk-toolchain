import { createHash } from 'crypto'
import { homedir } from 'os'
import * as path from 'path'

import { CliComponents } from '../../components'

/**
 * The pinned abgen release the sidecar runs. Each release archive is
 * self-contained: the `abgen` binary plus the `template/` and `shader/`
 * assets it resolves from its own directory, so the whole archive is
 * extracted and the binary runs from inside it.
 */
export const ABGEN_VERSION = 'v0.11.7'

const ABGEN_RELEASE_BASE_URL = `https://github.com/decentraland/abgen/releases/download/${ABGEN_VERSION}`

// sha256 of each release archive, straight from the release's SHA256SUMS.txt.
// The builds are reproducible (built twice in CI, required bit-identical), so
// these are stable for the pinned tag.
const ABGEN_SHA256: Record<string, string> = {
  'x86_64-unknown-linux-gnu': '47c6c6f068daf6b81795955716340111b6a0e0e6585f218887d519b3d97cd5fd',
  'aarch64-unknown-linux-gnu': '7865bc76b1a0e975b84fc1e1d5accf60adfe85b21441489c18062cf60ed66b7a',
  'x86_64-apple-darwin': '78f8a643620b1bca4926f95bd93e0680bb1e87ca47ea8b9923cbf99d031f8587',
  'aarch64-apple-darwin': 'f83888e29676928bde67005db374ab357f8d98eb3a07ac8ac293945dff05afa9',
  'x86_64-pc-windows-gnu': 'a9e5a9683337341925b36c641b9ff17605b979a7096878f15ad814d6f8c73eab',
  'aarch64-pc-windows-gnullvm': 'b64d07e8910b3dfffd86091c978a3d2e4df1a6b1aa11c128c57b2f836c2eef81'
}

const TARGET_BY_PLATFORM: Record<string, string> = {
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
  'win32-x64': 'x86_64-pc-windows-gnu',
  'win32-arm64': 'aarch64-pc-windows-gnullvm'
}

/**
 * Cache-class storage (the archive is re-downloadable): XDG_CACHE_HOME when
 * set, otherwise the platform's native cache dir. Deliberately not
 * ~/.decentraland — that is the Creator Hub's *legacy* home it is migrating
 * away from.
 */
export function getAbgenStorageRoot(): string {
  if (process.env.XDG_CACHE_HOME) return path.join(process.env.XDG_CACHE_HOME, 'decentraland', 'abgen')
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'decentraland', 'abgen')
  }
  if (process.platform === 'darwin') return path.join(homedir(), 'Library', 'Caches', 'decentraland', 'abgen')
  return path.join(homedir(), '.cache', 'decentraland', 'abgen')
}

/**
 * Resolves the abgen binary to run: $ABGEN_BIN if set, then a previously
 * downloaded copy of the pinned release, then `abgen` on the PATH, and only
 * when none exist a fresh download (sha256-verified against the values above).
 */
export async function resolveAbgenBin(
  components: Pick<CliComponents, 'fetch' | 'logger' | 'spawner' | 'fs'>
): Promise<string> {
  if (process.env.ABGEN_BIN) return process.env.ABGEN_BIN

  const binName = process.platform === 'win32' ? 'abgen.exe' : 'abgen'
  const target = TARGET_BY_PLATFORM[`${process.platform}-${process.arch}`]
  const dist = target && `abgen-${ABGEN_VERSION}-${target}`
  const binPath = dist && path.join(getAbgenStorageRoot(), dist, binName)
  if (binPath && (await components.fs.fileExists(binPath))) {
    await pruneStaleReleases(components, dist)
    return binPath
  }

  const onPath = await findOnPath(components, binName)
  if (onPath) return onPath

  if (!target || !dist || !binPath) {
    components.logger.warn(
      `asset-bundles: no prebuilt abgen ${ABGEN_VERSION} for ${process.platform}-${process.arch}; falling back to "abgen" on the PATH`
    )
    return 'abgen'
  }

  try {
    await downloadRelease(components, dist, target)
    if (!(await components.fs.fileExists(binPath))) {
      throw new Error(`${dist}.tar.gz did not contain ${dist}/${binName}`)
    }
    await pruneStaleReleases(components, dist)
    return binPath
  } catch (error: any) {
    components.logger.warn(
      `asset-bundles: could not download abgen ${ABGEN_VERSION} (${error.message}); falling back to "abgen" on the PATH`
    )
    return 'abgen'
  }
}

/**
 * Superseded release dirs are never resolved again (lookups are exact on the
 * pinned version), so once the pinned one is in place the others are deleted.
 * Staging dirs are left alone — a concurrent resolver may be mid-extract.
 * Cache housekeeping only: failures never affect the resolve.
 */
async function pruneStaleReleases(components: Pick<CliComponents, 'fs' | 'logger'>, keep: string): Promise<void> {
  const root = getAbgenStorageRoot()
  try {
    for (const entry of await components.fs.readdir(root)) {
      if (entry === keep || !entry.startsWith('abgen-v')) continue
      await components.fs.rm(path.join(root, entry), { recursive: true, force: true })
      components.logger.info(`asset-bundles: pruned superseded ${entry}`)
    }
  } catch {}
}

async function findOnPath(components: Pick<CliComponents, 'fs'>, binName: string): Promise<string | undefined> {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue
    const candidate = path.join(dir, binName)
    if (await components.fs.fileExists(candidate)) return candidate
  }
  return undefined
}

let stagingSeq = 0

async function downloadRelease(
  components: Pick<CliComponents, 'fetch' | 'logger' | 'spawner' | 'fs'>,
  dist: string,
  target: string
): Promise<void> {
  const url = `${ABGEN_RELEASE_BASE_URL}/${dist}.tar.gz`
  components.logger.info(`asset-bundles: downloading ${url}`)

  const response = await components.fetch.fetch(url)
  if (!response.ok) throw new Error(`GET ${url} responded ${response.status}`)
  const archive = Buffer.from(await response.arrayBuffer())

  const sha256 = createHash('sha256').update(archive).digest('hex')
  if (sha256 !== ABGEN_SHA256[target]) {
    throw new Error(`sha256 mismatch for ${dist}.tar.gz: expected ${ABGEN_SHA256[target]}, got ${sha256}`)
  }

  const root = getAbgenStorageRoot()
  // stage per-call, publish with an atomic rename: concurrent resolvers never see a half-extracted dist
  const staging = path.join(root, `.staging-${process.pid}-${++stagingSeq}`)
  await components.fs.mkdir(staging, { recursive: true })
  try {
    const tarball = path.join(staging, `${dist}.tar.gz`)
    await components.fs.writeFile(tarball, archive)
    // tar ships with Linux, macOS and Windows 10+; GNU and BSD tar both refuse
    // absolute and '..' member paths unless -P is passed, so extraction stays in staging
    await components.spawner.exec(staging, 'tar', ['-xzf', tarball], { silent: true, shell: false })
    try {
      await components.fs.rename(path.join(staging, dist), path.join(root, dist))
    } catch (error) {
      if (!(await components.fs.directoryExists(path.join(root, dist)))) throw error
    }
  } finally {
    await components.fs.rm(staging, { recursive: true, force: true }).catch(() => {})
  }
}
