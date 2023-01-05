#!/usr/bin/env node

import { getArgs } from './utils/args'
import log from './utils/log'
import { CliError } from './utils/error'
import { COMMANDS_PATH, getCommands } from './utils/commands'

export interface Options {
  args: ReturnType<typeof getArgs>
}

// leaving args as "any" since we don't know yet if we will use them
type FileFn = (options: Options) => Promise<void>

interface FileExports {
  help?: FileFn
  main?: FileFn
  args?: ReturnType<typeof getArgs>
}

const listCommandsStr = (commands: string[]) =>
  commands
    .map(
      ($) => `
  * npx sdk ${$}`
    )
    .join('')

const handleError = (err: CliError) => {
  if (!(err instanceof CliError)) {
    log.warn(`Developer: All errors thrown must be an instance of "CliError"`)
  }
  log.fail(err.message)
  process.exit(1)
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

const args = getArgs()
const helpMessage = (commands: string[]) =>
  `Here is the list of commands: ${listCommandsStr(commands)}`

;(async () => {
  const command = process.argv[2]
  const needsHelp = args['--help']
  const commands = await getCommands()

  if (!commands.includes(command)) {
    if (needsHelp) {
      log.info(helpMessage(commands))
      return
    }
    throw new CliError(`Command ${command} is invalid. ${helpMessage}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cmd = require(`${COMMANDS_PATH}/${command}`)

  if (commandFnsAreValid(cmd)) {
    const options = { args: cmd.args }
    needsHelp ? await cmd.help(options) : await cmd.main(options)
  }
})().catch(handleError)
