import path from 'path'
import { CliComponents } from '../../../components'

// Find the sdk-commands package root by resolving its package.json
const SDK_COMMANDS_ROOT = path.dirname(require.resolve('@dcl/sdk-commands/package.json'))
const RUNTIME_DATA_DIR = path.join(SDK_COMMANDS_ROOT, '.runtime-data')
const SERVER_STORAGE_FILE = 'server-storage.json'

/**
 * Structure for all server-side storage data.
 * Stored in sdk-commands package directory (hidden from users).
 */
export interface ServerStorage {
  env: Record<string, string>
  world: Record<string, unknown>
  players: Record<string, Record<string, unknown>>
}

function createDefaultStorage(): ServerStorage {
  return {
    env: {},
    world: {},
    players: {}
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function bucket<T>(value: unknown): Record<string, T> {
  return isPlainObject(value) ? (value as Record<string, T>) : {}
}

// Plain indexing would resolve `constructor` or `__proto__` through Object.prototype.
const hasOwn = (record: object, key: string): boolean => Object.prototype.hasOwnProperty.call(record, key)

function getOwn<T>(record: Record<string, T>, key: string): T | undefined {
  return hasOwn(record, key) ? record[key] : undefined
}

function setOwn<T>(record: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(record, key, { value, enumerable: true, configurable: true, writable: true })
}

/** Older previews stored checksummed addresses; the lowercase bucket wins a conflicting key. */
function mergePlayerBuckets(players: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const merged: Record<string, Record<string, unknown>> = {}
  const addresses = Object.keys(players)
  const lowercaseFirst = [
    ...addresses.filter((address) => address === address.toLowerCase()),
    ...addresses.filter((address) => address !== address.toLowerCase())
  ]
  for (const address of lowercaseFirst) {
    const target = address.toLowerCase()
    let values = getOwn(merged, target)
    if (!values) {
      values = {}
      setOwn(merged, target, values)
    }
    for (const [key, value] of Object.entries(bucket<unknown>(getOwn(players, address)))) {
      if (!hasOwn(values, key)) setOwn(values, key, value)
    }
  }
  return merged
}

export interface StorageLimits {
  maxValueSizeBytes: number
  maxTotalSizeBytes: number
}

/** The deployed service's defaults, in bytes; totals are per world, or per player. */
export const STORAGE_LIMITS: Record<'env' | 'world' | 'player', StorageLimits> = {
  env: { maxValueSizeBytes: 10240, maxTotalSizeBytes: 262144 },
  world: { maxValueSizeBytes: 524288, maxTotalSizeBytes: 10485760 },
  player: { maxValueSizeBytes: 102400, maxTotalSizeBytes: 1048576 }
}

export class StorageLimitExceededError extends Error {}

/** Env values are stored raw, not as JSON. */
const byteSize = (value: unknown) => Buffer.byteLength(String(value), 'utf-8')

function assertWithinLimits(
  values: Record<string, unknown>,
  key: string,
  value: unknown,
  limits: StorageLimits,
  measure: (value: unknown) => number
): void {
  const size = measure(value)
  if (size > limits.maxValueSizeBytes) {
    throw new StorageLimitExceededError(
      `Value size (${size} bytes) exceeds the maximum allowed size (${limits.maxValueSizeBytes} bytes)`
    )
  }
  const total = Object.values(values).reduce<number>((sum, stored) => sum + measure(stored), 0)
  const existing = hasOwn(values, key) ? measure(values[key]) : 0
  if (total - existing + size > limits.maxTotalSizeBytes) {
    throw new StorageLimitExceededError(
      `Total storage size would exceed the maximum allowed (${limits.maxTotalSizeBytes} bytes)`
    )
  }
}

const jsonSize = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf-8')

let storeLock: Promise<unknown> = Promise.resolve()

const LOCK_TIMEOUT_MS = 30_000
const LOCK_RETRY_MS = 20
/** A lock file whose owner cannot be read is taken over only once it is this old. */
const UNREADABLE_LOCK_MS = 30_000
/** A dead owner's lock is only taken over once it is this old, so one that just changed hands is left alone. */
const MIN_TAKEOVER_AGE_MS = 2_000

/** The token of the lock file this process holds, checked before every commit. */
let heldLockToken: string | undefined

/** The lock was taken from this process while it held it; nothing was written. */
export class StoreLockLostError extends Error {}

const randomToken = () => Math.random().toString(36).slice(2, 10)

/** EPERM means the process exists but belongs to another user. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === 'EPERM'
  }
}

async function readLock(components: Pick<CliComponents, 'fs'>, lockPath: string): Promise<string | undefined> {
  try {
    return await components.fs.readFile(lockPath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return undefined
    throw error
  }
}

/** The store is shared by every preview process using this sdk-commands installation. */
function withStoreLock<T>(components: Pick<CliComponents, 'fs' | 'logger'>, task: () => Promise<T>): Promise<T> {
  const locked = () => withLockFile(components, task)
  const run = storeLock.then(locked, locked)
  storeLock = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

/** The lock holds `<pid>:<token>`: only its creator releases it, and only a dead owner's is taken over. */
async function withLockFile<T>(components: Pick<CliComponents, 'fs' | 'logger'>, task: () => Promise<T>): Promise<T> {
  await ensureRuntimeDir(components)
  const lockPath = `${storagePath()}.lock`
  const token = `${process.pid}:${randomToken()}`
  const deadline = Date.now() + LOCK_TIMEOUT_MS
  for (;;) {
    try {
      await components.fs.writeFile(lockPath, token, { flag: 'wx' })
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error
    }
    const holder = await readLock(components, lockPath)
    if (holder === undefined) continue
    if (await isAbandoned(components, lockPath, holder)) {
      components.logger.warn(`Taking over a ${SERVER_STORAGE_FILE} lock held by a process that is no longer running`)
      await takeOver(components, lockPath, holder)
      continue
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for the ${SERVER_STORAGE_FILE} lock`)
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS))
  }
  heldLockToken = token
  try {
    return await task()
  } finally {
    heldLockToken = undefined
    if ((await readLock(components, lockPath).catch(() => undefined)) === token) {
      await components.fs.unlink(lockPath).catch(() => undefined)
    }
  }
}

async function isAbandoned(components: Pick<CliComponents, 'fs'>, lockPath: string, holder: string): Promise<boolean> {
  let age: number
  try {
    age = Date.now() - (await components.fs.stat(lockPath)).mtimeMs
  } catch {
    return false
  }
  const pid = Number(holder.split(':')[0])
  if (Number.isInteger(pid) && pid > 0) return age > MIN_TAKEOVER_AGE_MS && !isAlive(pid)
  return age > UNREADABLE_LOCK_MS
}

/** Moving the lock aside is atomic; if a newer owner's lock moved instead, it goes back. */
async function takeOver(components: Pick<CliComponents, 'fs'>, lockPath: string, observed: string): Promise<void> {
  const aside = `${lockPath}.${randomToken()}.stale`
  try {
    await components.fs.rename(lockPath, aside)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return
    throw error
  }
  const moved = await readLock(components, aside)
  if (moved !== undefined && moved !== observed) {
    await components.fs.writeFile(lockPath, moved, { flag: 'wx' }).catch(() => undefined)
  }
  await components.fs.unlink(aside).catch(() => undefined)
}

/**
 * Ensures the runtime data directory exists.
 */
async function ensureRuntimeDir(components: Pick<CliComponents, 'fs' | 'logger'>): Promise<void> {
  try {
    const exists = await components.fs.directoryExists(RUNTIME_DATA_DIR)
    if (!exists) {
      await components.fs.mkdir(RUNTIME_DATA_DIR, { recursive: true })
    }
  } catch (error) {
    components.logger.error(`Failed to create runtime data directory: ${error}`)
  }
}

const storagePath = () => path.join(RUNTIME_DATA_DIR, SERVER_STORAGE_FILE)

/** The store as read, or `null` when the file exists but does not hold a JSON object. */
async function readStore(components: Pick<CliComponents, 'fs'>): Promise<ServerStorage | null> {
  if (!(await components.fs.fileExists(storagePath()))) return createDefaultStorage()

  let parsed: unknown
  try {
    parsed = JSON.parse(await components.fs.readFile(storagePath(), 'utf-8'))
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return null
  }
  if (!isPlainObject(parsed)) return null

  return {
    env: bucket<string>(parsed.env),
    world: bucket<unknown>(parsed.world),
    players: mergePlayerBuckets(bucket<unknown>(parsed.players))
  }
}

/** The caller holds the store lock. A corrupt file is kept aside for recovery. */
async function loadStoreLocked(components: Pick<CliComponents, 'fs' | 'logger'>): Promise<ServerStorage> {
  const storage = await readStore(components)
  if (storage) return storage

  const asidePath = `${storagePath()}.corrupt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  components.logger.error(`${SERVER_STORAGE_FILE} does not hold a JSON object; moving it to ${asidePath}`)
  try {
    await components.fs.rename(storagePath(), asidePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
  }
  return createDefaultStorage()
}

/** Only a missing file is an empty store; any other read failure throws. */
export async function loadServerStorage(components: Pick<CliComponents, 'fs' | 'logger'>): Promise<ServerStorage> {
  return (await readStore(components)) ?? withStoreLock(components, () => loadStoreLocked(components))
}

/**
 * Saves all server-side storage data to server-storage.json.
 */
export async function saveServerStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  data: ServerStorage
): Promise<void> {
  await ensureRuntimeDir(components)
  const tmpPath = `${storagePath()}.${process.pid}.${randomToken()}.tmp`
  await components.fs.writeFile(tmpPath, JSON.stringify(data, null, 2))
  // Fencing: a lock displaced by a concurrent takeover must not commit. Only the instant between
  // this check and the rename is left unguarded, since the filesystem has no compare-and-rename.
  if (heldLockToken !== undefined && (await readLock(components, `${storagePath()}.lock`)) !== heldLockToken) {
    await components.fs.unlink(tmpPath).catch(() => undefined)
    throw new StoreLockLostError(`The ${SERVER_STORAGE_FILE} lock was taken over during the write; nothing was saved`)
  }
  await components.fs.rename(tmpPath, storagePath())
}

/**
 * Loads environment variables from a .env file in the project directory.
 * Returns a Map of key-value pairs.
 */
export async function loadEnvFile(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectDirectory: string
): Promise<Map<string, string>> {
  const envMap = new Map<string, string>()
  const envPath = path.join(projectDirectory, '.env')

  if (!(await components.fs.fileExists(envPath))) {
    return envMap
  }

  const content = await components.fs.readFile(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const equalIndex = trimmed.indexOf('=')
    if (equalIndex > 0) {
      const key = trimmed.slice(0, equalIndex).trim()
      let value = trimmed.slice(equalIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      envMap.set(key, value)
    }
  }

  return envMap
}

/**
 * Gets runtime environment variables.
 */
export async function getEnvStorage(components: Pick<CliComponents, 'fs' | 'logger'>): Promise<Record<string, string>> {
  const storage = await loadServerStorage(components)
  return storage.env
}

/**
 * Gets merged environment variables.
 * Runtime values (from server-storage.json) override .env values.
 */
export async function getMergedEnv(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectDirectory: string
): Promise<Map<string, string>> {
  const envFile = await loadEnvFile(components, projectDirectory)
  const runtimeEnv = await getEnvStorage(components)

  // Runtime overrides .env
  for (const [key, value] of Object.entries(runtimeEnv)) {
    envFile.set(key, value)
  }

  return envFile
}

/**
 * Sets a runtime environment variable.
 */
export async function setEnvValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  key: string,
  value: string
): Promise<void> {
  return withStoreLock(components, async () => {
    const storage = await loadStoreLocked(components)
    assertWithinLimits(storage.env, key, value, STORAGE_LIMITS.env, byteSize)
    setOwn(storage.env, key, value)
    await saveServerStorage(components, storage)
  })
}

/**
 * Deletes a runtime environment variable.
 * Returns true if key existed and was deleted, false otherwise.
 */
export async function deleteEnvValue(components: Pick<CliComponents, 'fs' | 'logger'>, key: string): Promise<boolean> {
  return withStoreLock(components, async () => {
    const storage = await loadStoreLocked(components)
    if (!hasOwn(storage.env, key)) {
      return false
    }
    delete storage.env[key]
    await saveServerStorage(components, storage)
    return true
  })
}

/**
 * Gets all world storage data.
 */
export async function getWorldStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>
): Promise<Record<string, unknown>> {
  const storage = await loadServerStorage(components)
  return storage.world
}

/**
 * Gets a value from world storage.
 */
export async function getWorldValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  key: string
): Promise<unknown | undefined> {
  const storage = await loadServerStorage(components)
  return getOwn(storage.world, key)
}

/**
 * Gets all storage data for a player, empty when the player has none.
 */
export async function getPlayerStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  address: string
): Promise<Record<string, unknown>> {
  const storage = await loadServerStorage(components)
  return getOwn(storage.players, address.toLowerCase()) ?? {}
}

/**
 * Sets a value in world storage.
 */
export async function setWorldValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  key: string,
  value: unknown
): Promise<void> {
  return withStoreLock(components, async () => {
    const storage = await loadStoreLocked(components)
    assertWithinLimits(storage.world, key, value, STORAGE_LIMITS.world, jsonSize)
    setOwn(storage.world, key, value)
    await saveServerStorage(components, storage)
  })
}

/**
 * Deletes a value from world storage.
 * Returns true if key existed and was deleted, false otherwise.
 */
export async function deleteWorldValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  key: string
): Promise<boolean> {
  return withStoreLock(components, async () => {
    const storage = await loadStoreLocked(components)
    if (!hasOwn(storage.world, key)) {
      return false
    }
    delete storage.world[key]
    await saveServerStorage(components, storage)
    return true
  })
}

