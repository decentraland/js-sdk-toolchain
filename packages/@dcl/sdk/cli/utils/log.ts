import { createColors } from 'colorette'

/**
 * This file imitates "cargo" logs. The words are aligned with the colon like this:
 *        V
 *   Error: some text provided as argumen
 *    Info: some text provided as argumen
 * Success: some text provided as argumen
 * Warning: some text provided as argumen
 *        ^
 */

const stderr = (...parameters: readonly unknown[]) => process.stderr.write(`${parameters.join('')}\n`)

// @see https://no-color.org
// @see https://www.npmjs.com/package/chalk
const colors = createColors({
  useColor: process.env.FORCE_COLOR !== '0' && !process.env.NO_COLOR
})

export function log(message: string) {
  stderr(message)
}

export function fail(message: string) {
  stderr(colors.redBright('  Error: '), message)
}

export function warn(message: string) {
  stderr(colors.yellow('Warning: '), message)
}

export function info(message: string) {
  stderr(colors.blueBright('   Info: '), message)
}

export function succeed(message: string) {
  stderr(colors.green('Success: '), message)
}
