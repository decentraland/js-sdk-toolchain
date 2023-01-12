import { CliError } from './error'

type Args = { [key: string]: any }

export function main<T extends Args>(
  handlerFn: (args: T) => Promise<void>,
  errorFn?: (error: CliError) => Promise<void>
) {
  return async function handler(args: T) {
    try {
      await handlerFn(args)
    } catch (e: any) {
      // do some stuff with the CliError class...
      if (typeof errorFn === 'function') {
        await errorFn(e)
      }

      // track something?

      throw new CliError(e.message)
    }
  }
}
