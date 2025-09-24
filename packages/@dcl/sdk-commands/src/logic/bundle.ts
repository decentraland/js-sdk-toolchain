// this file is tested extensively to build scenes in the `make test` command
// but since it runs outiside the testing harness, coverage is not collected

import { Scene } from '@dcl/schemas'
import child_process from 'child_process'
import esbuild from 'esbuild'
import { future } from 'fp-future'
import { globSync } from 'glob'
import path from 'path'
import { pathToFileURL } from 'url'
import i18next from 'i18next'

import { CliComponents } from '../components'
import { colors } from '../components/log'
import { printProgressInfo, printProgressStep, printWarning } from './beautiful-logs'
import { CliError } from './error'
import { getAllComposites } from './composite'
import { isEditorScene } from './project-validations'
import { watch } from 'chokidar'
import { debounce } from './debounce'

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

  // check if scene uses syncEntity
  checkMultiplayerScene?: boolean
}

const MAX_STEP = 2

/**
 * Generate the entry-point code for a given original entry-point
 * @param entrypointPath - file to be imported as original entry point
 * @param forceCustomExport
 * @returns the Typescript code
 */

function getEntrypointCode(
  entrypointPath: string,
  forceCustomExport: boolean,
  isEditorScene: boolean,
  hasNetworkComponent: boolean
) {
  const unixEntrypointPath = entrypointPath.replace(/(\\)/g, '/')
  if (forceCustomExport) return `;"use strict";export * from '${unixEntrypointPath}'`

  // Check if we need to include syncEntity
  const needsSyncEntity = isEditorScene && hasNetworkComponent

  return `// BEGIN AUTO GENERATED CODE "~sdk/scene-entrypoint"
"use strict";
import * as entrypoint from '${unixEntrypointPath}'
import { engine } from '@dcl/sdk/ecs'

// Include @dcl/asset-packs init if its an editor scene.
${
  isEditorScene &&
  `
${needsSyncEntity ? "import { syncEntity } from '@dcl/sdk/network'" : '// No NetworkEntity found in main.composite'}
import players from '@dcl/sdk/players'
import { initAssetPacks } from '@dcl/asset-packs/dist/scene-entrypoint'
initAssetPacks(engine, ${needsSyncEntity ? '{ syncEntity }' : '{}'}, players)
`
}

if ((entrypoint as any).main !== undefined) {
  function _INTERNAL_startup_system() {
    try {
      const maybePromise = (entrypoint as any).main()
      if (maybePromise && typeof maybePromise === 'object' && typeof (maybePromise as unknown as Promise<unknown>).then === 'function') {
        maybePromise.catch(console.error)
      }
    } catch (e) {
     console.error(e)
    } finally {
      engine.removeSystem(_INTERNAL_startup_system)
    }
  }
  engine.addSystem(_INTERNAL_startup_system, Infinity)
}

export * from '@dcl/sdk'
export * from '${unixEntrypointPath}'
`
}

// Function to check if NetworkEntity exists in main.composite
async function hasNetworkEntity(fs: BundleComponents['fs'], workingDirectory = process.cwd()) {
  try {
    // Check if main.composite exists in working directory
    let mainCompositePath = path.join(workingDirectory, 'main.composite')
    if (!(await fs.fileExists(mainCompositePath))) {
      // Also check in the scene/assets directory which is another common location
      const altPath = path.join(workingDirectory, 'assets', 'scene', 'main.composite')
      if (!(await fs.fileExists(altPath))) {
        return false
      }
      mainCompositePath = altPath
    }

    // Read and parse the composite file
    const content = await fs.readFile(mainCompositePath, 'utf-8')
    const compositeJson = JSON.parse(content)

    // Check if the NetworkEntity component exists
    // The component name is 'core-schema::Network-Entity'
    if (compositeJson && compositeJson.components) {
      for (const component of compositeJson.components) {
        if (component.name === 'core-schema::Network-Entity') {
          return true
        }
      }
    }

    return false
  } catch (error) {
    // If there's any error reading or parsing the file, assume no NetworkEntity
    return false
  }
}

