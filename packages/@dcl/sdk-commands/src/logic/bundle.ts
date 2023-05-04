// this file is tested extensively to build scenes in the `make test` command
// but since it runs outiside the testing harness, coverage is not collected

import { Scene } from '@dcl/schemas'
import child_process from 'child_process'
import esbuild from 'esbuild'
import { future } from 'fp-future'
import { globSync } from 'glob'
import { basename, dirname, join } from 'path'
import { pathToFileURL } from 'url'
import { CliComponents } from '../components'
import { colors } from '../components/log'
import { printProgressInfo, printProgressStep } from './beautiful-logs'
import { CliError } from './error'

export type BundleComponents = Pick<CliComponents, 'logger' | 'fs'>

export type SceneJson = {
  main: string
  runtimeVersion: string
}

export type CompileOptions = {
  production: boolean
  watch: boolean

  // build a single .ts file
  single?: string

  // build a project folder
  workingDirectory: string

  // emit typescript declarations
  emitDeclaration: boolean

  ignoreComposite: boolean
  customEntryPoint: boolean
}

const MAX_STEP = 2

/**
 * Generate the entry-point code for a given original entry-point
 * @param entrypointPath - file to be imported as original entry point
 * @param forceCustomExport
 * @returns the Typescript code
 */

function getEntrypointCode(entrypointPath: string, forceCustomExport: boolean) {
  if (forceCustomExport) return `export * from '${entrypointPath}'`

  return `// BEGIN AUTO GENERATED CODE "~sdk/scene-entrypoint"
import * as entrypoint from '${entrypointPath}'
import { engine } from '@dcl/sdk/ecs'
import * as sdk from '@dcl/sdk'

if ((entrypoint as any).main !== undefined) {
  async function _INTERNAL_startup_system() {
    await (entrypoint as any).main()
    engine.removeSystem(_INTERNAL_startup_system)
  }
  engine.addSystem(_INTERNAL_startup_system, Infinity)
}

export * from '@dcl/sdk'
export * from '${entrypointPath}'
`
}

export async function bundleProject(components: BundleComponents, options: CompileOptions, sceneJson: Scene) {
  const tsconfig = join(options.workingDirectory, 'tsconfig.json')

  /* istanbul ignore if */
  if (!options.single && !sceneJson.main) {
    throw new CliError('scene.json .main must be present')
  }

  /* istanbul ignore if */
  if ((sceneJson as any).runtimeVersion !== '7') {
    throw new CliError('scene.json `"runtimeVersion": "7"` must be present')
  }

  /* istanbul ignore if */
  if (!(await components.fs.fileExists(tsconfig))) {
    throw new CliError(`File ${tsconfig} must exist to compile the Typescript project`)
  }

  const entrypointSource = options.single ?? 'src/index.ts'
  const entrypoints = globSync(entrypointSource, { cwd: options.workingDirectory, absolute: true })

  /* istanbul ignore if */
  if (!entrypoints.length) throw new CliError(`There are no input files to build: ${entrypointSource}`)

  const inputs: { entrypoint: string; outputFile: string }[] = options.single
    ? entrypoints.map((entrypoint) => ({ entrypoint, outputFile: entrypoint.replace(/\.ts$/, '.js') }))
    : [{ entrypoint: entrypoints[0], outputFile: sceneJson.main }]

  for (const input of inputs) {
    await bundleSingleProject(components, {
      ...options,
      tsconfig,
      ...input
    })
  }

  return { sceneJson, inputs }
}

type SingleProjectOptions = CompileOptions & {
  tsconfig: string
  entrypoint: string
  outputFile: string
}

