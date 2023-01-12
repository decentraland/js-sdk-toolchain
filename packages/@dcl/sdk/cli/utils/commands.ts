import { resolve } from 'path'

import { isDirectory, isFile, readdir } from './fs'
import { CliError } from './error'

export const COMMANDS_PATH = resolve(__dirname, '../commands')

export const getCommands = async (): Promise<string[]> => {
  const commandDirs = await readdir(COMMANDS_PATH)

  const commands = commandDirs.map(async (dir) => {
    const path = resolve(COMMANDS_PATH, dir)
    if (!(await isDirectory(path))) {
      throw new CliError('Developer: All commands must be inside a folder')
    }

    if (!(await isFile(resolve(path, 'index.js')))) {
      throw new CliError(
        'Developer: All commands must have an "index.js" file inside'
      )
    }

    return dir
  })

  return Promise.all(commands)
}
