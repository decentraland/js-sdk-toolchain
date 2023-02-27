#!/usr/bin/env node

/* istanbul ignore file */

import { getArgs } from './logic/args'
import { CliError } from './logic/error'
import { COMMANDS_PATH, getCommands } from './logic/commands'
import { CliComponents, initComponents } from './components'
import { printCommand } from './logic/beautiful-logs'
import { colors } from './components/log'

export interface Options {
  args: ReturnType<typeof getArgs>
  components: CliComponents
}

// leaving args as "any" since we don't know yet if we will use them
type FileFn = (options: Options) => Promise<void>

interface FileExports {
  help?: FileFn
  main?: FileFn
  args?: ReturnType<typeof getArgs>
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

async function main() {
  const helpMessage = (commands: string[]) => `Here is the list of commands:\n${listCommandsStr(commands)}`
  const args = getArgs()
  const command = process.argv[2]
  const needsHelp = args['--help']
  const components: CliComponents = await initComponents()

  const commands = await getCommands(components)

  if (!commands.includes(command)) {
    if (needsHelp) {
      components.logger.info(helpMessage(commands))
      return
    }
    throw new CliError(`Command ${command} is invalid. ${helpMessage(commands)}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cmd = require(`${COMMANDS_PATH}/${command}`)

  if (commandFnsAreValid(cmd)) {
    await components.analytics.identify()
    const options = { args: cmd.args, components }
    if (needsHelp) {
      await cmd.help(options)
    } else {
      printCommand(components.logger, command)

      const ret = await cmd.main(options)
      // print the result of the evaluation as json in the standard output
      if (cmd.args['--json']) {
        process.stdout.write(JSON.stringify(ret, null, 2))
      }
    }
  }

  // rollup watcher leaves many open FSWatcher even in build mode. we must call
  // process.exit at this point to prevent the program halting forever
  process.exit(process.exitCode || 0)
}

main().catch(function handleError(err: Error) {
  if (err instanceof CliError) {
    console.error(colors.redBright('Error: ') + err.message)
  } else {
    // log with console to show stacktrace and debug information
    console.error(err)
    console.warn(`Developer: All errors thrown must be an instance of "CliError"`)
  }

  // set an exit code but not finish the program immediately to close any pending work
  process.exitCode = 1
})
