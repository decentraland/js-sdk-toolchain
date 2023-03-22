import path from 'path'
import { CliComponents } from '../components'
import { DCLInfo } from './dcl-info'

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
  const { SEGMENT_KEY, TRACK_STATS } = process.env

  const envConfig: DCLInfo = {
    segmentKey: SEGMENT_KEY,
    trackStats: TRACK_STATS !== undefined ? TRACK_STATS === 'true' : undefined
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
