import * as crypto from 'crypto'
import * as path from 'path'

import { CliComponents } from '../../components'
import { printProgressInfo } from '../../logic/beautiful-logs'
import { getCatalystBaseUrl } from '../../logic/config'
import { b64UrlHashingFunction, getPublishableFiles, normalizeDecentralandFilename } from '../../logic/project-files'

/** Bundles for one entity, keyed by the file name the ab-cdn serves them under. */
export type ConvertedScene = {
  entityId: string
  platform: string
  manifest: string
  bundles: Map<string, Buffer>
}

export type AssetBundles = {
  /** The previewed scene's entity id, as the preview content server hands it out. */
  entityId: string
  /** Where non-local entities (wearables, emotes) stream prebuilt bundles from. */
  upstreamAbCdn: string
  /** Always resolves; undefined when the conversion failed or found nothing. */
  ready: Promise<ConvertedScene | undefined>
  get(platform: string): ConvertedScene | undefined
  /**
   * Marks the converted scene stale. The next `ready` reconverts; until then
   * nothing runs, so a save touching twenty files costs one conversion and an
   * idle preview costs none.
   */
  invalidate(): void
}

/** Past this, a lock's owner is presumed dead and its staging is litter. */
const STALE_LOCK_MS = 10 * 60_000
/** Past this, converting twice beats waiting any longer on another preview. */
const WAIT_FOR_LOCK_MS = 2 * 60_000
const POLL_LOCK_MS = 250

/** "windows" | "mac" | "linux" — the platforms abgen's export lane accepts. */
export function hostPlatform(): string {
  return process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux'
}

/**
 * Converts the previewed scene in-process via @dcl/abgen-node.
 *
 * Converted up front, so the explorer's manifest request is a hit and cannot
 * time out mid-conversion. Results persist under .dcl-optimized-assets, whose
 * leading dot rides the default dcl-ignore — out of the watcher and out of
 * deployments — so only a scene's first preview pays the wait.
 *
 * Returns undefined with a warning when the native addon is unavailable; the
 * explorer degrades to raw GLTFs.
 */
export async function setupAssetBundles(
  components: Pick<CliComponents, 'fetch' | 'logger' | 'config' | 'fs'>,
  projectRoot: string
): Promise<AssetBundles | undefined> {
  const abgen = await loadAbgen(components)
  if (!abgen) return undefined

  const entityId = b64UrlHashingFunction(projectRoot)
  const catalystUrl = await getCatalystBaseUrl(components)
  const upstreamAbCdn =
    process.env.ABGEN_UPSTREAM_AB_CDN ||
    (catalystUrl.includes('.zone') ? 'https://ab-cdn.decentraland.zone' : 'https://ab-cdn.decentraland.org')

  const cacheRoot = path.join(projectRoot, '.dcl-optimized-assets')
  const converted = new Map<string, ConvertedScene>()
  const platform = hostPlatform()

  await sweepStaging(components, cacheRoot)

  // One conversion per distinct content, and only the newest publishes.
  //
  // Two separate faults lived here. A second invalidate() while a conversion
  // was running started a duplicate run over identical bytes, and both wrote
  // the same cache directory concurrently. And whichever run resolved LAST won
  // the `converted` map, so a slow pre-edit run overwrote the fast post-edit
  // one; `stale` was already false, so nothing re-ran, and preview served
  // pre-edit bundles until the next edit — with `ready` resolving to the new
  // scene while `get()` returned the old one.
  //
  // The digest is the lock: identical files means the same key, so a request
  // for work already in flight joins it instead of starting a second. It also
  // identifies the result — a run only publishes if its key is still the one
  // most recently asked for, which is what makes a superseded run harmless
  // rather than merely later. Keying on content and not mtime because a touch
  // with no edit must not re-convert, and readProjectFiles already reads every
  // byte, so the digest costs nothing extra.
  const inFlight = new Map<string, Promise<ConvertedScene | undefined>>()
  let wanted = ''

  // Deciding whether to start a run is itself async — the key comes from
  // reading the files — so the check and the registration must not be split by
  // an await, or two callers both resume from readScene, both find the map
  // empty, and both convert. This gate closes that window. It covers the
  // decision ONLY, and opens again the moment one is made: held across the
  // conversion it would serialise the work itself, and a newer edit has to be
  // free to start while a superseded run is still going.
  let gate: Promise<unknown> = Promise.resolve()

  const run = (): Promise<ConvertedScene | undefined> => {
    let opened!: () => void
    const mine = new Promise<void>((resolve) => (opened = resolve))
    const previous = gate
    gate = mine

    return (async () => {
      await previous
      try {
        const scene = await readScene(components, projectRoot)
        if (!scene) return undefined
        wanted = scene.contentKey

        const existing = inFlight.get(scene.contentKey)
        if (existing) return existing

        const task = convertScene(components, abgen, { projectRoot, entityId, platform, cacheRoot }, scene)
          .then((result) => {
            // Stale by the time it landed: someone edited while this ran, so a
            // newer key is wanted and publishing this would undo it.
            if (wanted !== scene.contentKey) return result
            converted.clear()
            if (result) converted.set(result.platform, result)
            return result
          })
          .catch((error: Error) => {
            components.logger.warn(`asset-bundles: conversion failed (${error.message}); previewing with raw GLTFs`)
            return undefined
          })
          .finally(() => {
            inFlight.delete(scene.contentKey)
          })

        inFlight.set(scene.contentKey, task)
        return task
      } finally {
        // Before awaiting the conversion, not after: the decision is what is
        // exclusive. `finally` also opens the gate when readScene throws, so a
        // failed read cannot wedge every later run.
        opened()
      }
    })()
  }

  let current = run()
  let stale = false

  return {
    entityId,
    upstreamAbCdn,
    // A getter, not a field: reconversion happens on demand, so the caller
    // that awaits it gets the fresh scene rather than one from before its edit.
    get ready() {
      if (stale) {
        stale = false
        current = run()
      }
      return current
    },
    get: (p) => converted.get(p),
    invalidate() {
      stale = true
    }
  }
}

