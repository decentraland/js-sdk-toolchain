import { Scene } from '@dcl/schemas'
import path from 'path'
import { CliComponents } from '../components'
import { CliError } from './error'
import { getSceneFilePath, getValidSceneJson } from './scene-validations'

export type BaseProject = { workingDirectory: string }
export type SceneProject = { kind: 'scene'; scene: Scene } & BaseProject
export type ProjectUnion = SceneProject // | WearableProject

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
    // TODO: case wearable
    // case scene
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
  components.logger.info('Installing dependencies...')
  // TODO: test in windows
  await components.spawner.exec(workingDirectory, npmBin, ['install'])
  components.logger.info('Installing dependencies... ✅')
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
