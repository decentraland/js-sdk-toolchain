#!/usr/bin/env node

import arg from 'arg'
import { readdirSync } from 'fs'
import { resolve } from 'path'

import { CliError } from './error'

// leaving args as "any" since we don't know yet if we will use them
type FileFn = (...args: any) => Promise<void>

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

const handleError = (err: Error) => {
  const error = err instanceof CliError ? err.message : err
  console.error(error)
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

const args = arg({
  '--help': Boolean,
  '-h': '--help'
})

;(async () => {
  const command = process.argv[2]
  const needsHelp = args['--help']

  if (!commands.has(command)) {
    if (needsHelp) {
      console.log('TODO: help message')
      return
    }
    throw new CliError(`Invalid command. Possible are: ${listCommandsStr()}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fns = require(resolve(COMMANDS_PATH, command + JS_EXT))

  if (validCommandFns(fns)) {
    needsHelp ? await fns.help() : await fns.default()
  }
})().catch(handleError)