/**
 * A plain dependency, so the module is always installed — but the native
 * binary inside it is not. @dcl/abgen-node carries no os/cpu constraint and
 * declares its five per-platform binaries as its own optionalDependencies, so
 * on a platform with no prebuild (musl, win32-arm64) the package resolves and
 * the require fails. That must degrade the preview, not end it.
 */
async function loadAbgen(components: Pick<CliComponents, 'logger'>): Promise<AbgenModule | undefined> {
  try {
    // Through a variable so the build does not require the addon present.
    const specifier = '@dcl/abgen-node'
    return (await import(specifier)) as unknown as AbgenModule
  } catch (error: any) {
    components.logger.warn(
      `asset-bundles: no @dcl/abgen-node binary for ${process.platform}-${process.arch} (${error.message}); ` +
        'previewing with raw GLTFs. Run without --asset-bundles to silence this.'
    )
    return undefined
  }
}

type SceneFile = { name: string; data: Buffer }

/** What the scene currently is: its files and the key they hash to. */
async function readScene(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectRoot: string
): Promise<{ files: SceneFile[]; contentKey: string } | undefined> {
  const files = await readProjectFiles(components, projectRoot)
  if (!files.length) {
    components.logger.warn('asset-bundles: the project has no publishable files; nothing to convert')
    return undefined
  }
  // Keyed on what was converted, never on where it lives: a path-keyed entry
  // served stale bundles for the rest of the scene's life after any edit.
  // Names are in the digest too, abgen deriving bundle names from them.
  return { files, contentKey: digestOf(files) }
}

async function convertScene(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  abgen: AbgenModule,
  job: { projectRoot: string; entityId: string; platform: string; cacheRoot: string },
  input: { files: SceneFile[]; contentKey: string }
): Promise<ConvertedScene | undefined> {
  const { files, contentKey } = input
  const full = { ...job, contentKey }
  const cached = await readCache(components, full)
  if (cached) {
    components.logger.log(`asset-bundles: scene already converted (${cached.bundles.size} bundles, cached)`)
    return cached
  }

  const lock = await acquireLock(components, full)
  try {
    // The lock may have been held by another preview that has since finished,
    // so the miss above can be out of date by the time we get here.
    const justFinished = await readCache(components, full)
    if (justFinished) {
      components.logger.log(
        `asset-bundles: scene converted by another preview (${justFinished.bundles.size} bundles, cached)`
      )
      return justFinished
    }
    return await runConversion(components, abgen, full, files)
  } finally {
    await lock.release()
  }
}

