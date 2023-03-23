import { createSceneConfig } from './configs'
import { RollupError, RollupWatcher, watch } from 'rollup'
import * as ts from 'typescript'
import { resolve, relative } from 'path'
import { future, IFuture } from 'fp-future'
import { checkConfiguration } from './scene.checks'
import { createColors } from 'colorette'

// log to stderr to keep `rollup main.js > bundle.js` from breaking
export const writeToStderr = (...parameters: readonly unknown[]) => process.stderr.write(`${parameters.join('')}\n`)

// @see https://no-color.org
// @see https://www.npmjs.com/package/chalk
const colors = createColors({
  useColor: process.env.FORCE_COLOR !== '0' && !process.env.NO_COLOR
})

export type CompileOptions = {
  production: boolean
  watch: boolean
  // build a single .ts file
  single?: string
  // build a project folder
  project?: string
  // this future will be resolved after the first compilation in watch mode
  watchingFuture?: IFuture<RollupWatcher>
}

/**
 * NOTE: this function resolves immediately in watch mode, and it waits for
 * completion on normal mode.
 */
export async function compile(options: CompileOptions) {
  // current working directory
  let CWD = process.cwd()

  // Read the target folder, if specified.
  // -p --project, like typescript
  if (options.project) {
    const folder = resolve(process.cwd(), options.project)
    if (ts.sys.directoryExists(folder)) {
      CWD = folder
    } else {
      throw new Error(`Folder ${folder} does not exist!.`)
    }
  }

  ts.sys.getCurrentDirectory = () => CWD
  ts.sys.resolvePath = (path: string) => resolve(ts.sys.getCurrentDirectory(), path)

  writeToStderr(colors.greenBright('Mode: ') + (options.production ? 'Production (optimized)' : 'Development'))
  writeToStderr(colors.greenBright(`Working directory: `) + ts.sys.getCurrentDirectory())

  checkConfiguration()

  const baseConfig = createSceneConfig({
    PROD: options.production,
    single: options.single
  })

  const finished = future<void>()

  let hasErrors = false

  const watcher = watch({
    ...baseConfig,
    watch: {
      clearScreen: false,
      buildDelay: 100
    },
    onwarn: (warning, defaultHandler) => {
      if (warning.plugin === 'typescript') {
        handleRollupError(warning, true)
        hasErrors = true
      } else {
        return defaultHandler(warning)
      }
    }
  })

  watcher.on('event', (event) => {
    if (event.code === 'END') {
      if (options.watchingFuture?.isPending) {
        options.watchingFuture.resolve(watcher)
      }
      if (options.watch) {
        writeToStderr('\nThe compiler is watching file changes...\n')
      } else {
        finished.resolve()
      }
    } else if (event.code === 'BUNDLE_START') {
      for (const out of event.output) {
        writeToStderr(colors.greenBright(`Creating bundle: `) + out)
      }
    } else if (event.code === 'BUNDLE_END') {
      for (const out of event.output) {
        writeToStderr(
          colors.greenBright(`Wrote: `) + out + ' ' + colors.dim(`(${(event.duration / 1000).toFixed(1)}sec)`)
        )
      }
    } else if (event.code === 'START') {
      if (options.watch) {
        // print blank lines until it covers the screen
        writeToStderr('\u001B[2J')
        // clear the scrollback
        writeToStderr('\u001b[H\u001b[2J\u001b[3J')
      }
    } else if (event.code === 'ERROR') {
      handleRollupError(event.error, true)
    } else {
      writeToStderr(JSON.stringify(event))
    }
    // event.code can be one of:
    //   START        — the watcher is (re)starting
    //   BUNDLE_START — building an individual bundle
    //                  * event.input will be the input options object if present
    //                  * event.output contains an array of the "file" or
    //                    "dir" option values of the generated outputs
    //   BUNDLE_END   — finished building a bundle
    //                  * event.input will be the input options object if present
    //                  * event.output contains an array of the "file" or
    //                    "dir" option values of the generated outputs
    //                  * event.duration is the build duration in milliseconds
    //                  * event.result contains the bundle object that can be
    //                    used to generate additional outputs by calling
    //                    bundle.generate or bundle.write. This is especially
    //                    important when the watch.skipWrite option is used.
    //                  You should call "event.result.close()" once you are done
    //                  generating outputs, or if you do not generate outputs.
    //                  This will allow plugins to clean up resources via the
    //                  "closeBundle" hook.
    //   END          — finished building all bundles
    //   ERROR        — encountered an error while bundling
    //                  * event.error contains the error that was thrown
    //                  * event.result is null for build errors and contains the
    //                    bundle object for output generation errors. As with
    //                    "BUNDLE_END", you should call "event.result.close()" if
    //                    present once you are done.
    // If you return a Promise from your event handler, Rollup will wait until the
    // Promise is resolved before continuing.
  })

  // This will make sure that bundles are properly closed after each run
  watcher.on('event', async (t) => {
    if ('result' in t) {
      await t.result?.close()
    }
  })

  // // Additionally, you can hook into the following. Again, return a Promise to
  // // make Rollup wait at that stage:
  // watcher.on('change', (e) => {
  //   console.dir({ change: e })
  //   /* a file was modified */
  // })
  watcher.on('restart', () => {
    /* a new run was triggered */
  })

  watcher.on('close', () => {
    finished.resolve()
  })

  if (options.watch) {
    // close the watcher on unix signals
    process.on('SIGTERM', () => {
      void watcher.close()
    })
    // close the watcher on unix signals
    process.on('SIGHUP', () => {
      void watcher.close()
    })
  } else {
    await finished

    if (hasErrors) process.exitCode = 1

    await watcher.close()
    watcher.removeAllListeners()
  }

  return watcher
}

export function handleRollupError(error: RollupError, recover = false): void {
  const name = error.name || (error.cause as any)?.name
  const nameSection = name ? `${name}: ` : ''
  const pluginSection = error.plugin ? `(plugin ${error.plugin}) ` : ''
  const message = `${pluginSection}${nameSection}${error.message}`

  writeToStderr(colors.bold(colors.red(`[!] ${colors.bold(message.toString())}`)))

  if (error.url) {
    writeToStderr(colors.cyan(error.url))
  }

  if (error.loc) {
    writeToStderr(`${relativeId((error.loc.file || error.id)!)} (${error.loc.line}:${error.loc.column})`)
  } else if (error.id) {
    writeToStderr(relativeId(error.id))
  }

  if (error.frame) {
    writeToStderr(colors.dim(error.frame))
  }

  if (error.stack && !recover) {
    writeToStderr(colors.dim(error.stack))
  }

  writeToStderr('')

  if (!recover) process.exit(1)
}

const ABSOLUTE_PATH_REGEX = /^(?:\/|(?:[A-Za-z]:)?[/\\|])/

function isAbsolute(path: string): boolean {
  return ABSOLUTE_PATH_REGEX.test(path)
}

function relativeId(id: string): string {
  if (!isAbsolute(id)) return id
  return relative(resolve(), id)
}
