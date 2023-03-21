import arg, { Result } from 'arg'

export type Args = {
  [key: string]: string | StringConstructor | NumberConstructor | BooleanConstructor
}

// updating to TS 4.9 will prevent losing types when
// enforcing type to be "Args" by using "satisfies Args"
export const DEFAULT_ARGS = {
  '--help': Boolean,
  '--json': Boolean,
  '-h': '--help'
}

export function getArgs(): Result<typeof DEFAULT_ARGS>
export function getArgs<T extends Args>(args: T): Result<typeof DEFAULT_ARGS & T>
export function getArgs<T extends Args>(args?: T) {
  return arg({ ...DEFAULT_ARGS, ...args }, { permissive: true })
}

export function getArgsUsed(value: Result<typeof DEFAULT_ARGS>): Record<string, unknown> {
  const { _, ...args } = value
  return args
}