/**
 * Keeps a second preview of the same project off work already in progress.
 *
 * Advisory only, and deliberately so: every failure mode here — a stale lock, a
 * timeout, an unwritable directory — degrades to converting twice, which
 * writeCache's atomic publish already makes safe. Correctness never rests on
 * the lock, so it can be as approximate as it likes.
 */
async function acquireLock(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  job: { cacheRoot: string; platform: string; contentKey: string }
): Promise<{ release(): Promise<void> }> {
  const lockPath = `${cacheDir(job)}.lock`
  const noop = { release: async () => undefined }
  const drop = {
    release: async () => {
      try {
        await components.fs.unlink(lockPath)
      } catch {
        // Someone judged it stale and took it. Theirs to remove now.
      }
    }
  }

  const deadline = Date.now() + WAIT_FOR_LOCK_MS
  for (;;) {
    try {
      await components.fs.mkdir(job.cacheRoot, { recursive: true })
      await components.fs.writeFile(lockPath, `${process.pid}\n`, { flag: 'wx' })
      return drop
    } catch (error: any) {
      if (error?.code !== 'EEXIST') return noop
    }

    const age = await lockAge(components, lockPath)
    if (age === undefined) continue // released while we looked; try to take it
    if (age > STALE_LOCK_MS) {
      // Its owner died mid-conversion. Nothing here is transactional enough to
      // be worth a handshake — the cost of being wrong is a second conversion.
      try {
        await components.fs.unlink(lockPath)
      } catch {
        // Lost the race to another waiter; it holds the lock now.
      }
      continue
    }
    if (Date.now() > deadline) {
      components.logger.warn('asset-bundles: another preview is still converting this scene; converting anyway')
      return noop
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_LOCK_MS))
  }
}

async function lockAge(components: Pick<CliComponents, 'fs'>, lockPath: string): Promise<number | undefined> {
  try {
    return Date.now() - (await components.fs.stat(lockPath)).mtimeMs
  } catch {
    return undefined
  }
}

async function runConversion(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  abgen: AbgenModule,
  job: { projectRoot: string; entityId: string; platform: string; cacheRoot: string; contentKey: string },
  files: SceneFile[]
): Promise<ConvertedScene | undefined> {
  const started = Date.now()
  printProgressInfo(components.logger, 'asset-bundles: converting the scene (cached after the first run)...')

  const result = await abgen.convert({ files, platform: job.platform, entityHash: job.entityId })

  const elapsed = Math.round((Date.now() - started) / 1000)
  if (result.code !== 0 || result.errors.length) {
    components.logger.warn(
      `asset-bundles: conversion failed (${
        result.errors.join('; ') || `code ${result.code}`
      }); previewing with raw GLTFs`
    )
    return undefined
  }

  // Per-asset failures are not run failures: the explorer falls back to the
  // raw GLTF for those assets alone.
  const manifest = result.manifest ?? '{}'
  if (!/"exitCode"\s*:\s*0/.test(manifest)) {
    components.logger.warn(
      'asset-bundles: some assets failed to convert; they will load as raw GLTFs (see the scene manifest)'
    )
  }

  const scene: ConvertedScene = {
    entityId: job.entityId,
    platform: job.platform,
    manifest,
    bundles: new Map(result.bundles.map((b) => [b.name, b.data]))
  }
  await writeCache(components, job, scene)
  components.logger.log(`asset-bundles: scene converted (${scene.bundles.size} bundles, ${elapsed}s)`)
  return scene
}

