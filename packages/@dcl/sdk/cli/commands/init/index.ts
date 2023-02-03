import { join, resolve } from 'path'

import { getArgs } from '../../utils/args'
import { confirm } from '../../utils/prompt'
import { CliComponents } from '../../components'
import { isDirectoryEmpty, download, extract } from '../../utils/fs'

import { get as getRepo } from './repos'
import { main as handler } from '../../utils/handler'

interface Options {
  args: typeof args
  components: Pick<CliComponents, 'fetch' | 'fs'>
}

export const args = getArgs({
  '--yes': Boolean,
  '-y': '--yes',
  '--dir': String
})

export async function help() {}

export const main = handler(async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  const isEmpty = await isDirectoryEmpty(options.components, dir)
  const yes = options.args['--yes']

  if (!isEmpty && !yes) {
    const answer = await confirm('The folder specified is not empty, continue anyway?')

    if (!answer) return
  }

  const scene = 'scene-template'
  const { url, contentFolders } = getRepo(scene)
  const zip = await download(options.components, url, join(dir, `${scene}.zip`))
  await extract(zip, dir)
  await options.components.fs.unlink(zip)
  await moveFilesFromDirs(options.components, dir, contentFolders)
})

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
