import { resolve } from 'path'
import { CliComponents } from '../components'
import { CliError } from './error'

export const COMMANDS_PATH = resolve(__dirname, '../commands')

export const getCommands = async ({ fs }: Pick<CliComponents, 'fs'>): Promise<string[]> => {
  const commandDirs = await fs.readdir(COMMANDS_PATH)

  const commands = commandDirs.map(async (dir) => {
    const path = resolve(COMMANDS_PATH, dir)

    const statDir = await fs.stat(path)

    if (!statDir.isDirectory()) {
      throw new CliError('Developer: All commands must be inside a folder')
    }

    const statIndex = await fs.stat(`${path}/index.js`)
    if (!statIndex.isFile()) {
      throw new CliError('Developer: All commands must have an "index.js" file inside')
    }

    return dir
  })

  return Promise.all(commands)
}