export async function bundleProject(components: BundleComponents, options: CompileOptions, sceneJson: Scene) {
  const tsconfig = path.join(options.workingDirectory, 'tsconfig.json')
  /* istanbul ignore if */
  if (!options.single && !sceneJson.main) {
    throw new CliError('BUNDLE_SCENE_MAIN_REQUIRED', i18next.t('errors.bundle.scene_main_required'))
  }

  /* istanbul ignore if */
  if ((sceneJson as any).runtimeVersion !== '7') {
    throw new CliError(
      'BUNDLE_SCENE_RUNTIME_VERSION_REQUIRED',
      i18next.t('errors.bundle.scene_runtime_version_required')
    )
  }

  /* istanbul ignore if */
  if (!(await components.fs.fileExists(tsconfig))) {
    throw new CliError('BUNDLE_TSCONFIG_REQUIRED', i18next.t('errors.bundle.tsconfig_required', { tsconfig }))
  }

  const entrypointSource = options.single ?? 'src/index.ts'
  const entrypoints = globSync(entrypointSource, { cwd: options.workingDirectory, absolute: true })

  /* istanbul ignore if */
  if (!entrypoints.length)
    throw new CliError('BUNDLE_NO_INPUT_FILES', i18next.t('errors.bundle.no_input_files', { entrypointSource }))

  // const output = !options.single ? sceneJson.main : options.single.replace(/\.ts$/, '.js')
  // const outfile = path.join(options.workingDirectory, output)
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
  const editorScene = await isEditorScene(components, options.workingDirectory)
  const networkEntityInComposite = editorScene && (await hasNetworkEntity(components.fs, options.workingDirectory))

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
    alias: {
      // Ensure React is always resolved to the same module to prevent duplication
      react: (() => {
        try {
          // First try to resolve from project's node_modules
          return require.resolve('react', { paths: [options.workingDirectory] })
        } catch {
          try {
            // Fallback to SDK's React dependency
            return require.resolve('react', { paths: [path.join(__dirname, '../../../@dcl/sdk')] })
          } catch {
            // Final fallback to bundled React
            return require.resolve('react')
          }
        }
      })()
    },
    // convert filesystem paths into file:// to enable VSCode debugger
    sourceRoot: options.production ? 'dcl:///' : pathToFileURL(path.dirname(options.outputFile)).toString(),
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
      contents: getEntrypointCode(options.entrypoint, options.customEntryPoint, editorScene, networkEntityInComposite),
      resolveDir: path.dirname(options.entrypoint),
      sourcefile: path.basename(options.entrypoint) + '.entry-point.ts',
      loader: 'ts'
    }
  })

  /* istanbul ignore if */
  if (options.watch) {
    // Instead of using esbuild's watch, we create our own watcher
    const watcher = watch(path.resolve(options.workingDirectory), {
      ignored: ['**/dist/**', '**/*.crdt', '**/*.composite', path.resolve(options.outputFile)],
      ignoreInitial: true
    })

    const debouncedRebuild = debounce(async () => {
      try {
        await context.rebuild()
        printProgressInfo(components.logger, `Bundle saved ${colors.bold(options.outputFile)}`)
      } catch (err: any) {
        /* istanbul ignore next */
        components.logger.error(err.toString())
      }
    }, 100)

    watcher.on('all', async (event, filePath) => {
      // Only rebuild for TypeScript and JavaScript files
      if (/\.(ts|tsx|js|jsx)$/.test(filePath)) {
        printProgressInfo(components.logger, `File ${filePath} changed, rebuilding...`)
        debouncedRebuild()
      }
    })

    // Do initial build
    await context.rebuild()
    printProgressInfo(components.logger, `Bundle saved ${colors.bold(options.outputFile)}`)
    printProgressInfo(components.logger, `The compiler is watching for changes`)
  } else {
    try {
      const result = await context.rebuild()
      printProgressInfo(components.logger, `Bundle saved ${colors.bold(options.outputFile)}`)

      // Check for syncEntity in metafile if requested
      if (options.checkMultiplayerScene && result.metafile) {
        const isMultiplayer = networkEntityInComposite || (await isMultiplayerScene(components.fs, result.metafile))
        printProgressInfo(components.logger, isMultiplayer ? 'Multiplayer Scene' : 'Single player scene')

        // Update scene.json with multiplayer property
        await updateSceneJsonMultiplayerProperty(components, options.workingDirectory, isMultiplayer)
      }
    } catch (err: any) {
      /* istanbul ignore next */
      throw new CliError('BUNDLE_REBUILD_FAILED', i18next.t('errors.bundle.rebuild_failed', { error: err.toString() }))
    }
    await context.dispose()
  }

  /* istanbul ignore next */
  if (options.watch) printProgressInfo(components.logger, `The compiler is watching for changes`)

  await runTypeChecker(components, options)
}

