import { resolve } from 'path'
import { CliComponents } from '../components'
import { CliError } from './error'
import i18next from 'i18next'

export const COMMANDS_PATH = resolve(__dirname, '../commands')

export async function getCommands({ fs }: Pick<CliComponents, 'fs'>): Promise<string[]> {
  const commandDirs = await fs.readdir(COMMANDS_PATH)

  const commands = commandDirs.map(async (dir) => {
    const path = resolve(COMMANDS_PATH, dir)

    if (!(await fs.directoryExists(path))) {
      throw new CliError('COMMANDS_INVALID_FOLDER', i18next.t('errors.commands.invalid_folder'))
    }

    try {
      require.resolve(`${path}`)
    } catch {
      /* istanbul ignore next */
      throw new CliError('COMMANDS_INVALID_INDEX_FILE', i18next.t('errors.commands.invalid_index_file'))
    }

    return dir
  })

  return Promise.all(commands)
}
