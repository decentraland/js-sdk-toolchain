import { ILoggerComponent } from '@well-known-components/interfaces'
import { createColors } from 'colorette'
import { CliError } from '../logic/error'

/**
 * This file imitates "cargo" logs. The words are aligned with the colon like this:
 *        V
 *   Error: some text provided as argument
 *    Info: some text provided as argument
 * Success: some text provided as argument
 * Warning: some text provided as argument
 *        ^
 */

export const writeToStderr = (...parameters: readonly unknown[]) => {
  process.stderr.write(`${parameters.filter(($) => $ !== undefined).join('')}\n`)
}

// @see https://no-color.org
// @see https://www.npmjs.com/package/chalk
export const colors = createColors({
  useColor: process.env.FORCE_COLOR !== '0' && !process.env.NO_COLOR
})

export function createStderrCliLogger(): ILoggerComponent.ILogger {
  return {
    log(message, extra) {
      writeToStderr(message, extra && JSON.stringify(extra))
    },
    debug(message, extra) {
      writeToStderr(colors.blueBright('debug: '), message, extra && JSON.stringify(extra))
    },
    error(error, extra) {
      writeToStderr(colors.redBright('error: '), error, extra && JSON.stringify(extra))
      /* istanbul ignore next */
      if (!(error instanceof CliError)) {
        if (error instanceof Error && error.stack) {
          // print the stacktrace if it is not a CliError
          writeToStderr(error.stack)
        } else if (process.env.DEBUG) {
          // print the stacktrace if it is not a CliError
          writeToStderr(error.toString())
        }
      }
    },
    info(message, extra) {
      writeToStderr(colors.blueBright('info: '), message, extra && JSON.stringify(extra))
    },
    warn(message, extra) {
      writeToStderr(colors.yellow('warning: '), message, extra && JSON.stringify(extra))
    }
  }
}
