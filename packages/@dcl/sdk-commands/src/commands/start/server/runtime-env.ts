import path from 'path'
import { CliComponents } from '../../../components'
import { getObject } from '../../../logic/coordinates'

const RUNTIME_DATA_DIRNAME = '.runtime-data'
const SERVER_STORAGE_FILE = 'server-storage.json'

const storageDirFor = (baseDir: string): string => path.join(baseDir, RUNTIME_DATA_DIRNAME)
const storagePathFor = (baseDir: string): string => path.join(storageDirFor(baseDir), SERVER_STORAGE_FILE)

/**
 * Structure for all server-side storage data.
 * Stored in the project's `.runtime-data/` directory so local dev progress survives
 * SDK version upgrades (which replace `node_modules`).
 *
 * `world` is namespaced by scene base coordinates (`"x,y"`) so that previewing
 * different scenes does not share the same scene-storage bucket.
 */
export interface ServerStorage {
  env: Record<string, string>
  world: Record<string, Record<string, unknown>>
  players: Record<string, Record<string, unknown>>
}

/**
 * Normalizes a scene base parcel (e.g. `"60, -9"`) into the canonical `"x,y"`
 * key used to namespace world storage, so equivalent spellings map to one bucket.
 */
export function getSceneStorageKey(base: string): string {
  const { x, y } = getObject(base)
  return `${x},${y}`
}

const isPlainObject = (value: unknown): boolean => typeof value === 'object' && value !== null && !Array.isArray(value)

const createDefaultStorage = (): ServerStorage => ({
  env: {},
  world: {},
  players: {}
})

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
async function ensureRuntimeDir(components: Pick<CliComponents, 'fs' | 'logger'>, baseDir: string): Promise<void> {
  const dir = storageDirFor(baseDir)
  try {
    const exists = await components.fs.directoryExists(dir)
    if (!exists) {
      await components.fs.mkdir(dir, { recursive: true })
    }
  } catch (error) {
    components.logger.error(`Failed to create runtime data directory: ${error}`)
  }
}

/**
 * Loads all server-side storage data from server-storage.json.
 */
export async function loadServerStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string
): Promise<ServerStorage> {
  const storagePath = storagePathFor(baseDir)

  try {
    const exists = await components.fs.fileExists(storagePath)
    if (!exists) {
      return createDefaultStorage()
    }

    const content = await components.fs.readFile(storagePath, 'utf-8')
    const parsed = JSON.parse(content) as Partial<ServerStorage>

    return {
      env: parsed.env ?? {},
      world: parsed.world ?? {},
      players: parsed.players ?? {}
    }
  } catch (error) {
    components.logger.error(`Failed to load ${SERVER_STORAGE_FILE}: ${error}`)
    return createDefaultStorage()
  }
}

/**
 * Saves all server-side storage data to server-storage.json.
 */
export async function saveServerStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  data: ServerStorage
): Promise<void> {
  await ensureRuntimeDir(components, baseDir)
  const storagePath = storagePathFor(baseDir)

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
 * Migrates a legacy flat-format world file (`world: key -> value`, written before
 * scene-coordinate namespacing) into the currently-previewed scene's bucket, so no
 * local dev data is lost on the format change. No-op once the file is already
 * namespaced (`world: "x,y" -> key -> value`).
 */
export async function migrateLegacyWorldStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  sceneKey: string
): Promise<void> {
  return serialize(async () => {
    const storage = await loadServerStorage(components, baseDir)
    const world = storage.world ?? {}
    const isLegacyFlat = Object.values(world).some((value) => !isPlainObject(value))
    if (!isLegacyFlat) {
      return
    }
    components.logger.debug(`Migrating legacy flat world storage into scene bucket ${sceneKey}`)
    storage.world = { [sceneKey]: world }
    await saveServerStorage(components, baseDir, storage)
  })
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
  } catch (error) {
    components.logger.error(`Failed to load .env file: ${error}`)
  }

  return envMap
}

