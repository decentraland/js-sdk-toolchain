// this file is tested extensively to build scenes in the `make test` command
// but since it runs outiside the testing harness, coverage is not collected

import { Scene } from '@dcl/schemas'
import child_process from 'child_process'
import esbuild from 'esbuild'
import { future } from 'fp-future'
import { readFileSync, writeFileSync } from 'fs-extra'
import { globSync } from 'glob'
import path, { dirname, join } from 'path'
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

  const dclFolderPath = path.resolve(process.cwd(), '.decentraland', 'ts-entry-points')
  try {
    await components.fs.mkdir(dclFolderPath, { recursive: true })
  } catch (err) {}

  const composites = options.ignoreComposite ? {} : getAllComposite(options)
  const hasComposites = Object.entries(composites).length > 0

  const originalInput = globSync(options.single ?? 'src/index.ts', { cwd: options.workingDirectory, absolute: true })

  const entryPoints: { src: string; dest: string }[] = []
  originalInput.forEach((filePath) => {
    const entryPointPath = path.resolve(dclFolderPath, path.basename(filePath))
    const entryPointCode = options.customEntryPoint
      ? `export * from '${filePath}'`
      : hasComposites
      ? `export * from '@dcl/sdk/with-composite'`
      : `export * from '@dcl/sdk'`

    writeFileSync(entryPointPath, entryPointCode)
    entryPoints.push({
      src: filePath,
      dest: entryPointPath
    })
  })

  const input = entryPoints.map((item) => item.dest)

  /* istanbul ignore if */
  if (!input.length) throw new CliError(`There are no input files to build: ${options.single ?? 'src/index.ts'}`)

  const output = !options.single ? sceneJson.main : options.single.replace(/\.ts$/, '.js')
  const outfile = join(options.workingDirectory, output)

  printProgressStep(
    components.logger,
    `Bundling file ${colors.bold(input.join(','))} (withComposite=${hasComposites})`,
    1,
    MAX_STEP
  )

  const context = await esbuild.context({
    entryPoints: input,
    bundle: true,
    platform: 'browser',
    format: 'cjs',
    preserveSymlinks: false,
    outfile: input.length > 1 ? undefined : outfile,
    outdir: input.length > 1 ? dirname(outfile) : undefined,
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
    sourceRoot: pathToFileURL(dirname(outfile)).toString(),
    define: {
      document: 'undefined',
      window: 'undefined',
      DEBUG: options.production ? 'false' : 'true',
      'globalThis.DEBUG': options.production ? 'false' : 'true',
      'process.env.NODE_ENV': JSON.stringify(options.production ? 'production' : 'development')
    },
    tsconfig: join(options.workingDirectory, 'tsconfig.json'),
    supported: {
      'import-assertions': false,
      'import-meta': false,
      'dynamic-import': false,
      hashbang: false
    },
    plugins: [compositeLoader(composites)]
  })

  /* istanbul ignore if */
  if (options.watch) {
    await context.watch({})

    printProgressInfo(components.logger, `Bundle saved ${colors.bold(output)}`)
  } else {
    try {
      const ctx = await context.rebuild()
      printProgressInfo(
        components.logger,
        `Bundle saved ${colors.bold(
          Object.keys(ctx.metafile.outputs)
            .filter((_) => _.endsWith('.js'))
            .join(',') || outfile
        )}`
      )
    } catch (err: any) {
      /* istanbul ignore next */
      throw new CliError(err.toString())
    }
    await context.dispose()
  }

  /* istanbul ignore next */
  if (options.watch) printProgressInfo(components.logger, `The compiler is watching for changes`)

  await runTypeChecker(components, options)

  return { context, sceneJson }
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

function compositeLoader(composites: Record<string, Uint8Array>): esbuild.Plugin {
  const compositeLines: string[] = []

  for (const compositeName in composites) {
    const bin = composites[compositeName]
    if (compositeName.endsWith('.bin')) {
      compositeLines.push(`'${compositeName}':new Uint8Array(${JSON.stringify(Array.from(bin))})`)
    } else {
      const textDecoder = new TextDecoder()
      const json = JSON.stringify(JSON.parse(textDecoder.decode(bin)))
      compositeLines.push(`'${compositeName}':'${json}'`)
    }
  }

  const contents = `export const compositeFromLoader = {${compositeLines.join(',')}}`
  return {
    name: 'composite-loader',
    setup(build) {
      build.onResolve({ filter: /~sdk\/all-composites/ }, (_args) => {
        return {
          namespace: 'sdk-composite',
          path: 'all-composites'
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'sdk-composite' }, (_args) => {
        return {
          loader: 'js',
          contents
        }
      })
    }
  }
}
function getAllComposite(options: CompileOptions): Record<string, Uint8Array> {
  const ret: Record<string, Uint8Array> = {}
  const files = globSync('**/*.{composite,composite.bin}', { cwd: options.workingDirectory })

  for (const file of files) {
    ret[file] = readFileSync(file)
  }
  return ret
}
