import path from 'path'
import { CliComponents } from '../components'
import { readStringConfig } from '../components/config'
import { readJson } from './fs'
import { getPackageJson } from './project-files'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: sdkCommandsVersion } = require('../../package.json')

/**
 * Returns the version of the sdk-commands that is running
 */
export async function getSdkCommandsVersion() {
  return sdkCommandsVersion
}

/**
 * Returns the installed version of a certain package that lives inside another package in the current working directory.
 * Returns undefined if the package is not installed.
 */
export async function getInstalledPackageVersionInsidePackage(
  components: Pick<CliComponents, 'fs'>,
  packageName: string,
  packageRootName: string,
  workingDirectory: string
) {
  try {
    const packagePath = path.dirname(
      require.resolve(`${packageRootName}/package.json`, {
        paths: [workingDirectory]
      })
    )
    const packageJson = await getPackageJson(components, packagePath)

    const version =
      (packageJson.dependencies && packageJson.dependencies[packageName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[packageName])

    return version ?? undefined
  } catch (e) {
    return 'unknown'
  }
}
/**
 * Returns the installed version of a certain package in the current working directory.
 * Returns "unknown" if the package is not installed.
 */
export async function getInstalledPackageVersion(
  components: Pick<CliComponents, 'fs'>,
  packageName: string,
  workingDirectory: string
) {
  try {
    const packagePath = path.dirname(
      require.resolve(`${packageName}/package.json`, {
        paths: [workingDirectory]
      })
    )
    const packageJson = await readJson<{ version: string }>(components, path.resolve(packagePath, 'package.json'))

    return packageJson.version ?? /* istanbul ignore next */ 'unknown'
  } catch (e) {
    return 'unknown'
  }
}

/**
 * Returns true if the Decentraland Editor is running.
 */
export function isEditor() {
  return process.env.EDITOR_SDK7 === 'true'
}

export function isCI() {
  return process.env.CI === 'true' || process.argv.includes('--ci') || process.argv.includes('--c')
}

export async function getCatalystBaseUrl(components: Pick<CliComponents, 'config'>): Promise<string> {
  const url = (await readStringConfig(components, 'DCL_CATALYST')) ?? 'https://peer.decentraland.org'
  return url.replace(/\/$/, '')
}

export function getSegmentKey() {
  const isProduction = !process.env.DEVELOPER_MODE
  return isProduction
    ? /* istanbul ignore next */ 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3'
    : 'mjCV5Dc4VAKXLJAH5g7LyHyW1jrIR3to'
}

/* istanbul ignore next */
export async function getLandRegistry(components: Pick<CliComponents, 'config'>) {
  return readStringConfig(components, 'DCL_LAND_REGISTRY_ADDRESS')
}

/* istanbul ignore next */
export async function getEstateRegistry(components: Pick<CliComponents, 'config'>) {
  return readStringConfig(components, 'DCL_ESTATE_REGISTRY_ADDRESS')
}
