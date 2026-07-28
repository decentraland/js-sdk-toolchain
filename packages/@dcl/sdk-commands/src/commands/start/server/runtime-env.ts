import path from 'path'
import { CliComponents } from '../../../components'
import { getObject } from '../../../logic/coordinates'

// Find the sdk-commands package root by resolving its package.json
const SDK_COMMANDS_ROOT = path.dirname(require.resolve('@dcl/sdk-commands/package.json'))
const RUNTIME_DATA_DIR = path.join(SDK_COMMANDS_ROOT, '.runtime-data')
const SERVER_STORAGE_FILE = 'server-storage.json'

/**
 * Structure for all server-side storage data.
 * Stored in sdk-commands package directory (hidden from users).
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

// Factory (not a shared const): each call returns fresh nested objects so callers
// can never mutate a shared default and leak state into later loads.
const createDefaultStorage = (): ServerStorage => ({
  env: {},
  world: {},
  players: {}
})

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

  try {
    const exists = await components.fs.fileExists(storagePath)
    if (!exists) {
      return createDefaultStorage()
    }

    const content = await components.fs.readFile(storagePath, 'utf-8')
    const parsed = JSON.parse(content) as Partial<ServerStorage>

    // `world` is now namespaced by scene coordinates (`"x,y"` -> key -> value).
    // A file with any non-object top-level `world` entry predates that change
    // (flat `key -> value`); its data has no scene to attribute to, so discard it.
    // Local preview storage is disposable, so resetting is preferable to migrating.
    const rawWorld = parsed.world ?? {}
    const isLegacyWorld = Object.values(rawWorld).some((value) => !isPlainObject(value))
    if (isLegacyWorld) {
      components.logger.debug('Resetting legacy local preview world storage (pre scene-coordinate namespacing)')
    }

    // Merge with defaults to ensure all keys exist
    return {
      env: parsed.env ?? {},
      world: isLegacyWorld ? {} : rawWorld,
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
  data: ServerStorage
): Promise<void> {
  await ensureRuntimeDir(components)
  const storagePath = path.join(RUNTIME_DATA_DIR, SERVER_STORAGE_FILE)

  try {
    await components.fs.writeFile(storagePath, JSON.stringify(data, null, 2))
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
  const storage = await loadServerStorage(components)
  storage.env[key] = value
  await saveServerStorage(components, storage)
}

/**
 * Deletes a runtime environment variable.
 * Returns true if key existed and was deleted, false otherwise.
 */
export async function deleteEnvValue(components: Pick<CliComponents, 'fs' | 'logger'>, key: string): Promise<boolean> {
  const storage = await loadServerStorage(components)
  if (!(key in storage.env)) {
    return false
  }
  delete storage.env[key]
  await saveServerStorage(components, storage)
  return true
}

/**
 * Gets all world storage data for a scene, keyed by its base-coordinate bucket.
 */
export async function getWorldStorage(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  sceneKey: string
): Promise<Record<string, unknown>> {
  const storage = await loadServerStorage(components)
  return storage.world[sceneKey] ?? {}
}

/**
 * Gets a value from a scene's world storage.
 */
export async function getWorldValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  sceneKey: string,
  key: string
): Promise<unknown | undefined> {
  const storage = await loadServerStorage(components)
  return storage.world[sceneKey]?.[key]
}

/**
 * Sets a value in a scene's world storage.
 */
export async function setWorldValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  sceneKey: string,
  key: string,
  value: unknown
): Promise<void> {
  const storage = await loadServerStorage(components)
  if (!storage.world[sceneKey]) {
    storage.world[sceneKey] = {}
  }
  storage.world[sceneKey][key] = value
  await saveServerStorage(components, storage)
}

/**
 * Deletes a value from a scene's world storage.
 * Returns true if key existed and was deleted, false otherwise.
 */
export async function deleteWorldValue(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  sceneKey: string,
  key: string
): Promise<boolean> {
  const storage = await loadServerStorage(components)
  if (!storage.world[sceneKey] || !(key in storage.world[sceneKey])) {
    return false
  }
  delete storage.world[sceneKey][key]
  await saveServerStorage(components, storage)
  return true
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
  return storage.players[address]?.[key]
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
  const storage = await loadServerStorage(components)
  if (!storage.players[address]) {
    storage.players[address] = {}
  }
  storage.players[address][key] = value
  await saveServerStorage(components, storage)
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
  const storage = await loadServerStorage(components)
  if (!storage.players[address] || !(key in storage.players[address])) {
    return false
  }
  delete storage.players[address][key]
  await saveServerStorage(components, storage)
  return true
}
