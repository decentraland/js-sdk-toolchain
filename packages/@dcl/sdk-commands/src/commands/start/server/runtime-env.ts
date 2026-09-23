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

/** A bucket read from disk, or an empty one when the file holds something else there. */
function bucket<T>(value: unknown): Record<string, T> {
  return isPlainObject(value) ? (value as Record<string, T>) : {}
}

/**
 * Own-property access for the JSON-backed buckets. Plain indexing would resolve a
 * key such as `constructor`, `toString` or `__proto__` through Object.prototype,
 * and assigning `__proto__` would swap the bucket's prototype instead of storing.
 */
const hasOwn = (record: object, key: string): boolean => Object.prototype.hasOwnProperty.call(record, key)

function getOwn<T>(record: Record<string, T>, key: string): T | undefined {
  return hasOwn(record, key) ? record[key] : undefined
}

function setOwn<T>(record: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(record, key, { value, enumerable: true, configurable: true, writable: true })
}

/**
 * Older previews keyed a player's bucket by the address as the scene sent it, often
 * checksummed, while reads and writes use the lowercase form. Buckets are merged under
 * it here; on a key both hold, the lowercase bucket wins, since it is the one current
 * previews have been writing. The next save persists the merged form.
 */
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

let writeQueue: Promise<unknown> = Promise.resolve()

/**
 * Serializes read-modify-write cycles against server-storage.json. The entire
 * load→mutate→save must run under one lock: two handlers that each load the same
 * snapshot would otherwise lose one update, and two concurrent saves would interleave
 * their writes into a corrupt file.
 */
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task)
  writeQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
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

/**
 * Loads all server-side storage data from server-storage.json.
 */
export async function loadServerStorage(components: Pick<CliComponents, 'fs' | 'logger'>): Promise<ServerStorage> {
  const storagePath = path.join(RUNTIME_DATA_DIR, SERVER_STORAGE_FILE)

  // Only a confirmed missing file is an empty store. Any other failure propagates, so the
  // route answers 500 and no write can overwrite a store that could not be read.
  if (!(await components.fs.fileExists(storagePath))) {
    return createDefaultStorage()
  }

  const content = await components.fs.readFile(storagePath, 'utf-8')
  let parsed: Partial<ServerStorage>
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    // Starting over would let the next write erase the file; keep it for recovery.
    const asidePath = `${storagePath}.corrupt-${Date.now()}`
    components.logger.error(`${SERVER_STORAGE_FILE} is not valid JSON (${error}); moving it to ${asidePath}`)
    await components.fs.rename(storagePath, asidePath)
    return createDefaultStorage()
  }

  return {
    env: bucket<string>(parsed.env),
    world: bucket<unknown>(parsed.world),
    players: mergePlayerBuckets(bucket<unknown>(parsed.players))
  }
}

/**
 * Saves all server-side storage data to server-storage.json.
 */
export async function saveServerStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  data: ServerStorage
): Promise<void> {
  await ensureRuntimeDir(components)
  const storagePath = path.join(RUNTIME_DATA_DIR, SERVER_STORAGE_FILE)

  try {
    const tmpPath = `${storagePath}.tmp`
    await components.fs.writeFile(tmpPath, JSON.stringify(data, null, 2))
    await components.fs.rename(tmpPath, storagePath)
  } catch (error) {
    components.logger.error(`Failed to save ${SERVER_STORAGE_FILE}: ${error}`)
    throw error
  }
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

  try {
    const exists = await components.fs.fileExists(envPath)
    if (!exists) {
      return envMap
    }

    const content = await components.fs.readFile(envPath, 'utf-8')
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const equalIndex = trimmed.indexOf('=')
      if (equalIndex > 0) {
        const key = trimmed.slice(0, equalIndex).trim()
        let value = trimmed.slice(equalIndex + 1).trim()

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }

        envMap.set(key, value)
      }
    }
  } catch (error) {
    components.logger.error(`Failed to load .env file: ${error}`)
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
  return serialize(async () => {
    const storage = await loadServerStorage(components)
    setOwn(storage.env, key, value)
    await saveServerStorage(components, storage)
  })
}

/**
 * Deletes a runtime environment variable.
 * Returns true if key existed and was deleted, false otherwise.
 */
export async function deleteEnvValue(components: Pick<CliComponents, 'fs' | 'logger'>, key: string): Promise<boolean> {
  return serialize(async () => {
    const storage = await loadServerStorage(components)
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
  return serialize(async () => {
    const storage = await loadServerStorage(components)
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
  return serialize(async () => {
    const storage = await loadServerStorage(components)
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
  return serialize(async () => {
    const storage = await loadServerStorage(components)
    const lowercased = address.toLowerCase()
    let values = getOwn(storage.players, lowercased)
    if (!values) {
      values = {}
      setOwn(storage.players, lowercased, values)
    }
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
  return serialize(async () => {
    const storage = await loadServerStorage(components)
    const values = getOwn(storage.players, address.toLowerCase())
    if (!values || !hasOwn(values, key)) {
      return false
    }
    delete values[key]
    await saveServerStorage(components, storage)
    return true
  })
}
