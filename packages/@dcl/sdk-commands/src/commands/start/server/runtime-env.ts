import path from 'path'
import { CliComponents } from '../../../components'

// Find the sdk-commands package root by resolving its package.json
const SDK_COMMANDS_ROOT = path.dirname(require.resolve('@dcl/sdk-commands/package.json'))
const RUNTIME_ENV_DIR = path.join(SDK_COMMANDS_ROOT, '.runtime-data')
const RUNTIME_ENV_FILE = 'server-env.json'

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
 * Ensures the runtime data directory exists.
 */
async function ensureRuntimeDir(components: Pick<CliComponents, 'fs' | 'logger'>): Promise<void> {
  try {
    const exists = await components.fs.directoryExists(RUNTIME_ENV_DIR)
    if (!exists) {
      await components.fs.mkdir(RUNTIME_ENV_DIR, { recursive: true })
    }
  } catch (error) {
    components.logger.error(`Failed to create runtime data directory: ${error}`)
  }
}

/**
 * Loads runtime environment variables from server-env.json.
 * These are values set via PUT /env/:key endpoints.
 * Stored in sdk-commands package directory (hidden from users).
 */
export async function loadRuntimeEnv(
  components: Pick<CliComponents, 'fs' | 'logger'>
): Promise<Record<string, string>> {
  const runtimePath = path.join(RUNTIME_ENV_DIR, RUNTIME_ENV_FILE)

  try {
    const exists = await components.fs.fileExists(runtimePath)
    if (!exists) {
      return {}
    }

    const content = await components.fs.readFile(runtimePath, 'utf-8')
    return JSON.parse(content) as Record<string, string>
  } catch (error) {
    components.logger.error(`Failed to load ${RUNTIME_ENV_FILE}: ${error}`)
    return {}
  }
}

/**
 * Saves runtime environment variables to server-env.json.
 * Stored in sdk-commands package directory (hidden from users).
 */
export async function saveRuntimeEnv(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  data: Record<string, string>
): Promise<void> {
  await ensureRuntimeDir(components)
  const runtimePath = path.join(RUNTIME_ENV_DIR, RUNTIME_ENV_FILE)

  try {
    await components.fs.writeFile(runtimePath, JSON.stringify(data, null, 2))
  } catch (error) {
    components.logger.error(`Failed to save ${RUNTIME_ENV_FILE}: ${error}`)
    throw error
  }
}

/**
 * Gets merged environment variables.
 * Runtime values (server-env.json) override .env values.
 */
export async function getMergedEnv(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectDirectory: string
): Promise<Map<string, string>> {
  const envFile = await loadEnvFile(components, projectDirectory)
  const runtimeEnv = await loadRuntimeEnv(components)

  // Runtime overrides .env
  for (const [key, value] of Object.entries(runtimeEnv)) {
    envFile.set(key, value)
  }

  return envFile
}
