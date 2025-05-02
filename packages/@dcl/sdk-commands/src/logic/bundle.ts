// this file is tested extensively to build scenes in the `make test` command
// but since it runs outiside the testing harness, coverage is not collected

import { Scene } from '@dcl/schemas'
import child_process from 'child_process'
import esbuild from 'esbuild'
import { future } from 'fp-future'
import { globSync } from 'glob'
import path from 'path'
import { pathToFileURL } from 'url'
import { CliComponents } from '../components'
import { colors } from '../components/log'
import { printProgressInfo, printProgressStep, printWarning } from './beautiful-logs'
import { CliError } from './error'
import { getAllComposites } from './composite'
import { isEditorScene } from './project-validations'
import fs from 'fs'

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
  isEditorScene: boolean = false,
  workingDirectory: string
) {
  const unixEntrypointPath = entrypointPath.replace(/(\\)/g, '/')
  if (forceCustomExport) return `;"use strict";export * from '${unixEntrypointPath}'`

  // Check if we need to include syncEntity
  const needsSyncEntity = isEditorScene && hasNetworkEntity(workingDirectory)

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
function hasNetworkEntity(workingDirectory = process.cwd()) {
  try {
    // Check if main.composite exists in working directory
    let mainCompositePath = path.join(workingDirectory, 'main.composite')
    if (!fs.existsSync(mainCompositePath)) {
      // Also check in the scene/assets directory which is another common location
      const altPath = path.join(workingDirectory, 'assets', 'scene', 'main.composite')
      if (!fs.existsSync(altPath)) {
        return false
      }
      mainCompositePath = altPath
    }

    // Read and parse the composite file
    const content = fs.readFileSync(mainCompositePath, 'utf-8')
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
      contents: getEntrypointCode(options.entrypoint, options.customEntryPoint, editorScene, options.workingDirectory),
      resolveDir: path.dirname(options.entrypoint),
      sourcefile: path.basename(options.entrypoint) + '.entry-point.ts',
      loader: 'ts'
    }
  })

  /* istanbul ignore if */
  if (options.watch) {
    await context.watch({})

    printProgressInfo(components.logger, `Bundle saved ${colors.bold(options.outputFile)}`)
  } else {
    try {
      const result = await context.rebuild()
      printProgressInfo(components.logger, `Bundle saved ${colors.bold(options.outputFile)}`)

      // Check for syncEntity in metafile if requested
      if (options.checkMultiplayerScene && result.metafile) {
        const isMultiplayer = isMultiplayerScene(result.metafile, options.workingDirectory)
        printProgressInfo(components.logger, isMultiplayer ? 'Multiplayer Scene' : 'Single player scene')

        // Update scene.json with multiplayer property
        await updateSceneJsonMultiplayerProperty(components, options.workingDirectory, isMultiplayer)
      }
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

/**
 * Determines if a scene is multiplayer based on code analysis and composite files
 * @param metafile - The esbuild metafile
 * @param workingDirectory - Path to the working directory
 * @returns boolean indicating if it's a multiplayer scene
 */
function isMultiplayerScene(metafile: esbuild.Metafile, workingDirectory: string): boolean {
  // First check if the scene has NetworkEntity in main.composite
  if (hasNetworkEntity(workingDirectory)) {
    return true
  }

  // Then check all inputs in the metafile for syncEntity imports
  for (const [path, info] of Object.entries(metafile.inputs)) {
    // Check if this file imports from @dcl/sdk/network
    const networkImport = info.imports?.find((imp) => imp.path.includes('@dcl/sdk/network'))

    if (networkImport) {
      // Check if it imports syncEntity specifically
      try {
        const content = fs.readFileSync(path, 'utf-8')
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
      typeCheckerFuture.reject(new CliError(`Typechecker exited with code ${code}.`))
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
