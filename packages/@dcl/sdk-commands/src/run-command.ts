import { CliComponents } from './components'
import { Args, parseArgs } from './logic/args'
import { printCommand } from './logic/beautiful-logs'
import { getCommands } from './logic/commands'
import { CliError } from './logic/error'

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

const commandFnsAreValid = (fns: FileExports): fns is Required<FileExports> => {
  const { help, main } = fns
  if (!help || !main) {
    throw new CliError(`Command does not follow implementation rules:
      * Requires a "help" function
      * Requires a "main" function
    `)
  }
  return true
}

export async function runSdkCommand(components: CliComponents, command: string, argv: string[]): Promise<any> {
  const helpMessage = (commands: string[]) => `Here is the list of commands:\n${listCommandsStr(commands)}`
  const needsHelp = argv.includes('--help') || argv.includes('-h')

  const commands = await getCommands(components)

  if (!commands.includes(command)) {
    if (needsHelp) {
      components.logger.info(helpMessage(commands))
      return
    }
    throw new CliError(`Command ${command} is invalid. ${helpMessage(commands)}`)
  }

  const cmd = await import(`./commands/${command}`)

  if (commandFnsAreValid(cmd)) {
    const options = { args: parseArgs(argv, cmd.args || {}), components }
    if (needsHelp) {
      await cmd.help(options)
    } else {
      printCommand(components.logger, command)

      const ret = await cmd.main(options)
      // print the result of the evaluation as json in the standard output
      if (cmd.args['--json']) {
        process.stdout.write(JSON.stringify(ret, null, 2))
      }

      return ret
    }
  }
}
