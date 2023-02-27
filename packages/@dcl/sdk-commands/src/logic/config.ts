import path from 'path'
import { CliComponents } from '../components'

export interface DCLInfo {
  segmentKey?: string
  userId?: string
  trackStats?: boolean
}

/* istanbul ignore next */
export const getDclInfoPath = () =>
  path.resolve(process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] ?? '', '.dclinfo')

/**
 * Reads the contents of the `.dclinfo` file
 */
export async function getDCLInfoConfig(components: Pick<CliComponents, 'fs'>): Promise<DCLInfo> {
  try {
    const content = await components.fs.readFile(getDclInfoPath(), 'utf8')
    return JSON.parse(content) as DCLInfo
  } catch (e) {
    return {}
  }
}

/**
 * Config that can be override via ENV variables
 */
export function getEnvConfig(): Partial<DCLInfo> {
  const { SEGMENT_KEY } = process.env

  const envConfig = {
    segmentKey: SEGMENT_KEY
  }

  return removeEmptyKeys(envConfig)
}

export function removeEmptyKeys(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  Object.keys(obj)
    .filter((k) => !!obj[k])
    .forEach((k) => (result[k] = obj[k]))
  return result
}
