#!/usr/bin/env node

/* istanbul ignore file */

import { CliError } from './logic/error'
import { initComponents } from './components'
import { colors, writeToStderr } from './components/log'
import { runSdkCommand } from './run-command'

async function main() {
  const command = process.argv[2]
  const components = await initComponents()

  try {
    // pass on a list of arguments after the command itself
    const argv = process.argv.slice(3)
    await runSdkCommand(components, command, argv)
  } finally {
    await components.analytics.stop()
  }
  // rollup watcher leaves many open FSWatcher even in build mode. we must call
  // process.exit at this point to prevent the program halting forever
  process.exit(process.exitCode || 0)
}

main().catch(function handleError(err: Error) {
  if (err instanceof CliError) {
    writeToStderr(colors.redBright('Error: ') + err.message)
  } else {
    // log with console to show stacktrace and debug information
    // eslint-disable-next-line no-console
    console.error(err)
    writeToStderr(`Developer: All errors thrown must be an instance of "CliError"` + err.stack)
  }

  // set an exit code but not finish the program immediately to close any pending work
  process.exit(process.exitCode ?? 1)
})
