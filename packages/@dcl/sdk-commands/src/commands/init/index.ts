import { join, resolve } from 'path'

import { getArgs } from '../../logic/args'
import { CliError } from '../../logic/error'
import { CliComponents } from '../../components'
import { isDirectoryEmpty, download, extract } from '../../logic/fs'

import { get as getRepo } from './repos'
import { installDependencies, needsDependencies } from '../../logic/project-validations'
import { track } from '../../logic/analytics'

interface Options {
  args: typeof args
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger'>
}

export const args = getArgs({
  '--yes': Boolean,
  '-y': '--yes',
  '--dir': String,
  '--skip-install': Boolean
})

export async function help() {}

export async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  const isEmpty = await isDirectoryEmpty(options.components, dir)
  const yes = options.args['--yes']

  if (!isEmpty && !yes) {
    throw new CliError('The target directory specified is not empty. Run this command with --yes to override.')
  }

  // download and extract template project
  const scene = 'scene-template'
  const { url, contentFolders } = getRepo(scene)
  const zip = await download(options.components, url, join(dir, `${scene}.zip`))
  await extract(zip, dir)
  await options.components.fs.unlink(zip)
  await moveFilesFromDirs(options.components, dir, contentFolders)

  // npm install
  const shouldInstallDeps = await needsDependencies(options.components, dir)
  if (shouldInstallDeps && !options.args['--skip-install']) {
    await installDependencies(options.components, dir)
  }
  await track(options.components, 'Scene created', { projectType: scene, url })
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
