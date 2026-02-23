// this file is tested extensively to build scenes in the `make test` command
// but since it runs outiside the testing harness, coverage is not collected

import { Scene } from '@dcl/schemas'
import child_process from 'child_process'
import esbuild from 'esbuild'
import { future } from 'fp-future'
import { globSync } from 'glob'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import i18next from 'i18next'

import { CliComponents } from '../components'
import { colors } from '../components/log'
import { printProgressInfo, printProgressStep, printWarning } from './beautiful-logs'
import { CliError } from './error'
import { getAllComposites, type Script } from './composite'
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
}

const MAX_STEP = 2

// Keep only the last 10KB of output to prevent memory leaks in watch mode
const MAX_OUTPUT_SIZE = 10 * 1024

/**
 * Generate the entry-point code for a given original entry-point
 * @param entrypointPath - file to be imported as original entry point
 * @param forceCustomExport
 * @returns the Typescript code
 */

/**
 * Converts a file path to a safe JavaScript module path string.
 * Normalizes to Unix-style forward slashes and escapes special characters.
 */
function toSafeModulePath(filePath: string): string {
  const unixPath = filePath.replace(/\\/g, '/')
  return JSON.stringify(unixPath)
}

function getEntrypointCode(entrypointPath: string, forceCustomExport: boolean, isEditorScene: boolean = false) {
  const safeEntrypointPath = toSafeModulePath(entrypointPath)
  if (forceCustomExport) return `;"use strict";export * from ${safeEntrypointPath}`

  return `// BEGIN AUTO GENERATED CODE "~sdk/scene-entrypoint"
"use strict";
import * as entrypoint from ${safeEntrypointPath}
import { engine, NetworkEntity } from '@dcl/sdk/ecs'
import * as sdk from '@dcl/sdk'
import { compositeProvider } from '@dcl/sdk/composite-provider'
import { compositeFromLoader } from '~sdk/all-composites'
import { _initializeScripts } from '~sdk/script-utils'

${
  isEditorScene &&
  `
import { syncEntity } from '@dcl/sdk/network'
import players from '@dcl/sdk/players'
import { initAssetPacks, setSyncEntity } from '@dcl/asset-packs/dist/scene-entrypoint'
initAssetPacks(engine, { syncEntity }, players)

// TODO: do we need to do this on runtime ?
// I think we have that information at build-time and we avoid to do evaluate this on the worker.
// Read composite.json or main.crdt => If that file has a NetworkEntity import '@dcl/@sdk/network'
`
}

if ((entrypoint as any).main !== undefined) {
  function _INTERNAL_startup_system() {
    try {
      // initialize and run all scripts
      _initializeScripts(engine)

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
export * from ${safeEntrypointPath}
export * from '~sdk/script-utils'
`
}

/**
 * Ensures a key exists in a JSON file. Supports dot-separated paths (e.g. "scripts.server-logs").
 * Silently skips if the file can't be read/written or the key already exists.
 */
