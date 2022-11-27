#!/usr/bin/env node

import { createSceneConfig } from './configs'
import { RollupError, watch } from 'rollup'
import * as ts from 'typescript'
import { resolve, relative } from 'path'
import { future } from 'fp-future'
import {
  checkConfiguration,
  PackageJson,
  readPackageJson
} from './scene.checks'
import { createColors } from 'colorette'

// log to stderr to keep `rollup main.js > bundle.js` from breaking
const stderr = (...parameters: readonly unknown[]) =>
  process.stderr.write(`${parameters.join('')}\n`)

// @see https://no-color.org
// @see https://www.npmjs.com/package/chalk
const colors = createColors({
  useColor: process.env.FORCE_COLOR !== '0' && !process.env.NO_COLOR
})

const WATCH =
  process.argv.indexOf('--watch') !== -1 || process.argv.indexOf('-w') !== -1

// PRODUCTION === true : makes the compiler to prefer .min.js files while importing and produces a minified output
const PRODUCTION =
  !WATCH &&
  (process.argv.indexOf('--production') !== -1 ||
    process.env.NODE_ENV === 'production')

async function compile() {
  // current working directory
  let CWD = process.cwd()
  ts.sys.getCurrentDirectory = () => CWD
  ts.sys.resolvePath = (path: string) =>
    resolve(ts.sys.getCurrentDirectory(), path)

  {
    // Read the target folder, if specified.
    // -p --project, like typescript
    const projectArgIndex = Math.max(
      process.argv.indexOf('-p'),
      process.argv.indexOf('--project')
    )
    if (projectArgIndex !== -1 && process.argv.length > projectArgIndex) {
      const folder = resolve(process.cwd(), process.argv[projectArgIndex + 1])
      if (ts.sys.directoryExists(folder)) {
        CWD = folder
      } else {
        throw new Error(`Folder ${folder} does not exist!.`)
      }
    }
  }

  stderr('> dev mode: ' + !PRODUCTION)
  stderr(`> working directory: ${ts.sys.getCurrentDirectory()}`)

  const packageJson: PackageJson = readPackageJson()

  checkConfiguration(packageJson)

  stderr('')

  const baseConfig = createSceneConfig({ PROD: PRODUCTION })

  const finished = future<void>()

  const watcher = watch({
    ...baseConfig,
    watch: {
      clearScreen: false,
      buildDelay: 100
    },
    onwarn: (warning, defaultHandler) => {
      if (warning.plugin === 'typescript') {
        handleError(warning, true)
      } else {
        return defaultHandler(warning)
      }
    }
  })

  watcher.on('event', (event) => {
    if (event.code === 'END') {
      if (WATCH) {
        stderr('\nThe compiler is watching file changes...\n')
      } else {
        finished.resolve()
      }
    } else if (event.code === 'BUNDLE_START') {
      for (const out of event.output) {
        stderr(colors.greenBright(`Compiling: `) + out)
      }
    } else if (event.code === 'BUNDLE_END') {
      for (const out of event.output) {
        stderr(
          colors.greenBright(`Wrote: `) +
            out +
            ' ' +
            colors.dim(`(${(event.duration / 1000).toFixed(1)}sec)`)
        )
      }
    } else if (event.code === 'START') {
      if (WATCH) {
        // print blank lines until it covers the screen
        stderr('\u001B[2J')
        // clear the scrollback
        stderr('\u001b[H\u001b[2J\u001b[3J')
      }
    } else if (event.code === 'ERROR') {
      handleError(event.error, true)
    } else {
      console.dir(event)
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
    console.clear()
    /* a new run was triggered */
  })

  watcher.on('close', () => {
    finished.resolve()
  })

  await finished

  await watcher.close()
  watcher.removeAllListeners()
}

// Start the watcher
compile()
  .then(() => {
    process.exit()
  })
  .catch((e) => {
    handleError(e)
    process.exit(1)
  })

function handleError(error: RollupError, recover = false): void {
  const name = error.name || error.cause?.name
  const nameSection = name ? `${name}: ` : ''
  const pluginSection = error.plugin ? `(plugin ${error.plugin}) ` : ''
  const message = `${pluginSection}${nameSection}${error.message}`

  stderr(colors.bold(colors.red(`[!] ${colors.bold(message.toString())}`)))

  if (error.url) {
    stderr(colors.cyan(error.url))
  }

  if (error.loc) {
    stderr(
      `${relativeId((error.loc.file || error.id)!)} (${error.loc.line}:${
        error.loc.column
      })`
    )
  } else if (error.id) {
    stderr(relativeId(error.id))
  }

  if (error.frame) {
    stderr(colors.dim(error.frame))
  }

  if (error.stack && !recover) {
    stderr(colors.dim(error.stack))
  }

  stderr('')

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
