import { join, resolve } from 'path'

import { getArgs } from '../../utils/args'
import { confirm } from '../../utils/prompt'
import { isDirectoryEmpty, download, extract, remove } from '../../utils/fs'
import { get as getRepo } from './repos'
import { main as handler } from '../../utils/handler'

interface Options {
  args: typeof args
}

export const args = getArgs({
  '--yes': Boolean,
  '-y': '--yes',
  '--dir': String
})

export async function help() {}

export const main = handler(async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  const isEmpty = await isDirectoryEmpty(dir)
  const yes = options.args['--yes']

  if (!isEmpty && !yes) {
    const answer = await confirm(
      'The folder specified is not empty, continue anyway?'
    )

    if (!answer) return
  }

  const scene = 'scene-template'
  const zip = await download(getRepo(scene), join(dir, `${scene}.zip`))
  await extract(zip, dir)
  await remove(zip)
})
