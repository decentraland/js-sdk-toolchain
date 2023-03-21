import path, { resolve } from 'path'
import { CliComponents } from '.'
import { getDCLInfoConfig, getDclInfoPath, getEnvConfig } from '../logic/config'
import { DCLInfo } from '../logic/dcl-info'
import { readJSON, writeJSON } from '../logic/fs'

export type IDCLInfoConfigComponent = {
  get(): Promise<DCLInfo>
  updateDCLInfo(value: Partial<DCLInfo>): Promise<Partial<DCLInfo>>
  getVersion(): Promise<string>
  isCI(): boolean
  isEditor(): boolean
  isProduction(): boolean
}

export async function createDCLInfoConfigComponent({
  fs
}: Pick<CliComponents, 'fs'>): Promise<IDCLInfoConfigComponent> {
  function isProduction() {
    return process.env.NODE_ENV === 'production' || __filename.includes('node_modules')
  }
  const defaultConfig: Partial<DCLInfo> = {
    userId: '',
    trackStats: false,
    segmentKey: isProduction() ? 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3' : 'mjCV5Dc4VAKXLJAH5g7LyHyW1jrIR3to'
  }

  let dclInfoConfig: DCLInfo

  return {
    async get() {
      if (!dclInfoConfig) {
        dclInfoConfig = await getDCLInfoConfig({ fs })
      }
      const envConfig = getEnvConfig()
      const config = { ...defaultConfig, ...dclInfoConfig, ...envConfig }
      return config
    },
    updateDCLInfo(value: Partial<DCLInfo>) {
      dclInfoConfig = { ...dclInfoConfig, ...value }
      return writeJSON({ fs }, getDclInfoPath(), value)
    },
    async getVersion() {
      try {
        /* istanbul ignore next */
        const sdkPath = path.dirname(
          require.resolve('@dcl/sdk/package.json', {
            paths: [process.cwd()]
          })
        )
        /* istanbul ignore next */
        const packageJson = await readJSON<{ version: string }>({ fs }, resolve(sdkPath, 'package.json'))
        /* istanbul ignore next */
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
    isProduction() {
      return isProduction()
    }
  }
}