/** Content-path → bytes, exactly the set the preview content server publishes. */
async function readProjectFiles(
  components: Pick<CliComponents, 'fs'>,
  projectRoot: string
): Promise<Array<{ name: string; data: Buffer }>> {
  const relatives = await getPublishableFiles(components, projectRoot)
  const files: Array<{ name: string; data: Buffer }> = []
  for (const relative of relatives) {
    const absolute = path.resolve(projectRoot, relative)
    files.push({
      name: normalizeDecentralandFilename(projectRoot, absolute),
      data: await components.fs.readFile(absolute)
    })
  }
  return files
}

/** sha256 over every publishable file's name and bytes, in a stable order. */
function digestOf(files: Array<{ name: string; data: Buffer }>): string {
  const h = crypto.createHash('sha256')
  for (const { name, data } of [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    h.update(name)
    h.update('\0')
    h.update(data)
    h.update('\0')
  }
  return h.digest('hex').slice(0, 32)
}

function cacheDir(job: { cacheRoot: string; platform: string; contentKey: string }): string {
  return path.join(job.cacheRoot, `${job.contentKey}_${job.platform}`)
}

async function readCache(
  components: Pick<CliComponents, 'fs'>,
  job: { cacheRoot: string; entityId: string; platform: string; contentKey: string }
): Promise<ConvertedScene | undefined> {
  const dir = cacheDir(job)
  const manifestPath = path.join(dir, 'manifest.json')
  if (!(await components.fs.fileExists(manifestPath))) return undefined
  try {
    const manifest = await components.fs.readFile(manifestPath, 'utf8')
    const bundles = new Map<string, Buffer>()
    for (const name of await components.fs.readdir(path.join(dir, 'bundles'))) {
      bundles.set(name, await components.fs.readFile(path.join(dir, 'bundles', name)))
    }
    return { entityId: job.entityId, platform: job.platform, manifest, bundles }
  } catch {
    // A half-written cache is not worth salvaging; reconvert.
    return undefined
  }
}

/**
 * Publishes the conversion as one indivisible step.
 *
 * Written into a private staging directory and moved into place with a single
 * rename, which is atomic on every filesystem this runs on. A reader therefore
 * sees the entry complete or not at all, and two previews converting the same
 * content race harmlessly: the loser's bytes are identical to the winner's, so
 * it discards them rather than merging into a directory someone else owns.
 */
async function writeCache(
  components: Pick<CliComponents, 'fs'>,
  job: { cacheRoot: string; entityId: string; platform: string; contentKey: string },
  scene: ConvertedScene
): Promise<void> {
  const dir = cacheDir(job)
  const staging = `${dir}.tmp-${crypto.randomBytes(6).toString('hex')}`
  await components.fs.mkdir(path.join(staging, 'bundles'), { recursive: true })
  for (const [name, data] of scene.bundles) {
    await components.fs.writeFile(path.join(staging, 'bundles', name), data)
  }
  await components.fs.writeFile(path.join(staging, 'manifest.json'), scene.manifest)

  try {
    await components.fs.rename(staging, dir)
  } catch {
    await components.fs.rm(staging, { recursive: true, force: true })
  }
}

/**
 * Clears staging directories a killed conversion left behind.
 *
 * Age-gated because a young one is not litter — it belongs to a preview that is
 * converting right now, and removing it would delete that conversion's output
 * from under it.
 */
async function sweepStaging(components: Pick<CliComponents, 'fs'>, cacheRoot: string): Promise<void> {
  let entries: string[]
  try {
    entries = await components.fs.readdir(cacheRoot)
  } catch {
    return // no cache yet, nothing to sweep
  }
  for (const entry of entries) {
    if (!/\.tmp-[0-9a-f]+$/.test(entry)) continue
    const full = path.join(cacheRoot, entry)
    try {
      if (Date.now() - (await components.fs.stat(full)).mtimeMs < STALE_LOCK_MS) continue
      await components.fs.rm(full, { recursive: true, force: true })
    } catch {
      // Being removed by whoever owns it, or not ours to remove.
    }
  }
}

/** The slice of @dcl/abgen-node this command uses. */
type AbgenModule = {
  convert(options: { files: Array<{ name: string; data: Buffer }>; platform?: string; entityHash?: string }): Promise<{
    code: number
    bundles: Array<{ name: string; data: Buffer }>
    events: string[]
    errors: string[]
    manifest?: string
  }>
}
