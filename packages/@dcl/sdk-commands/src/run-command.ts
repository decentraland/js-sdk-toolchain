import i18next from 'i18next'
import { CliComponents } from './components'
import { Args, parseArgs } from './logic/args'
import { printCommand } from './logic/beautiful-logs'
import { getCommands } from './logic/commands'
import { CliError } from './logic/error'
import { getLanguage, initLanguage } from './logic/lang'

export interface Options {
  args: ReturnType<typeof parseArgs>
  components: CliComponents
}

// leaving args as "any" since we don't know yet if we will use them
type FileFn = (options: Options) => Promise<void>

interface FileExports {
  help?: FileFn
  main?: FileFn
  args?: Args
}

const listCommandsStr = (commands: string[]) => commands.map(($) => `\t *sdk-commands ${$} \n`).join('')

/* istanbul ignore next */
function asserValidCommand(fns: FileExports): fns is Required<FileExports> {
  const { help, main } = fns
  if (!help || !main) {
    throw new CliError('COMMAND_NOT_VALID', i18next.t('errors.command.not_valid'))
  }
  return true
}

export async function runSdkCommand(components: CliComponents, command: string, argv: string[]): Promise<any> {
  const helpMessage = (commands: string[]) => `Here is the list of commands:\n${listCommandsStr(commands)}`
  const needsHelp = argv.includes('--help') || argv.includes('-h')
  const needsJson = argv.includes('--json')
  const language = getLanguage(argv)

  await initLanguage(language)
  argv = argv.filter((arg) => arg !== '--language')

  const commands = await getCommands(components)

  if (!commands.includes(command)) {
    if (needsHelp) {
      components.logger.log(helpMessage(commands))
      return
    }
    /* istanbul ignore next */
    throw new CliError(
      'COMMAND_NOT_FOUND',
      i18next.t('errors.command.not_found', { command, help: helpMessage(commands) })
    )
  }

  const cmd = await import(`./commands/${command}`)

  if (asserValidCommand(cmd)) {
    let args: ReturnType<typeof parseArgs>
    try {
      args = parseArgs(argv, cmd.args)
    } catch (e) {
      components.logger.error((e as Error).message)
      return cmd.help({ args: {} as any, components })
    }

    if (needsHelp) {
      await cmd.help({ args, components })
    } else {
      printCommand(components.logger, command)

      const ret = await cmd.main({ args, components })
      // print the result of the evaluation as json in the standard output
      if (needsJson) {
        process.stdout.write(JSON.stringify(ret, null, 2))
      }

      return ret
    }
  }
}
