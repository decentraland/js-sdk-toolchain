import { join, resolve } from 'path'

import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { CliError } from '../../logic/error'
import { download, extract, isDirectoryEmpty } from '../../logic/fs'

import { Result } from 'arg'
import { installDependencies, needsDependencies } from '../../logic/project-validations'
import { ScaffoldedScene, existScaffoldedScene, getScaffoldedSceneRepo, scaffoldedSceneOptions } from './repos'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger' | 'analytics' | 'spawner'>
}

export const args = declareArgs({
  '--yes': Boolean,
  '-y': '--yes',
  '--dir': String,
  '--skip-install': Boolean,
  '--scene': String
})

export async function help() {}

export async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  const isEmpty = await isDirectoryEmpty(options.components, dir)
  const yes = options.args['--yes']
  const requestedScene = options.args['--scene']

  if (!isEmpty && !yes) {
    throw new CliError('The target directory specified is not empty. Run this command with --yes to override.')
  }

  if (requestedScene && !existScaffoldedScene(requestedScene)) {
    throw new CliError(
      `The requested scene doesn't exist empty. Valid options are: ${scaffoldedSceneOptions().join(', ')}`
    )
  }

  // download and extract template project
  const scene = (requestedScene as ScaffoldedScene) || 'scene-template'
  const { url, contentFolders } = getScaffoldedSceneRepo(scene)
  const zip = await download(options.components, url, join(dir, `${scene}.zip`))
  await extract(zip, dir)
  await options.components.fs.unlink(zip)
  await moveFilesFromDirs(options.components, dir, contentFolders)

  // npm install
  const shouldInstallDeps = await needsDependencies(options.components, dir)
  if (shouldInstallDeps && !options.args['--skip-install']) {
    await installDependencies(options.components, dir)
  }
  options.components.analytics.track('Scene created', { projectType: scene, url })
}

const moveFilesFromDir = async (components: Pick<CliComponents, 'fs'>, dir: string, folder: string) => {
  const files = await components.fs.readdir(folder)
  await Promise.all(
    files.map(($) => {
      const filePath = resolve(folder, $)
      return components.fs.rename(filePath, resolve(dir, $))
    })
  )
  await components.fs.rmdir(folder)
}

const moveFilesFromDirs = async (components: Pick<CliComponents, 'fs'>, dir: string, folders: string[]) => {
  await Promise.all(
    folders.map(($) => {
      const folderPath = resolve(dir, $)
      return moveFilesFromDir(components, dir, folderPath)
    })
  )
}