async function ensureJsonKey(
  components: BundleComponents,
  filePath: string,
  keyPath: string,
  value: unknown
): Promise<void> {
  try {
    const raw = await components.fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)

    const keys = keyPath.split('.')
    const lastKey = keys.pop()!
    let target = parsed
    for (const key of keys) {
      target[key] = target[key] || {}
      target = target[key]
    }
    if (target[lastKey] !== undefined) return

    target[lastKey] = value
    await components.fs.writeFile(filePath, JSON.stringify(parsed, null, 2))
    printProgressInfo(
      components.logger,
      `Added ${colors.bold(`${keyPath}: ${JSON.stringify(value)}`)} to ${path.basename(filePath)}`
    )
  } catch (_) {
    // read/write failed — skip silently
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

  const entrypointSource = options.single || 'src/index.ts'
  const entrypoints = globSync(entrypointSource, { cwd: options.workingDirectory, absolute: true })

  /* istanbul ignore if */
  if (!entrypoints.length)
    throw new CliError('BUNDLE_NO_INPUT_FILES', i18next.t('errors.bundle.no_input_files', { entrypointSource }))

  // const output = !options.single ? sceneJson.main : options.single.replace(/\.ts$/, '.js')
  // const outfile = path.join(options.workingDirectory, output)
  const inputs: { entrypoint: string; outputFile: string }[] = options.single
    ? entrypoints.map((entrypoint) => ({ entrypoint, outputFile: entrypoint.replace(/\.ts$/, '.js') }))
    : [{ entrypoint: entrypoints[0], outputFile: sceneJson.main }]

  // Auto-add build-time defaults for Multiplayer Auth Server scene builds
  if (!options.single) {
    const dir = options.workingDirectory
    await ensureJsonKey(components, path.join(dir, 'scene.json'), 'authoritativeMultiplayer', true)
    await ensureJsonKey(
      components,
      path.join(dir, 'package.json'),
      'scripts.server-logs',
      'sdk-commands sdk-server-logs'
    )
  }

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
  const sdkPackagePath = (() => {
    try {
      // First try to resolve from project's node_modules
      return path.dirname(require.resolve('@dcl/sdk/package.json', { paths: [options.workingDirectory] }))
    } catch {
      // Fallback to workspace @dcl/sdk
      return path.dirname(require.resolve('@dcl/sdk/package.json', { paths: [__dirname] }))
    }
  })()
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
      })(),
      // Ensure @dcl/sdk is always resolved to workspace version to prevent version conflicts
      '@dcl/sdk': sdkPackagePath,
      // Resolve ecs from sdk dependencies (nested in @dcl/sdk)
      '@dcl/ecs': (() => {
        try {
          // First try to resolve from project's @dcl/sdk node_modules
          return path.dirname(require.resolve('@dcl/ecs/package.json', { paths: [sdkPackagePath] }))
        } catch {
          try {
            // Fallback: try to resolve from project's node_modules
            return path.dirname(require.resolve('@dcl/ecs/package.json', { paths: [options.workingDirectory] }))
          } catch {
            // Last resort: try resolving from current directory
            return path.dirname(require.resolve('@dcl/ecs/package.json', { paths: [__dirname] }))
          }
        }
      })(),
      // Resolve asset-packs from the scene's own node_modules (if the user explicitly installed it),
      // otherwise fall back to the version bundled inside @dcl/inspector.
      // NOTE: We use a direct path check (fs.existsSync) instead of require.resolve here because
      // require.resolve walks UP the directory tree from workingDirectory, which would incorrectly
      // pick up @dcl/asset-packs installed next to the scene (e.g. at a monorepo root) rather
      // than the one the user intentionally installed inside the scene.
      '@dcl/asset-packs': (() => {
        const sceneOwnAssetPacks = path.join(
          options.workingDirectory,
          'node_modules',
          '@dcl',
          'asset-packs',
          'package.json'
        )
        if (fs.existsSync(sceneOwnAssetPacks)) {
          return path.dirname(sceneOwnAssetPacks)
        }
        try {
          // Fallback: resolve from @dcl/inspector's node_modules
          const inspectorPath = require.resolve('@dcl/inspector/package.json', { paths: [__dirname] })
          return path.dirname(
            require.resolve('@dcl/asset-packs/package.json', { paths: [path.dirname(inspectorPath)] })
          )
        } catch {
          // Last resort: try resolving from current directory
          return path.dirname(require.resolve('@dcl/asset-packs/package.json', { paths: [__dirname] }))
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
      contents: getEntrypointCode(options.entrypoint, options.customEntryPoint, editorScene),
      resolveDir: path.dirname(options.entrypoint),
      sourcefile: path.basename(options.entrypoint) + '.entry-point.ts',
      loader: 'ts'
    }
  })

  /* istanbul ignore if */
  if (options.watch) {
    // Instead of using esbuild's watch, we create our own watcher
    const watcher = watch(path.resolve(options.workingDirectory), {
      ignored: ['**/dist/**', '**/*.crdt', '**/*.d.ts', path.resolve(options.outputFile)],
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
      // Rebuild for TypeScript, JavaScript, and composite files
      if (/\.(ts|tsx|js|jsx|composite)$/.test(filePath)) {
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
      await context.rebuild()
      printProgressInfo(components.logger, `Bundle saved ${colors.bold(options.outputFile)}`)
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

  let stdOutput = ''
  ts.stdout?.on('data', (data: string) => {
    stdOutput = (stdOutput + data.toString()).slice(-MAX_OUTPUT_SIZE)
  })

  ts.stdout?.pipe(process.stdout)
  ts.stderr?.pipe(process.stderr)

  const cleanup = () => {
    if (!ts.killed) ts.kill('SIGTERM')
  }

  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)
  process.on('exit', cleanup)

  ts.on('close', (code) => {
    // Remove listeners after process exits to prevent memory leaks
    process.off('SIGTERM', cleanup)
    process.off('SIGINT', cleanup)
    process.off('exit', cleanup)

    /* istanbul ignore else */
    if (code === 0) {
      printProgressInfo(components.logger, `Type checking completed without errors`)
      typeCheckerFuture.resolve(code)
    } else {
      typeCheckerFuture.reject(
        new CliError(
          'BUNDLE_TYPE_CHECKER_FAILED',
          `${stdOutput.replace(/\x1b\[[0-9;]*m/g, '')}\n
          ${i18next.t('errors.bundle.type_checker_failed', { code })}`
        )
      )
    }
    stdOutput = ''
  })

  /* istanbul ignore if */
  if (options.watch) {
    typeCheckerFuture.resolve(-1)
  }

  return typeCheckerFuture
}

function compositeLoader(components: BundleComponents, options: SingleProjectOptions): esbuild.Plugin {
  let shouldReload = true
  let compositeData: Awaited<ReturnType<typeof getAllComposites>> | null = null

  return {
    name: 'composite-loader',
    setup(build) {
      build.onStart(() => {
        shouldReload = true
        compositeData = null
      })

      // Handle composites virtual module
      build.onResolve({ filter: /~sdk\/all-composites/ }, (_args) => {
        return {
          namespace: 'sdk-composite',
          path: 'all-composites'
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'sdk-composite' }, async (_) => {
        // Load compositeData if not already loaded
        if (shouldReload && !compositeData) {
          if (!options.ignoreComposite) {
            compositeData = await getAllComposites(
              components,
              // we pass the build.initialOptions.absWorkingDir to build projects with multiple roots at once
              build.initialOptions.absWorkingDir ?? options.workingDirectory
            )

            if (compositeData.withErrors) {
              printWarning(
                components.logger,
                'Some composites are not included because of errors while compiling them. There can be unexpected behavior in the scene, check the errors and try to fix them.'
              )
            }
          }
          shouldReload = false
        }

        const contents = compositeData
          ? `export const compositeFromLoader = {${compositeData.compositeLines.join(',')}}`
          : `export const compositeFromLoader = {}`
        const watchFiles = compositeData?.watchFiles || []

        return {
          loader: 'js',
          contents,
          watchFiles
        }
      })

      // Handle scripts virtual module
      build.onResolve({ filter: /~sdk\/script-utils/ }, (_args) => {
        return {
          namespace: 'sdk-scripts',
          path: 'script-utils'
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'sdk-scripts' }, async (_) => {
        // ensure compositeData is loaded (in case scripts are imported before composites)
        if (!compositeData && !options.ignoreComposite) {
          compositeData = await getAllComposites(
            components,
            build.initialOptions.absWorkingDir ?? options.workingDirectory
          )
        }

        const { contents, watchFiles } = await generateInitializeScriptsModule(
          components,
          options.workingDirectory,
          compositeData
        )

        return {
          loader: 'js',
          contents,
          watchFiles,
          resolveDir: options.workingDirectory
        }
      })
    }
  }
}

/**
 * Generates a sanitized import name for a script path.
 * Example: "src/scripts/my-script.ts" -> "script_src_scripts_my_script"
 */
export function getScriptImportName(scriptPath: string): string {
  return (
    'script_' +
    scriptPath
      .replace(/\.tsx?$/, '') // remove .ts or .tsx
      .replace(/[^a-zA-Z0-9]/g, '_') // sanitize
  )
}

interface ScriptCollectionResult {
  runtimeImports: string
  typeImports: string
  scriptTypes: string
  scriptsArray: string
  watchFiles: string[]
}

/**
 * Collects and formats all script data for code generation
 */
function collectScriptData(
  compositeData: { scripts: Map<string, Script[]>; [key: string]: any },
  workingDirectory: string
): ScriptCollectionResult {
  const runtimeImports: string[] = []
  const typeImports: string[] = []
  const scriptTypes: string[] = []
  const scriptsArray: string[] = []
  const watchFiles: string[] = []

  for (const [scriptPath, scriptInstances] of compositeData.scripts.entries()) {
    const importName = getScriptImportName(scriptPath)
    const absolutePath = path.join(workingDirectory, scriptPath)

    // For the virtual module runtime
    runtimeImports.push(`import * as ${importName} from ${toSafeModulePath('./' + scriptPath)}`)

    // For .d.ts file using import() type syntax (works in ambient modules)
    typeImports.push(`  type ${importName} = typeof import(${toSafeModulePath(absolutePath)})`)

    // Add to ScriptRegistry interface
    scriptTypes.push(`  ${toSafeModulePath(scriptPath)}: ExtractScriptType<${importName}>`)

    // Add each script instance to the array
    for (const script of scriptInstances) {
      scriptsArray.push(`  { ...${JSON.stringify(script)}, module: ${importName} }`)
    }

    watchFiles.push(absolutePath)
  }

  return {
    runtimeImports: runtimeImports.join('\n'),
    typeImports: typeImports.join('\n'),
    scriptTypes: `interface ScriptRegistry {\n${scriptTypes.join(',\n')}\n}`,
    scriptsArray: `[\n${scriptsArray.join(',\n')}\n]`,
    watchFiles
  }
}

/**
 * Reads and prepares the runtime script code for inlining
 */
async function prepareRuntimeCode(fs: BundleComponents['fs']): Promise<string> {
  const runtimeCodePath = require.resolve('./runtime-script')
  const runtimeCode = await fs.readFile(runtimeCodePath, 'utf-8')

  // Strip CommonJS/module system code
  return (
    runtimeCode
      .replace(/"use strict";?\s*/g, '')
      .replace(/Object\.defineProperty\(exports,.*?\);?\s*/g, '')
      .replace(/exports\.\w+\s*=\s*void 0;?\s*/g, '')
      .replace(/exports\.\w+\s*=\s*/g, '')
      .replace(/^export\s+/gm, '')
      .replace(/^import\s+.*$/gm, '')
      // fix nested asset-packs path (importing from @dcl/inspector is banned in runtime, but @dcl/asset-packs not)
      .replace(/@dcl\/inspector\/node_modules\/@dcl\/asset-packs/g, '@dcl/asset-packs')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

/**
 * Generates the TypeScript declaration for the ~sdk/script-utils module
 */
async function generateScriptModuleDeclaration(
  components: BundleComponents,
  typeImports: string,
  scriptTypes: string
): Promise<string> {
  const templatePath = path.join(__dirname, 'script-module.d.ts.template')
  const template = await components.fs.readFile(templatePath, 'utf-8')

  return template.replace('__TYPE_IMPORTS__', typeImports).replace('__SCRIPT_TYPES__', scriptTypes)
}

/**
 * Updates the sdk.d.ts file with script type declarations
 */
async function updateSdkTypeDeclarations(
  components: BundleComponents,
  workingDirectory: string,
  typeImports: string,
  scriptTypes: string,
  scriptCount: number
): Promise<void> {
  try {
    const jsRuntimePath = require.resolve('@dcl/js-runtime/sdk.d.ts', { paths: [workingDirectory] })
    let existingSdkDts = await components.fs.readFile(jsRuntimePath, 'utf-8')

    // remove any existing ~sdk/script-utils module declaration
    existingSdkDts = existingSdkDts
      .replace(/\/\/ @internal[\s]*\ndeclare module '~sdk\/script-utils'[\s\S]*?(?=\n\/\/|$)/, '')
      .trim()

    // generate and append the new module declaration
    const scriptModuleDeclaration = await generateScriptModuleDeclaration(components, typeImports, scriptTypes)
    const updatedSdkDts = existingSdkDts + '\n' + scriptModuleDeclaration

    await components.fs.writeFile(jsRuntimePath, updatedSdkDts)
    components.logger.info(`✓ Updated sdk.d.ts with ${scriptCount} script type(s) at: ${jsRuntimePath}`)
  } catch (err: any) {
    components.logger.error('⚠ Could not update sdk.d.ts with script types:', err)
  }
}

/**
 * Generates the virtual module content with script initialization and helper functions
 */
function generateVirtualModuleContent(runtimeImports: string, runtimeCode: string, scriptsArray: string): string {
  return `
${runtimeImports}

${runtimeCode}

export function _initializeScripts(engine) {
  const scriptsArray = ${scriptsArray}
  return runScripts(engine, scriptsArray)
}

// export helper functions that are defined in the inlined runtime code
export { getScriptInstance, getScriptInstancesByPath, getAllScriptInstances, callScriptMethod }
`
}

export async function generateInitializeScriptsModule(
  components: BundleComponents,
  workingDirectory: string,
  compositeData: { scripts: Map<string, Script[]>; [key: string]: any } | null
): Promise<{ contents: string; watchFiles: string[] }> {
  // prepare runtime code (always needed for helper functions)
  const runtimeCode = await prepareRuntimeCode(components.fs)

  // default empty implementation if no scripts
  if (!compositeData || compositeData.scripts.size === 0) {
    return {
      contents: generateVirtualModuleContent('', runtimeCode, '[]'),
      watchFiles: []
    }
  }

  // Step 1: Collect all script data
  const scriptData = collectScriptData(compositeData, workingDirectory)

  // Step 2: Update TypeScript declarations
  await updateSdkTypeDeclarations(
    components,
    workingDirectory,
    scriptData.typeImports,
    scriptData.scriptTypes,
    compositeData.scripts.size
  )

  // Step 3: Generate virtual module content
  const contents = generateVirtualModuleContent(scriptData.runtimeImports, runtimeCode, scriptData.scriptsArray)

  return { contents, watchFiles: scriptData.watchFiles }
}