/**
 * Gets runtime environment variables.
 */
export async function getEnvStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string
): Promise<Record<string, string>> {
  const storage = await loadServerStorage(components, baseDir)
  return storage.env
}

/**
 * Gets merged environment variables.
 * Runtime values (from server-storage.json) override .env values.
 * The storage file and the `.env` file share the project directory.
 */
export async function getMergedEnv(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectDirectory: string
): Promise<Map<string, string>> {
  const envFile = await loadEnvFile(components, projectDirectory)
  const runtimeEnv = await getEnvStorage(components, projectDirectory)

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
  baseDir: string,
  key: string,
  value: string
): Promise<void> {
  return serialize(async () => {
    const storage = await loadServerStorage(components, baseDir)
    storage.env[key] = value
    await saveServerStorage(components, baseDir, storage)
  })
}

/**
 * Deletes a runtime environment variable.
 * Returns true if key existed and was deleted, false otherwise.
 */
export async function deleteEnvValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  key: string
): Promise<boolean> {
  return serialize(async () => {
    const storage = await loadServerStorage(components, baseDir)
    if (!(key in storage.env)) {
      return false
    }
    delete storage.env[key]
    await saveServerStorage(components, baseDir, storage)
    return true
  })
}

/**
 * Gets all world storage data for a scene, keyed by its base-coordinate bucket.
 */
export async function getWorldStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  sceneKey: string
): Promise<Record<string, unknown>> {
  const storage = await loadServerStorage(components, baseDir)
  return storage.world[sceneKey] ?? {}
}

/**
 * Gets a value from a scene's world storage.
 */
export async function getWorldValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  sceneKey: string,
  key: string
): Promise<unknown | undefined> {
  const storage = await loadServerStorage(components, baseDir)
  return storage.world[sceneKey]?.[key]
}

/**
 * Sets a value in a scene's world storage.
 */
export async function setWorldValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  sceneKey: string,
  key: string,
  value: unknown
): Promise<void> {
  return serialize(async () => {
    const storage = await loadServerStorage(components, baseDir)
    if (!storage.world[sceneKey]) {
      storage.world[sceneKey] = {}
    }
    storage.world[sceneKey][key] = value
    await saveServerStorage(components, baseDir, storage)
  })
}

/**
 * Deletes a value from a scene's world storage.
 * Returns true if key existed and was deleted, false otherwise.
 */
export async function deleteWorldValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  sceneKey: string,
  key: string
): Promise<boolean> {
  return serialize(async () => {
    const storage = await loadServerStorage(components, baseDir)
    if (!storage.world[sceneKey] || !(key in storage.world[sceneKey])) {
      return false
    }
    delete storage.world[sceneKey][key]
    await saveServerStorage(components, baseDir, storage)
    return true
  })
}

/**
 * Gets a value from a player's storage.
 */
export async function getPlayerValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  address: string,
  key: string
): Promise<unknown | undefined> {
  const storage = await loadServerStorage(components, baseDir)
  return storage.players[address]?.[key]
}

/**
 * Sets a value in a player's storage.
 */
export async function setPlayerValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  address: string,
  key: string,
  value: unknown
): Promise<void> {
  return serialize(async () => {
    const storage = await loadServerStorage(components, baseDir)
    if (!storage.players[address]) {
      storage.players[address] = {}
    }
    storage.players[address][key] = value
    await saveServerStorage(components, baseDir, storage)
  })
}

/**
 * Deletes a value from a player's storage.
 * Returns true if key existed and was deleted, false otherwise.
 */
export async function deletePlayerValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  baseDir: string,
  address: string,
  key: string
): Promise<boolean> {
  return serialize(async () => {
    const storage = await loadServerStorage(components, baseDir)
    if (!storage.players[address] || !(key in storage.players[address])) {
      return false
    }
    delete storage.players[address][key]
    await saveServerStorage(components, baseDir, storage)
    return true
  })
}
