import { Scene } from '@dcl/schemas'
import path from 'path'
import { CliComponents } from '../components'
import { colors } from '../components/log'
import { printProgressInfo } from './beautiful-logs'
import { CliError } from './error'
import { getSceneFilePath, getValidSceneJson } from './scene-validations'
import { getInstalledPackageVersion } from './config'
import { getSmartWearableFile, getValidWearableJson } from './portable-experience-sw-validations'

export type BaseProject = { workingDirectory: string }
export type SceneProject = { kind: 'scene'; scene: Scene } & BaseProject
export type WearableProject = { kind: 'wearable'; scene: Scene } & BaseProject
export type ProjectUnion = SceneProject | WearableProject

/**
 * Asserts that the workingDirectory is a valid project
 */
export async function assertValidProjectFolder(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  workingDirectory: string
): Promise<ProjectUnion> {
  // no validations for now, only check that it exists
  if (!(await components.fs.fileExists(path.resolve(workingDirectory, 'package.json'))))
    throw new CliError(`The project root doesn't have a package.json file`)

  // now we will iterate over different file to evaluate the project kind
  switch (true) {
    case await components.fs.fileExists(getSmartWearableFile(workingDirectory)): {
      await getValidWearableJson(components, workingDirectory)
      return { kind: 'wearable', scene: await getValidSceneJson(components, workingDirectory), workingDirectory }
    }

    case await components.fs.fileExists(getSceneFilePath(workingDirectory)): {
      return { kind: 'scene', scene: await getValidSceneJson(components, workingDirectory), workingDirectory }
    }

    default: {
      throw new CliError(
        `UnknownProjectKind: the kind of project of the folder ${workingDirectory} cannot be identified`
      )
    }
  }
}

/*
 * Returns true if the project contains an empty node_modules folder
 */
export async function needsDependencies(
  components: Pick<CliComponents, 'fs'>,
  workingDirectory: string
): Promise<boolean> {
  const nodeModulesPath = path.join(workingDirectory, 'node_modules')
  const hasNodeModulesFolder = await components.fs.directoryExists(nodeModulesPath)
  const isNodeModulesEmpty = hasNodeModulesFolder && (await components.fs.readdir(nodeModulesPath)).length === 0

  return !hasNodeModulesFolder || isNodeModulesEmpty
}

/* istanbul ignore next */
const npmBin = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

/*
 * Runs "npm install" for desired project
 */
export async function installDependencies(
  components: Pick<CliComponents, 'logger' | 'spawner' | 'fs'>,
  workingDirectory: string
): Promise<void> {
  printProgressInfo(components.logger, 'Installing dependencies...')
  // TODO: test in windows
  await components.spawner.exec(workingDirectory, npmBin, ['install'])
  printProgressInfo(components.logger, colors.white('✅ Installing dependencies...'))
}

/**
 * Run NPM commands
 */
export async function npmRun(
  components: Pick<CliComponents, 'spawner'>,
  cwd: string,
  command: string,
  ...args: string[]
): Promise<void> {
  // TODO: test in windows
  await components.spawner.exec(cwd, npmBin, ['run', command, '--silent', '--', ...args], { env: process.env as any })
}

/**
 * NPM commands
 */
export async function npmCommand(
  components: Pick<CliComponents, 'spawner'>,
  cwd: string,
  command: string,
  ...args: string[]
): Promise<void> {
  await components.spawner.exec(cwd, npmBin, [command, ...args, '--silent'], { env: process.env as any })
}

/**
 * Start validations to make the scene work.
 */
export async function startValidations(components: Pick<CliComponents, 'spawner' | 'fs' | 'logger'>, cwd: string) {
  try {
    const sdkVersion = await getInstalledPackageVersion(components, '@dcl/sdk', cwd)
    await npmCommand(components, cwd, `install --save-exact -D @dcl/js-runtime@${sdkVersion}`)
  } catch (_) {
    components.logger.error('Failed to run scene validations')
  }
}
