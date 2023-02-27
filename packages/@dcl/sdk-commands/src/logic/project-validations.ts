import { Scene } from '@dcl/schemas'
import { resolve } from 'path'
import { CliComponents } from '../components'
import { CliError } from './error'
import { exec } from './exec'
import { getSceneJson } from './scene-validations'

/**
 * Asserts that the projectRoot is a valid project
 */
export async function assertValidProjectFolder(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectRoot: string
): Promise<{ scene: Scene }> {
  // no validations for now, only check that it exists
  if (!(await components.fs.fileExists(resolve(projectRoot, 'package.json'))))
    throw new CliError(`The project root doesn't have a package.json file`)

  // now we will iterate over different file to evaluate the project kind
  switch (true) {
    // case wearable
    case await components.fs.fileExists(resolve(projectRoot, 'scene.json')): {
      return { scene: await getSceneJson(components, projectRoot) }
    }
    default: {
      throw new CliError(`UnknownProjectKind: the kind of project of the folder ${projectRoot} cannot be identified`)
    }
  }
}

/*
 * Returns true if the project contains an empty node_modules folder
 */
export async function needsDependencies(components: Pick<CliComponents, 'fs'>, dir: string): Promise<boolean> {
  const nodeModulesPath = resolve(dir, 'node_modules')
  const hasNodeModulesFolder = await components.fs.directoryExists(nodeModulesPath)
  const isNodeModulesEmpty = hasNodeModulesFolder && (await components.fs.readdir(nodeModulesPath)).length === 0

  return !hasNodeModulesFolder || isNodeModulesEmpty
}

/* istanbul ignore next */
export const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

/*
 * Runs "npm install" for desired project
 */
export async function installDependencies(components: Pick<CliComponents, 'logger'>, directory: string): Promise<void> {
  components.logger.info('Installing dependencies...')
  // TODO: test in windows
  await exec(directory, npm, ['install'])
  components.logger.log('Installing dependencies... ✅')
}

/**
 * Run NPM commands
 */
export async function npmRun(cwd: string, command: string, ...args: string[]): Promise<void> {
  // TODO: test in windows
  await exec(cwd, npm, ['run', command, '--silent', '--', ...args], { env: process.env as any })
}