export async function bundleSingleProject(components: BundleComponents, options: SingleProjectOptions) {
  printProgressStep(components.logger, `Bundling file ${colors.bold(options.entrypoint)}`, 1, MAX_STEP)

  const context = await esbuild.context({
    bundle: true,
    platform: 'browser',
    format: 'cjs',
    preserveSymlinks: false,
    outfile: options.outputFile,
    allowOverwrite: false,
    sourcemap: options.production ? 'external' : 'inline',
    minify: options.production,
    minifyIdentifiers: options.production,
    minifySyntax: options.production,
    minifyWhitespace: options.production,
    treeShaking: true,
    metafile: true,
    absWorkingDir: options.workingDirectory,
    target: 'es2020',
    external: ['~system/*', '@dcl/inspector', '@dcl/inspector/*' /* ban importing the inspector from the SDK */],
    // convert filesystem paths into file:// to enable VSCode debugger
    sourceRoot: pathToFileURL(dirname(options.outputFile)).toString(),
    define: {
      document: 'undefined',
      window: 'undefined',
      DEBUG: options.production ? 'false' : 'true',
      'globalThis.DEBUG': options.production ? 'false' : 'true',
      'process.env.NODE_ENV': JSON.stringify(options.production ? 'production' : 'development')
    },
    tsconfig: options.tsconfig,
    supported: {
      'import-assertions': false,
      'import-meta': false,
      'dynamic-import': false,
      hashbang: false
    },
    logOverride: {
      'import-is-undefined': 'silent'
    },
    plugins: [compositeLoader(components, options)],
    stdin: {
      contents: getEntrypointCode(options.entrypoint, options.customEntryPoint),
      resolveDir: dirname(options.entrypoint),
      sourcefile: basename(options.entrypoint) + '.entry-point.ts',
      loader: 'ts'
    }
  })

  /* istanbul ignore if */
  if (options.watch) {
    await context.watch({})

    printProgressInfo(components.logger, `Bundle saved ${colors.bold(options.outputFile)}`)
  } else {
    try {
      await context.rebuild()
      printProgressInfo(components.logger, `Bundle saved ${colors.bold(options.outputFile)}`)
    } catch (err: any) {
      /* istanbul ignore next */
      throw new CliError(err.toString())
    }
    await context.dispose()
  }

  /* istanbul ignore next */
  if (options.watch) printProgressInfo(components.logger, `The compiler is watching for changes`)

  await runTypeChecker(components, options)
}

function runTypeChecker(components: BundleComponents, options: CompileOptions) {
  const args = [
    require.resolve('typescript/lib/tsc'),
    '-p',
    'tsconfig.json',
    '--preserveWatchOutput',
    options.emitDeclaration ? '--emitDeclarationOnly' : '--noEmit'
  ]

  /* istanbul ignore if */
  if (options.watch) args.push('--watch')

  printProgressStep(components.logger, `Running type checker`, 2, MAX_STEP)
  const ts = child_process.spawn('node', args, { env: process.env, cwd: options.workingDirectory })
  const typeCheckerFuture = future<number>()

  ts.on('close', (code) => {
    /* istanbul ignore else */
    if (code === 0) {
      printProgressInfo(components.logger, `Type checking completed without errors`)
    } else {
      typeCheckerFuture.reject(new CliError(`Typechecker exited with code ${code}.`))
      return
    }

    typeCheckerFuture.resolve(code)
  })

  ts.stdout.pipe(process.stdout)
  ts.stderr.pipe(process.stderr)

  /* istanbul ignore if */
  if (options.watch) {
    typeCheckerFuture.resolve(-1)
  }

  return typeCheckerFuture
}

function compositeLoader(components: BundleComponents, options: SingleProjectOptions): esbuild.Plugin {
  let shouldReload = true
  let contents = `export const compositeFromLoader = {}` // default exports nothing
  let watchFiles: string[] = [] // no files to watch

  return {
    name: 'composite-loader',
    setup(build) {
      build.onStart(() => {
        shouldReload = true
      })
      build.onResolve({ filter: /~sdk\/all-composites/ }, (_args) => {
        return {
          namespace: 'sdk-composite',
          path: 'all-composites'
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'sdk-composite' }, async (_) => {
        if (shouldReload) {
          if (!options.ignoreComposite) {
            const data = await getAllComposite(components, options)
            contents = `export const compositeFromLoader = {${data.compositeLines.join(',')}}`
            watchFiles = data.watchFiles
          }
          shouldReload = false
        }

        return {
          loader: 'js',
          contents,
          watchFiles
        }
      })
    }
  }
}

async function getAllComposite(
  components: BundleComponents,
  options: CompileOptions
): Promise<{ watchFiles: string[]; compositeLines: string[] }> {
  const composites: Record<string, Uint8Array> = {}
  const files = globSync('**/*.{composite,composite.bin}', { cwd: options.workingDirectory })

  for (const file of files) {
    composites[file] = await components.fs.readFile(file)
  }

  const watchFiles = Object.keys(composites)
  const compositeLines: string[] = []

  for (const compositeName in composites) {
    const bin = composites[compositeName]
    if (compositeName.endsWith('.bin')) {
      compositeLines.push(`'${compositeName}':new Uint8Array(${JSON.stringify(Array.from(bin))})`)
    } else {
      const textDecoder = new TextDecoder()
      const json = JSON.stringify(JSON.parse(textDecoder.decode(bin)))
      compositeLines.push(`'${compositeName}':${JSON.stringify(json)}`)
    }
  }

  return { compositeLines, watchFiles }
}
