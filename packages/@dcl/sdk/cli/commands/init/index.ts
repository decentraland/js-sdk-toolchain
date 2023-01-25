import { join, resolve } from 'path'

import { CliError } from '../../utils/error'
import { getArgs } from '../../utils/args'
import { confirm } from '../../utils/prompt'
import { CliComponents } from '../../components'
import { isDirectoryEmpty, download, extract } from '../../utils/fs'

import { get as getRepo } from './repos'

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

export async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  const isEmpty = await isDirectoryEmpty(options.components, dir)
  const yes = options.args['--yes']

  if (!isEmpty && !yes) {
    const answer = await confirm(
      'The folder specified is not empty, continue anyway?'
    )

    if (!answer) return
  }

  try {
    const scene = 'scene-template'
    const zip = await download(
      options.components,
      getRepo(scene),
      join(dir, `${scene}.zip`)
    )
    await extract(zip, dir)
    await options.components.fs.unlink(zip)
  } catch (e: any) {
    throw new CliError(e.message)
  }
}
