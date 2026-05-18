import arg, { Result } from 'arg'
import i18next from 'i18next'

import { CliError } from './error'

export type Args = {
  [key: string]: string | StringConstructor | NumberConstructor | BooleanConstructor
}

/**
 * Pre-process argv so that String-type options whose value starts with a digit
 * after the leading minus sign (e.g. `--position -2,-1`) are not misinterpreted
 * as a new flag by the `arg` library.
 *
 * The `arg` library treats every token beginning with `-` as a flag.  Coordinate
 * values such as `-2,-1` therefore cause the parser to report that the preceding
 * option received no argument.  We resolve this transparently by merging any
 * `--option <value>` pair into `--option=<value>` when <value> matches /^-\d/,
 * so users never need to type the `=` form themselves.
 */
function preprocessArgv(argv: string[], args: Args): string[] {
  const stringOpts = new Set(
    Object.entries(args)
      .filter(([key, val]) => key.startsWith('--') && val === String)
      .map(([key]) => key)
  )

  const out: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    const next = argv[i + 1]
    if (stringOpts.has(token) && next !== undefined && /^-\d/.test(next)) {
      // Merge "--option -value" into "--option=-value"
      out.push(`${token}=${next}`)
      i++
    } else {
      out.push(token)
    }
  }
  return out
}

export function parseArgs<T extends Args>(argv: string[], args: T): Result<T> {
  const processedArgv = preprocessArgv(argv, args)
  try {
    return arg({ '--json': Boolean, '-h': '--help', '--help': Boolean, ...args }, { permissive: false, argv: processedArgv })
  } catch (err: any) {
    if (err.name === 'ArgError')
      throw new CliError('ARGS_ARG_ERROR', i18next.t('errors.args.arg_error', { message: err.message }))
    /* istanbul ignore next */
    throw err
  }
}

export function declareArgs<T extends Args>(args: T): T {
  return args
}
