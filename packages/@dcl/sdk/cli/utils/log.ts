import { createColors } from 'colorette'

// log to stderr to keep `rollup main.js > bundle.js` from breaking
const stderr = (...parameters: readonly unknown[]) => process.stderr.write(`${parameters.join('')}\n`)

// @see https://no-color.org
// @see https://www.npmjs.com/package/chalk
const colors = createColors({
  useColor: process.env.FORCE_COLOR !== '0' && !process.env.NO_COLOR
})

export function raw(message: string) {
  stderr(message)
}

export function fail(message: string) {
  stderr(colors.redBright('Error:'), message)
}

export function warn(message: string) {
  stderr(colors.yellow('Warning:'), message)
}

export function info(message: string) {
  stderr(colors.blueBright('Info:'), message)
}

export function succeed(message: string) {
  stderr(colors.green('Succeeded:'), message)
}
