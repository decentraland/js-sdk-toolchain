// this file is tested extensively to build scenes in the `make test` command
// but since it runs outiside the testing harness, coverage is not collected

/* istanbul ignore file */

import esbuild from 'esbuild'
import child_process from 'child_process'
import { future } from 'fp-future'
import { CliComponents } from '../components'
import { CliError } from './error'
import { getValidSceneJson } from './scene-validations'
import { join, dirname } from 'path'
import { printProgressInfo, printProgressStep } from './beautiful-logs'
import { colors } from '../components/log'
import { pathToFileURL } from 'url'

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
}

const MAX_STEP = 3

export async function bundleProject(components: BundleComponents, options: CompileOptions) {
  const sceneJson = await getValidSceneJson(components, options.workingDirectory)
  const tsconfig = join(options.workingDirectory, 'tsconfig.json')

  printProgressStep(components.logger, `Validating project structure`, 1, MAX_STEP)

  if (!options.single && !sceneJson.main) {
    throw new CliError('scene.json .main must be present')
  }

  if ((sceneJson as any).runtimeVersion !== '7') {
    throw new CliError('scene.json `"runtimeVersion": "7"` must be present')
  }

  if (!(await components.fs.fileExists(tsconfig))) {
    throw new CliError(`File ${tsconfig} must exist to compile the Typescript project`)
  }

  const input = options.single ?? 'src/index.ts'
  const output = !options.single ? sceneJson.main : options.single.replace(/\.ts$/, '.js')
  const outfile = join(options.workingDirectory, output)

  printProgressStep(components.logger, `Bundling file ${colors.bold(input)}`, 2, MAX_STEP)

  const context = await esbuild.context({
    entryPoints: [input],
    bundle: true,
    platform: 'browser',
    format: 'cjs',
    preserveSymlinks: false,
    outfile,
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
    external: ['~system/*'],
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
    }
  })

  if (options.watch) {
    await context.watch({})
  } else {
    try {
      await context.rebuild()
    } catch (err: any) {
      throw new CliError(err.toString())
    }
    await context.dispose()
  }

  printProgressInfo(components.logger, `Bundle saved ${colors.bold(output)}`)

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
  if (options.watch) args.push('--watch')

  printProgressStep(components.logger, `Running type checker`, 3, MAX_STEP)
  const ts = child_process.spawn('node', args, { env: process.env, cwd: options.workingDirectory })
  const typeCheckerFuture = future<number>()

  ts.on('close', (code) => {
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

  if (options.watch) {
    typeCheckerFuture.resolve(-1)
  }

  return typeCheckerFuture
}
