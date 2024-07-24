import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { homedir } from 'os'
import path from 'path'
import { CliComponents } from '.'
import { CliError } from '../logic/error'
import { IFileSystemComponent } from './fs'

export type ConfigKeys =
  | 'DCL_ANON_ID' // anonymous ID used for analytics
  | 'DCL_DISABLE_ANALYTICS' // when true, all telemetry events are disabled
  | 'DCL_LAND_REGISTRY_ADDRESS' // Address of the LAND_REGISTRY smart contract
  | 'DCL_ESTATE_REGISTRY_ADDRESS' // Address of the ESTATE_REGISTRY smart contract
  | 'DCL_CATALYST' // Default catalyst

export const DCL_RC = '.dclrc'

/**
 * This function creates a chained .env loader for configurations.
 * It loads sdk-commands/.dclrc then ~/.dclrc and lastly $(pwd)/.dclrc
 * By default, process.env overrides any configuration.
 */
export async function createConfigComponent({ fs }: { fs: IFileSystemComponent }) {
  const dotEnvFilesToLoad: string[] = [await getSdkCommandsDclRcPath(fs)]

  const userDclRc = getGlobalDclRcPath()
  if (await fs.fileExists(userDclRc)) dotEnvFilesToLoad.push(userDclRc)

  const projectDclRc = DCL_RC
  /* istanbul ignore if */
  if (await fs.fileExists(projectDclRc)) dotEnvFilesToLoad.push(projectDclRc)

  return createDotEnvConfigComponent({ path: dotEnvFilesToLoad })
}

export async function writeGlobalConfig({ fs }: { fs: IFileSystemComponent }, key: ConfigKeys, value: string) {
  const data = ['', '# ' + new Date().toISOString(), key + '=' + value, '']
  await fs.appendFile(getGlobalDclRcPath(), data.join('\n'))
}

export function getGlobalDclRcPath() {
  return path.resolve(homedir(), DCL_RC)
}

async function getSdkCommandsDclRcPath(fs: IFileSystemComponent) {
  const dclRc = path.resolve(__dirname, '..', '..', DCL_RC)
  /* istanbul ignore if */
  if (!(await fs.fileExists(dclRc))) {
    throw new Error(dclRc + ' not found')
  }
  return dclRc
}

export async function readStringConfig(
  components: Pick<CliComponents, 'config'>,
  key: ConfigKeys
): Promise<string | undefined> {
  return components.config.getString(key)
}

export async function requireStringConfig(components: Pick<CliComponents, 'config'>, key: ConfigKeys): Promise<string> {
  const address = await readStringConfig(components, key)
  if (!address) throw new CliError(`configuration ${key} was not provided`)
  return address
}
