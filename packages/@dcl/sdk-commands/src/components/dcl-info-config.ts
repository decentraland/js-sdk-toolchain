import path, { resolve } from 'path'
import { CliComponents } from '.'
import { DCLInfo, getDCLInfoConfig, getDclInfoPath, getEnvConfig } from '../logic/config'
import { readJSON, writeJSON } from '../logic/fs'

export type IDCLInfoConfigComponent = {
  get(): Promise<DCLInfo>
  updateDCLInfo(value: Partial<DCLInfo>): Promise<Partial<DCLInfo>>
  getVersion(): Promise<string>
  isCI(): boolean
  isEditor(): boolean
  isDevelopment(): boolean
}

export async function createDCLInfoConfigComponent({
  fs
}: Pick<CliComponents, 'fs'>): Promise<IDCLInfoConfigComponent> {
  function isDevelopment() {
    return process.env.NODE_ENV !== 'production' || !__filename.includes('node_modules')
  }
  const defaultConfig: Partial<DCLInfo> = {
    userId: '',
    trackStats: false,
    segmentKey: isDevelopment() ? 'mjCV5Dc4VAKXLJAH5g7LyHyW1jrIR3to' : 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3'
  }

  return {
    async get() {
      const dclInfoConfig = await getDCLInfoConfig({ fs })
      const envConfig = getEnvConfig()
      const config = { ...defaultConfig, ...dclInfoConfig, ...envConfig }
      return config
    },
    updateDCLInfo(value: Partial<DCLInfo>) {
      return writeJSON({ fs }, getDclInfoPath(), value)
    },
    async getVersion() {
      try {
        const sdkPath = path.dirname(
          require.resolve('@dcl/sdk/package.json', {
            paths: [process.cwd()]
          })
        )
        const packageJson = await readJSON<{ version: string }>({ fs }, resolve(sdkPath, 'package.json'))
        return packageJson.version ?? 'unknown'
      } catch (e) {
        return 'unknown'
      }
    },
    isEditor() {
      return process.env.EDITOR === 'true'
    },
    isCI() {
      return process.env.CI === 'true' || process.argv.includes('--ci') || process.argv.includes('--c')
    },
    isDevelopment() {
      return isDevelopment()
    }
  }
}
