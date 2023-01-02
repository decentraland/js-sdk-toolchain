#!/usr/bin/env node

import { readdirSync } from 'fs'
import { resolve } from 'path'

import { getArgs } from './utils/args'
import { log } from './utils/log'
import { CliError } from './utils/error'

interface Options {
  args: string[]
}

// leaving args as "any" since we don't know yet if we will use them
type FileFn = (options: Options) => Promise<void>

interface FileFns {
  help?: FileFn
  default?: FileFn
}

const JS_EXT = '.js'
const COMMANDS_PATH = resolve(__dirname, './commands')

const isJSFile = (file: string): boolean => file.slice(-3) === JS_EXT

const commands = new Set(
  readdirSync(COMMANDS_PATH)
    .filter((fileName) => isJSFile(fileName))
    .map((fileName) => fileName.slice(0, -3))
)

const listCommandsStr = () =>
  Array.from(commands)
    .map(
      ($) => `
  * npx sdk ${$}`
    )
    .join('')

const handleError = (err: CliError) => {
  if (!(err instanceof CliError)) {
    log.fail(`Developer: All errors thrown must be an instance of "CliError"`)
  }
  log.fail(err.message)
  process.exit(1)
}

const validCommandFns = (fns: FileFns): fns is Required<FileFns> => {
  const { help, default: _def } = fns
  if (!help || !_def) {
    throw new CliError(`
      Command does not follow implementation rules:
        * Requires a "help" function
        * Requires a "default" function
    `)
  }
  return true
}

const args = getArgs()
const helpMessage = `Here is the list of commands: ${listCommandsStr()}`

;(async () => {
  const command = process.argv[2]
  const needsHelp = args['--help']

  if (!commands.has(command)) {
    if (needsHelp) {
      log.info(helpMessage)
      return
    }
    throw new CliError(`Command ${command} is invalid. ${helpMessage}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fns = require(resolve(COMMANDS_PATH, command + JS_EXT))

  if (validCommandFns(fns)) {
    const options = { args: process.argv }
    needsHelp ? await fns.help(options) : await fns.default(options)
  }
})().catch(handleError)
