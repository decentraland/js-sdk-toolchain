import { resolve } from 'path'
import { CliComponents } from '../components'
import { CliError } from './error'

export const COMMANDS_PATH = resolve(__dirname, '../commands')

export async function getCommands({ fs }: Pick<CliComponents, 'fs'>): Promise<string[]> {
  const commandDirs = await fs.readdir(COMMANDS_PATH)

  const commands = commandDirs.map(async (dir) => {
    const path = resolve(COMMANDS_PATH, dir)

    if (!(await fs.directoryExists(path))) {
      throw new CliError('Developer: All commands must be inside a folder', 'COMMANDS_INVALID_FOLDER')
    }

    try {
      require.resolve(`${path}`)
    } catch {
      /* istanbul ignore next */
      throw new CliError('Developer: All commands must have an "index.js" file inside', 'COMMANDS_INVALID_INDEX_FILE')
    }

    return dir
  })

  return Promise.all(commands)
}