/**
 * Gets a value from a player's storage.
 */
export async function getPlayerValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  address: string,
  key: string
): Promise<unknown | undefined> {
  const storage = await loadServerStorage(components)
  const values = getOwn(storage.players, address.toLowerCase())
  return values ? getOwn(values, key) : undefined
}

/**
 * Sets a value in a player's storage.
 */
export async function setPlayerValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  address: string,
  key: string,
  value: unknown
): Promise<void> {
  return withStoreLock(components, async () => {
    const storage = await loadStoreLocked(components)
    const lowercased = address.toLowerCase()
    let values = getOwn(storage.players, lowercased)
    if (!values) {
      values = {}
      setOwn(storage.players, lowercased, values)
    }
    assertWithinLimits(values, key, value, STORAGE_LIMITS.player, jsonSize)
    setOwn(values, key, value)
    await saveServerStorage(components, storage)
  })
}

/**
 * Deletes a value from a player's storage.
 * Returns true if key existed and was deleted, false otherwise.
 */
export async function deletePlayerValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  address: string,
  key: string
): Promise<boolean> {
  return withStoreLock(components, async () => {
    const storage = await loadStoreLocked(components)
    const values = getOwn(storage.players, address.toLowerCase())
    if (!values || !hasOwn(values, key)) {
      return false
    }
    delete values[key]
    await saveServerStorage(components, storage)
    return true
  })
}
