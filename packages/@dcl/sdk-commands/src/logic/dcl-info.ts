import path from 'path'
import os from 'os'
import { CliComponents } from '../components'

/**
 * Filter undefined keys from provided object
 */
export function removeEmptyKeys(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  Object.keys(obj)
    .filter((k) => !!obj[k])
    .forEach((k) => (result[k] = obj[k]))
  return result
}

export type DCLInfo = {
  fileExists?: boolean
  userId: string
  trackStats: boolean
  provider?: string
  MANAToken?: string
  LANDRegistry?: string
  EstateRegistry?: string
  catalystUrl?: string
  dclApiUrl?: string
  segmentKey?: string
}

let config: DCLInfo

/**
 * Returns the path to the `.dclinfo` file located in the local HOME folder
 */
function getDCLInfoPath(): string {
  return path.resolve(os.homedir(), '.dclinfo')
}

/**
 * Reads the contents of the `.dclinfo` file
 */
async function readDCLInfo({ fs }: CliComponents): Promise<DCLInfo | null> {
  const filePath = getDCLInfoPath()
  try {
    const file = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(file) as DCLInfo
  } catch (e) {
    return null
  }
}

/**
 * Reads `.dclinfo` file and loads it in-memory to be sync-obtained with `getDCLInfo()` function
 */
export async function loadConfig(components: CliComponents): Promise<DCLInfo> {
  config = (await readDCLInfo(components))!
  return config
}

/**
 * Returns the contents of the `.dclinfo` file. It needs to be loaded first with `loadConfig()` function
 */
export function getDCLInfo(): DCLInfo {
  return config
}

export function getCustomConfig(): Partial<DCLInfo> {
  const envConfig = getEnvConfig()
  const dclInfoConfig = getDclInfoConfig()
  return { ...dclInfoConfig, ...envConfig }
}

function getDclInfoConfig(): Partial<DCLInfo> {
  const dclInfo = getDCLInfo()
  const fileExists = !!dclInfo
  if (!fileExists) {
    return { fileExists }
  }

  const dclInfoConfig = {
    fileExists,
    userId: dclInfo.userId,
    trackStats: !!dclInfo.trackStats,
    MANAToken: dclInfo.MANAToken,
    LANDRegistry: dclInfo.LANDRegistry,
    EstateRegistry: dclInfo.EstateRegistry,
    catalystUrl: dclInfo.catalystUrl,
    segmentKey: dclInfo.segmentKey
  }

  return removeEmptyKeys(dclInfoConfig)
}

function getEnvConfig(): Partial<DCLInfo> {
  const { RPC_URL, MANA_TOKEN, LAND_REGISTRY, ESTATE_REGISTRY, CONTENT_URL, SEGMENT_KEY } = process.env

  const envConfig = {
    provider: RPC_URL,
    MANAToken: MANA_TOKEN,
    LANDRegistry: LAND_REGISTRY,
    EstateRegistry: ESTATE_REGISTRY,
    contentUrl: CONTENT_URL,
    segmentKey: SEGMENT_KEY
  }

  return removeEmptyKeys(envConfig)
}
