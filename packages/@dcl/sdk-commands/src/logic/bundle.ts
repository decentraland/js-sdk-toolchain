import esbuild from 'esbuild'
import child_process from 'child_process'
import { future } from 'fp-future'
import { CliComponents } from '../components'
import { CliError } from './error'
import { getValidSceneJson } from './scene-validations'
import { dirname, join } from 'path'

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
}

export async function bundleProject(components: BundleComponents, options: CompileOptions) {
  const sceneJson = await getValidSceneJson(components, options.workingDirectory)

  if (!options.single && !sceneJson.main) {
    throw new CliError('scene.json .main must be present')
  }
  if ((sceneJson as any).runtimeVersion !== '7') {
    throw new CliError('scene.json `"runtimeVersion": "7"` must be present')
  }

  const out = !options.single ? sceneJson.main : join(dirname(sceneJson.main), options.single.replace(/\.ts$/, '.js'))

  const context = await esbuild.context({
    entryPoints: [options.single ?? 'src/index.ts'],
    bundle: true,
    platform: 'browser',
    format: 'cjs',
    preserveSymlinks: true,
    outfile: join(options.workingDirectory, out),
    allowOverwrite: false,
    sourcemap: options.production ? 'external' : 'inline',
    minify: options.production,
    treeShaking: options.production,
    absWorkingDir: options.workingDirectory,
    target: 'es2020',
    external: ['~system/*'],
    define: {
      document: 'undefined',
      window: 'undefined',
      DEBUG: options.production ? 'false' : 'true',
      'globalThis.DEBUG': options.production ? 'false' : 'true',
      'process.env.NODE_ENV': JSON.stringify(options.production ? 'production' : 'development')
    }
  })

  if (options.watch) {
    await context.watch({})
  } else {
    components.logger.info(`> Building file ${options.single ?? 'src/index.ts'} in folder ${options.workingDirectory}`)
    const t = await context.rebuild()
    await context.dispose()
    console.dir(t)
    components.logger.info(`> Bundle emitted to ${out}`)
  }

  await runTypeChecker(components, options)

  return { context, sceneJson }
}

function runTypeChecker(components: BundleComponents, options: CompileOptions) {
  const args = [require.resolve('typescript/lib/tsc'), '-p', 'tsconfig.json']
  if (options.watch) args.push('--watch')

  components.logger.info('> Running typechecker')
  const ts = child_process.spawn('node', args, { env: process.env, cwd: options.workingDirectory })
  const typeCheckerFuture = future<number>()

  ts.on('close', (code) => {
    if (code === 0) {
      components.logger.debug('  Type checker completed succesfully')
    } else {
      typeCheckerFuture.reject(new Error(`Typechecker exited with code ${code}.`))
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
