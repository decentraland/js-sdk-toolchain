import arg, { Result } from 'arg'
import { CliError } from './error'

export type Args = {
  [key: string]: string | StringConstructor | NumberConstructor | BooleanConstructor
}

export function parseArgs<T extends Args>(argv: string[], args: T): Result<T> {
  try {
    return arg({ '--json': Boolean, '-h': '--help', '--help': Boolean, ...args }, { permissive: false, argv })
  } catch (err: any) {
    if (err.name === 'ArgError') throw new CliError(`Argument error: ` + err.message)
    /* istanbul ignore next */
    throw err
  }
}

export function declareArgs<T extends Args>(args: T): T {
  return args
}
