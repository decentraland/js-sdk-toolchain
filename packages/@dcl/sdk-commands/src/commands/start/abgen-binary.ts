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
export const ABGEN_VERSION = 'v0.11.3'

const ABGEN_RELEASE_BASE_URL = `https://github.com/decentraland/abgen/releases/download/${ABGEN_VERSION}`

// sha256 of each release archive, straight from the release's SHA256SUMS.txt.
// The builds are reproducible (built twice in CI, required bit-identical), so
// these are stable for the pinned tag.
const ABGEN_SHA256: Record<string, string> = {
  'x86_64-unknown-linux-gnu': 'e0ca4e8088de2f161519c82a66ff8787f5324523e3787dc08f68a60d619d98bc',
  'aarch64-unknown-linux-gnu': 'b8a91cfb40bb2d585dba48886d573381c67334b83ce70ff3618411c4fe20b60c',
  'x86_64-apple-darwin': '00564f0a1794fc2b11a86ecb60106d7ec31b9dceada2432c14c52a03d4ebc1cd',
  'aarch64-apple-darwin': 'a5e815ab34e21b7d293d617f16116a899dc1b066e8333123e4345465128aae69',
  'x86_64-pc-windows-gnu': '9dbe053160f51966ef4e2e0c2424356db4aebb5e2921e90ecb0f44ab246aaaf3',
  'aarch64-pc-windows-gnullvm': 'cedd380d7002b8ae64d7ecde28833a10ba98425c749e8a23b072ed0d6b1de89d'
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
 * downloaded copy of the pinned release, then a fresh download (sha256-verified
 * against the values above), and finally `abgen` on the PATH when the platform
 * has no prebuilt archive or the download fails.
 */
export async function resolveAbgenBin(
  components: Pick<CliComponents, 'fetch' | 'logger' | 'spawner' | 'fs'>
): Promise<string> {
  if (process.env.ABGEN_BIN) return process.env.ABGEN_BIN

  const target = TARGET_BY_PLATFORM[`${process.platform}-${process.arch}`]
  if (!target) {
    components.logger.warn(
      `asset-bundles: no prebuilt abgen ${ABGEN_VERSION} for ${process.platform}-${process.arch}; falling back to "abgen" on the PATH`
    )
    return 'abgen'
  }

  const dist = `abgen-${ABGEN_VERSION}-${target}`
  const binName = process.platform === 'win32' ? 'abgen.exe' : 'abgen'
  const binPath = path.join(getAbgenStorageRoot(), dist, binName)
  if (await components.fs.fileExists(binPath)) return binPath

  try {
    await downloadRelease(components, dist, target)
    if (!(await components.fs.fileExists(binPath))) {
      throw new Error(`${dist}.tar.gz did not contain ${dist}/${binName}`)
    }
    return binPath
  } catch (error: any) {
    components.logger.warn(
      `asset-bundles: could not download abgen ${ABGEN_VERSION} (${error.message}); falling back to "abgen" on the PATH`
    )
    return 'abgen'
  }
}

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
  await components.fs.mkdir(root, { recursive: true })
  const tarball = path.join(root, `${dist}.tar.gz`)
  await components.fs.writeFile(tarball, archive)
  try {
    // tar ships with Linux, macOS and Windows 10+; the archive extracts to <dist>/
    await components.spawner.exec(root, 'tar', ['-xzf', tarball], { silent: true, shell: false })
  } finally {
    await components.fs.unlink(tarball).catch(() => {})
  }
}
