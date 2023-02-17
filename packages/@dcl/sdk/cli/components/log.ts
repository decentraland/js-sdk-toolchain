import { ILoggerComponent } from '@well-known-components/interfaces'
import { createColors } from 'colorette'
import { CliError } from '../logic/error'

/**
 * This file imitates "cargo" logs. The words are aligned with the colon like this:
 *        V
 *   Error: some text provided as argumen
 *    Info: some text provided as argumen
 * Success: some text provided as argumen
 * Warning: some text provided as argumen
 *        ^
 */

const stderr = (...parameters: readonly unknown[]) => {
  process.stderr.write(`${parameters.filter(($) => $ !== undefined).join('')}\n`)
}

// @see https://no-color.org
// @see https://www.npmjs.com/package/chalk
const colors = createColors({
  useColor: process.env.FORCE_COLOR !== '0' && !process.env.NO_COLOR
})

export function createStdoutCliLogger(): ILoggerComponent.ILogger {
  return {
    log(message, extra) {
      stderr(message, extra && JSON.stringify(extra))
    },
    debug(message, extra) {
      stderr(colors.blueBright('  Debug: '), message, extra && JSON.stringify(extra))
    },
    error(error, extra) {
      stderr(colors.redBright('  Error: '), error, extra && JSON.stringify(extra))
      /* istanbul ignore next */
      if (!(error instanceof CliError) || process.env.DEBUG) {
        // print the stacktrace if it is not a CliError
        console.error(error)
      }
    },
    info(message, extra) {
      stderr(colors.blueBright('   Info: '), message, extra && JSON.stringify(extra))
    },
    warn(message, extra) {
      stderr(colors.yellow('Warning: '), message, extra && JSON.stringify(extra))
    }
  }
}
