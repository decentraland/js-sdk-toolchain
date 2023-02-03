#!/usr/bin/env node

/*
  istanbul ignore file
  Doesn't make sense to test this file
*/

import { getArgs } from './utils/args'
import { toStringList } from './utils/out-messages'
import * as log from './utils/log'
import { CliError } from './utils/error'
import { COMMANDS_PATH, getCommands } from './utils/commands'
import { CliComponents, initComponents } from './components'

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

const listCommandsStr = (commands: string[]) => toStringList(commands.map(($) => `npx @dcl/sdk ${$}`))

const handleError = (err: Error) => {
  if (err instanceof CliError) {
    log.fail(err.message)
  } else {
    // log with console to show stacktrace and debug information
    console.error(err)
    log.warn(`Developer: All errors thrown must be an instance of "CliError"`)
  }

  // set an exit code but not finish the program immediately to close any pending work
  process.exitCode = 1
}

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
  const components: CliComponents = initComponents()

  const commands = await getCommands(components)

  if (!commands.includes(command)) {
    if (needsHelp) {
      log.info(helpMessage(commands))
      return
    }
    throw new CliError(`Command ${command} is invalid. ${helpMessage(commands)}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cmd = require(`${COMMANDS_PATH}/${command}`)

  if (commandFnsAreValid(cmd)) {
    const options = { args: cmd.args, components }
    needsHelp ? await cmd.help(options) : await cmd.main(options)
  }
}

main().catch(handleError)