/**
 * Determines if a scene is multiplayer based on code analysis and composite files
 * @param metafile - The esbuild metafile
 * @param workingDirectory - Path to the working directory
 * @returns boolean indicating if it's a multiplayer scene
 */
async function isMultiplayerScene(fs: BundleComponents['fs'], metafile: esbuild.Metafile): Promise<boolean> {
  // Then check all inputs in the metafile for syncEntity imports
  for (const [path, info] of Object.entries(metafile.inputs)) {
    // Check if this file imports from @dcl/sdk/network
    const networkImport = info.imports?.find((imp) => imp.path.includes('@dcl/sdk/network'))

    if (networkImport) {
      // Check if it imports syncEntity specifically
      try {
        const content = await fs.readFile(path, 'utf-8')
        if (
          content.includes('syncEntity') &&
          /import.*\{.*syncEntity.*\}.*from.*['"]@dcl\/sdk\/network['"]/.test(content)
        ) {
          return true
        }
      } catch (e) {
        // If we can't read the file, we assume it might be using syncEntity
        return true
      }
    }
  }

  return false
}

function runTypeChecker(components: BundleComponents, options: CompileOptions) {
  const tsBin = require.resolve('typescript/lib/tsc')
  const args = [
    '-p',
    'tsconfig.json',
    '--preserveWatchOutput',
    options.emitDeclaration ? '--emitDeclarationOnly' : '--noEmit'
  ]

  /* istanbul ignore if */
  if (options.watch) args.push('--watch')

  printProgressStep(components.logger, `Running type checker`, 2, MAX_STEP)
  const ts = child_process.fork(tsBin, args, {
    stdio: 'pipe',
    env: process.env,
    cwd: options.workingDirectory
  })
  const typeCheckerFuture = future<number>()

  ts.on('close', (code) => {
    /* istanbul ignore else */
    if (code === 0) {
      printProgressInfo(components.logger, `Type checking completed without errors`)
    } else {
      typeCheckerFuture.reject(
        new CliError('BUNDLE_TYPE_CHECKER_FAILED', i18next.t('errors.bundle.type_checker_failed', { code }))
      )
      return
    }

    typeCheckerFuture.resolve(code)
  })

  ts.stdout?.pipe(process.stdout)
  ts.stderr?.pipe(process.stderr)

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
  let lastBuiltSuccessful = false

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
            const data = await getAllComposites(
              components,
              // we pass the build.initialOptions.absWorkingDir to build projects with multiple roots at once
              build.initialOptions.absWorkingDir ?? options.workingDirectory
            )
            contents = `export const compositeFromLoader = {${data.compositeLines.join(',')}}`
            watchFiles = data.watchFiles

            if (data.withErrors) {
              printWarning(
                components.logger,
                'Some composites are not included because of errors while compiling them. There can be unexpected behavior in the scene, check the errors and try to fix them.'
              )
            } else if (!lastBuiltSuccessful) {
            }
            lastBuiltSuccessful = !data.withErrors
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

/**
 * Updates the scene.json file with the multiplayer property
 * @param components - CLI components
 * @param workingDirectory - Path to the working directory
 * @param isMultiplayer - Whether the scene is multiplayer
 */
async function updateSceneJsonMultiplayerProperty(
  components: BundleComponents,
  workingDirectory: string,
  isMultiplayer: boolean
): Promise<void> {
  try {
    const sceneJsonPath = path.join(workingDirectory, 'scene.json')

    // Check if scene.json exists
    if (await components.fs.fileExists(sceneJsonPath)) {
      // Read current scene.json
      const sceneJsonContent = await components.fs.readFile(sceneJsonPath)
      const sceneJson = JSON.parse(sceneJsonContent.toString('utf-8'))

      // Update multiplayer property
      if (sceneJson.multiplayer !== isMultiplayer) {
        sceneJson.multiplayer = isMultiplayer

        // Write updated scene.json
        await components.fs.writeFile(sceneJsonPath, Buffer.from(JSON.stringify(sceneJson, null, 2), 'utf-8'))

        printProgressInfo(components.logger, `Updated scene.json with multiplayer: ${isMultiplayer}`)
      }
    } else {
      printWarning(components.logger, 'Cannot update scene.json: file not found')
    }
  } catch (error) {
    printWarning(components.logger, `Failed to update scene.json: ${error}`)
  }
}
