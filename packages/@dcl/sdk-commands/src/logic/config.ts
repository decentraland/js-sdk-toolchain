import { readFile, readJSON, writeJSON } from 'fs-extra'
import path from 'path'

interface DCLInfo {
  segmentKey?: string
  userId?: string
  trackStats?: boolean
}
export const getDclInfoPath = () =>
  path.resolve(process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] ?? '', '.dclinfo')

/**
 * Reads the contents of the `.dclinfo` file
 */
async function getDCLInfoConfig(): Promise<DCLInfo> {
  try {
    const content = await readFile(getDclInfoPath(), 'utf8')
    return JSON.parse(content) as DCLInfo
  } catch (e) {
    return {}
  }
}

/**
 * Add new configuration to `.dclinfo` file
 */
export async function writeDCLInfo(value: Partial<DCLInfo>) {
  return writeJSON(getDclInfoPath(), value)
}

function isDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

// Default config
function getDefaultConfig(): Partial<DCLInfo> {
  return {
    userId: '',
    trackStats: false,
    segmentKey: isDevelopment() ? 'mjCV5Dc4VAKXLJAH5g7LyHyW1jrIR3to' : 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3'
  }
}

/**
 * Config that can be override via ENV variables
 */
function getEnvConfig(): Partial<DCLInfo> {
  const { SEGMENT_KEY } = process.env

  const envConfig = {
    segmentKey: SEGMENT_KEY
  }

  return removeEmptyKeys(envConfig)
}

export async function getConfig(): Promise<DCLInfo> {
  const defaultConfig = getDefaultConfig()
  const dclInfoConfig = await getDCLInfoConfig()
  const envConfig = getEnvConfig()
  const config = { ...defaultConfig, ...dclInfoConfig, ...envConfig }
  return config
}

function removeEmptyKeys(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  Object.keys(obj)
    .filter((k) => !!obj[k])
    .forEach((k) => (result[k] = obj[k]))
  return result
}

export function isCI() {
  return process.env.CI === 'true' || process.argv.includes('--ci') || process.argv.includes('--c')
}

export function isEditor() {
  return process.env.EDITOR === 'true'
}

export async function getInstalledSDKVersion(): Promise<string> {
  const sdkPath = path.dirname(
    require.resolve('@dcl/sdk/package.json', {
      paths: [process.cwd()]
    })
  )
  const packageJson = await readJSON(sdkPath)
  return packageJson.version
}
