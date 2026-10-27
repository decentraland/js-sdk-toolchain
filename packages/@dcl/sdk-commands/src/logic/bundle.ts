// this file is tested extensively to build scenes in the `make test` command
// but since it runs outiside the testing harness, coverage is not collected

import { Scene } from '@dcl/schemas'
import child_process from 'child_process'
import esbuild from 'esbuild'
import { future } from './future'
import { globSync } from 'fs'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import i18next from 'i18next'

import { CliComponents } from '../components'
import { colors } from '../components/log'
import { printProgressInfo, printProgressStep, printWarning } from './beautiful-logs'
import { CliError } from './error'
import { getAllComposites, type Script } from './composite'
import { isEditorScene, usesNetworkedAssetPacks } from './project-validations'
import { SceneWithMultiplayer } from './scene-validations'
import { pickAssetPacks } from './asset-packs'
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

  // called after every successful (re)build, including watch-mode rebuilds
  onRebuild?: (usage: MultiplayerUsage) => void | Promise<void>
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

function getEntrypointCode(entrypointPath: string, forceCustomExport: boolean) {
  const safeEntrypointPath = toSafeModulePath(entrypointPath)
  if (forceCustomExport) return `;"use strict";export * from ${safeEntrypointPath}`

  return `// BEGIN AUTO GENERATED CODE "~sdk/scene-entrypoint"
"use strict";
import * as entrypoint from ${safeEntrypointPath}
import { engine, NetworkEntity } from '@dcl/sdk/ecs'
import * as sdk from '@dcl/sdk'
import { compositeProvider } from '@dcl/sdk/composite-provider'
import { compositeFromLoader } from '~sdk/all-composites'
import { _initializeScripts, _initializeAssetPacks } from '~sdk/script-utils'

_initializeAssetPacks()

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
  const entrypoints = globSync(entrypointSource, { cwd: options.workingDirectory }).map((entry) =>
    path.resolve(options.workingDirectory, entry)
  )

  /* istanbul ignore if */
  if (!entrypoints.length)
    throw new CliError('BUNDLE_NO_INPUT_FILES', i18next.t('errors.bundle.no_input_files', { entrypointSource }))

  // const output = !options.single ? sceneJson.main : options.single.replace(/\.ts$/, '.js')
  // const outfile = path.join(options.workingDirectory, output)
  const inputs: { entrypoint: string; outputFile: string }[] = options.single
    ? entrypoints.map((entrypoint) => ({ entrypoint, outputFile: entrypoint.replace(/\.ts$/, '.js') }))
    : [{ entrypoint: entrypoints[0], outputFile: sceneJson.main }]

  // The flag is derived from what the bundle uses, so scene.json follows every successful build
  const onBuild = async (usage: MultiplayerUsage) => {
    if (!options.single) {
      await applyMultiplayerUsage(components, options.workingDirectory, usage)
      ;(sceneJson as SceneWithMultiplayer).authoritativeMultiplayer = usage.authoritativeMultiplayer
    }
    await options.onRebuild?.(usage)
  }

  let multiplayer: MultiplayerUsage | undefined
  for (const input of inputs) {
    const usage = await bundleSingleProject(components, {
      ...options,
      tsconfig,
      ...input,
      onBuild
    })
    if (usage) {
      multiplayer = {
        authoritativeMultiplayer: !!multiplayer?.authoritativeMultiplayer || usage.authoritativeMultiplayer,
        reasons: [...(multiplayer?.reasons ?? []), ...usage.reasons]
      }
    }
  }

  return { sceneJson, inputs, multiplayer }
}

export type MultiplayerUsage = { authoritativeMultiplayer: boolean; reasons: string[] }

const MULTIPLAYER_MODULES: { pattern: RegExp; label: string }[] = [
  { pattern: /@dcl\/sdk\/network\//, label: '@dcl/sdk/network' },
  { pattern: /@dcl\/sdk\/server\//, label: '@dcl/sdk/server' },
  { pattern: /@dcl\/sdk\/message-bus\.js$/, label: '@dcl/sdk/message-bus' }
]
const COMMS_MODULE = '~system/CommunicationsController'

function importerLabel(inputPath: string): string {
  if (inputPath === 'sdk-scripts:script-utils') return 'asset-packs (synced entities or Admin Toolkit)'
  const normalized = inputPath.replace(/\\/g, '/')
  const nodeModules = normalized.lastIndexOf('node_modules/')
  return nodeModules >= 0 ? normalized.slice(nodeModules + 'node_modules/'.length) : normalized
}

function multiplayerModuleLabel(modulePath: string): string | undefined {
  return MULTIPLAYER_MODULES.find(({ pattern }) => pattern.test(modulePath.replace(/\\/g, '/')))?.label
}

/**
 * A scene needs the authoritative multiplayer server iff its bundle includes the SDK
 * network, server (storage) or message-bus modules, or calls comms directly.
 * Only modules that survived tree-shaking count.
 */
export function detectMultiplayerUsage(metafile: esbuild.Metafile): MultiplayerUsage {
  const included = new Set<string>()
  for (const output of Object.values(metafile.outputs)) {
    for (const [inputPath, { bytesInOutput }] of Object.entries(output.inputs)) {
      if (bytesInOutput > 0) included.add(inputPath)
    }
  }

  let callsCommsDirectly = false
  const reasons = new Set<string>()
  for (const inputPath of included) {
    if (multiplayerModuleLabel(inputPath)) continue
    for (const imported of metafile.inputs[inputPath]?.imports ?? []) {
      if (imported.external && imported.path === COMMS_MODULE) {
        callsCommsDirectly = true
        reasons.add(`${importerLabel(inputPath)} → ${COMMS_MODULE}`)
        continue
      }
      // Re-export-only entry points (e.g. @dcl/sdk/server) contribute no bytes, so label importers
      // regardless of inclusion; whether the scene needs a server is decided from included modules.
      const label = imported.external ? undefined : multiplayerModuleLabel(imported.path)
      if (label) reasons.add(`${importerLabel(inputPath)} → ${label}`)
    }
  }

  const authoritativeMultiplayer = callsCommsDirectly || [...included].some((p) => !!multiplayerModuleLabel(p))
  return { authoritativeMultiplayer, reasons: authoritativeMultiplayer ? [...reasons] : [] }
}

async function applyMultiplayerUsage(components: BundleComponents, workingDirectory: string, usage: MultiplayerUsage) {
  const sceneJsonPath = path.join(workingDirectory, 'scene.json')
  try {
    const parsed = JSON.parse(await components.fs.readFile(sceneJsonPath, 'utf-8'))
    if (parsed.authoritativeMultiplayer !== usage.authoritativeMultiplayer) {
      parsed.authoritativeMultiplayer = usage.authoritativeMultiplayer
      await components.fs.writeFile(sceneJsonPath, JSON.stringify(parsed, null, 2))
    }
  } catch (_) {
    // read/write failed — skip silently
  }

  if (usage.authoritativeMultiplayer) {
    printProgressInfo(
      components.logger,
      `Multiplayer server: ${colors.bold('enabled')} (${usage.reasons.join(', ') || 'network modules bundled'})`
    )
    await ensureJsonKey(
      components,
      path.join(workingDirectory, 'package.json'),
      'scripts.server-logs',
      'sdk-commands sdk-server-logs'
    )
  } else {
    printProgressInfo(components.logger, `Multiplayer server: ${colors.bold('not needed')}`)
  }
}

type SingleProjectOptions = CompileOptions & {
  tsconfig: string
  entrypoint: string
  outputFile: string
  onBuild?: (usage: MultiplayerUsage) => Promise<void>
}

export async function bundleSingleProject(components: BundleComponents, options: SingleProjectOptions) {
  printProgressStep(components.logger, `Bundling file ${colors.bold(options.entrypoint)}`, 1, MAX_STEP)

  // Pre-compute composite data so we can inject maxCompositeEntity via esbuild define.
  // This must happen before the esbuild context is created because the define values
  // are baked into the engine at compile time (the entity counter initializer reads it)
  let maxCompositeEntity = 0
  if (!options.ignoreComposite) {
    const composites = await getAllComposites(components, options.workingDirectory)
    maxCompositeEntity = composites.maxCompositeEntity
  }

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
    sourcemap: options.production ? false : 'inline',
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
      // Resolve asset-packs from the scene's own node_modules (if the user explicitly installed it and
      // it isn't older than the bundled one), otherwise fall back to the version bundled inside @dcl/inspector.
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
        const bundledAssetPacks = (() => {
          try {
            // Fallback: resolve from @dcl/inspector's node_modules
            const inspectorPath = require.resolve('@dcl/inspector/package.json', { paths: [__dirname] })
            return require.resolve('@dcl/asset-packs/package.json', { paths: [path.dirname(inspectorPath)] })
          } catch {
            // Last resort: try resolving from current directory
            return require.resolve('@dcl/asset-packs/package.json', { paths: [__dirname] })
          }
        })()
        const readCopy = (packageJsonPath: string) => {
          try {
            const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
            return { dir: path.dirname(packageJsonPath), version: String(version) }
          } catch {
            return { dir: path.dirname(packageJsonPath), version: '' }
          }
        }
        const picked = pickAssetPacks(
          fs.existsSync(sceneOwnAssetPacks) ? readCopy(sceneOwnAssetPacks) : undefined,
          readCopy(bundledAssetPacks)
        )!
        if (picked.warning) printWarning(components.logger, picked.warning)
        return picked.dir
      })()
    },
    // convert filesystem paths into file:// to enable VSCode debugger
    sourceRoot: options.production ? 'dcl:///' : pathToFileURL(path.dirname(options.outputFile)).toString(),
    define: {
      document: 'undefined',
      window: 'undefined',
      DEBUG: options.production ? 'false' : 'true',
      'globalThis.DEBUG': options.production ? 'false' : 'true',
      'process.env.NODE_ENV': JSON.stringify(options.production ? 'production' : 'development'),
      DCL_MAX_COMPOSITE_ENTITY: String(maxCompositeEntity)
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
      resolveDir: path.dirname(options.entrypoint),
      sourcefile: path.basename(options.entrypoint) + '.entry-point.ts',
      loader: 'ts'
    }
  })

  async function rebuild(): Promise<MultiplayerUsage> {
    const result = await context.rebuild()
    printProgressInfo(components.logger, `Bundle saved ${colors.bold(options.outputFile)}`)
    const detected = detectMultiplayerUsage(result.metafile!)
    await options.onBuild?.(detected)
    return detected
  }

  let usage: MultiplayerUsage | undefined

  /* istanbul ignore if */
  if (options.watch) {
    // Instead of using esbuild's watch, we create our own watcher
    const watcher = watch(path.resolve(options.workingDirectory), {
      ignored: ['**/node_modules/**', '**/dist/**', '**/*.crdt', '**/*.d.ts', path.resolve(options.outputFile)],
      ignoreInitial: true
    })

    const debouncedRebuild = debounce(async () => {
      try {
        await rebuild()
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

    // Do initial build. A build error must not kill the process in watch mode:
    // the watcher above is already running and the preview server can still
    // start, so report the error and recover on the next file save — the same
    // contract as a failed re-build. Throwing here left `sdk-commands start`
    // dead when a scene was opened with a pre-existing syntax error, with no
    // watcher alive to pick up the fix.
    try {
      usage = await rebuild()
    } catch (err: any) {
      /* istanbul ignore next */
      components.logger.error(err.toString())
    }
    printProgressInfo(components.logger, `The compiler is watching for changes`)
  } else {
    try {
      usage = await rebuild()
    } catch (err: any) {
      /* istanbul ignore next */
      throw new CliError('BUNDLE_REBUILD_FAILED', i18next.t('errors.bundle.rebuild_failed', { error: err.toString() }))
    }
    await context.dispose()
  }

  /* istanbul ignore next */
  if (options.watch) printProgressInfo(components.logger, `The compiler is watching for changes`)

  await runTypeChecker(components, options)

  return usage
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

export function compositeLoader(components: BundleComponents, options: SingleProjectOptions): esbuild.Plugin {
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
          compositeData,
          {
            editorScene: await isEditorScene(components, options.workingDirectory),
            networkedAssetPacks: await usesNetworkedAssetPacks(components, options.workingDirectory)
          }
        )

        return {
          loader: 'ts',
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
 * Reads the runtime script TypeScript source for inlining as ESM
 */
async function prepareRuntimeCode(fs: BundleComponents['fs']): Promise<string> {
  const runtimeCodePath = path.join(__dirname, 'runtime-script.ts')
  const runtimeCode = await fs.readFile(runtimeCodePath, 'utf-8')

  // fix nested asset-packs path (importing from @dcl/inspector is banned in scene bundles, @dcl/asset-packs is not)
  return runtimeCode.replace(/@dcl\/inspector\/node_modules\/@dcl\/asset-packs/g, '@dcl/asset-packs')
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
 * Minimal '~sdk/script-utils' for scenes with no scripts: same export surface,
 * empty-registry semantics, no embedded script runtime (skips the
 * @dcl/asset-packs payload and its glue).
 */
function generateScriptStubModuleContent(): string {
  return `
${ASSET_PACKS_NOOP}
export function _initializeScripts(_engine) {}

export function getScriptInstance(_entity, _scriptPath) {
  return null
}

export function getScriptInstancesByPath(_scriptPath) {
  return []
}

export function getAllScriptInstances(_entity) {
  return []
}

export function callScriptMethod(entity, scriptPath, methodName, ..._args) {
  console.error(\`Method \${methodName} not found on script \${scriptPath} for entity \${entity}\`)
  return undefined
}
`
}

const ASSET_PACKS_BOOT_NETWORKED = `
import { engine } from '@dcl/sdk/ecs'
import { syncEntity, registerMessages } from '@dcl/sdk/network'
import { MessageBus } from '@dcl/sdk/message-bus'
import players from '@dcl/sdk/players'
import { initAssetPacks } from '@dcl/asset-packs/dist/scene-entrypoint'
export function _initializeAssetPacks() {
  initAssetPacks(engine, { syncEntity, messageBus: new MessageBus(), registerMessages }, players)
}
`

// No network imports: bundling them marks the scene as needing a multiplayer server.
const ASSET_PACKS_BOOT_LOCAL = `
import { engine } from '@dcl/sdk/ecs'
import players from '@dcl/sdk/players'
import { initAssetPacks } from '@dcl/asset-packs/dist/scene-entrypoint'
export function _initializeAssetPacks() {
  initAssetPacks(engine, {}, players)
}
`

const ASSET_PACKS_NOOP = 'export function _initializeAssetPacks() {}'

/**
 * Generates the virtual module content with script initialization and helper functions
 */
function generateVirtualModuleContent(
  runtimeImports: string,
  runtimeCode: string,
  scriptsArray: string,
  assetPacksBoot: string
): string {
  return `
${assetPacksBoot}
${runtimeImports}

${runtimeCode}

export function _initializeScripts(engine) {
  const scriptsArray = ${scriptsArray}
  return runScripts(engine, scriptsArray)
}
`
}

export async function generateInitializeScriptsModule(
  components: BundleComponents,
  workingDirectory: string,
  compositeData: { scripts: Map<string, Script[]>; [key: string]: any } | null,
  opts?: { editorScene?: boolean; networkedAssetPacks?: boolean }
): Promise<{ contents: string; watchFiles: string[] }> {
  const hasScripts = !!compositeData && compositeData.scripts.size > 0
  const assetPacksBoot = !opts?.editorScene
    ? ASSET_PACKS_NOOP
    : opts.networkedAssetPacks
      ? ASSET_PACKS_BOOT_NETWORKED
      : ASSET_PACKS_BOOT_LOCAL

  // scriptless non-editor scenes skip the embedded script runtime entirely
  if (!hasScripts && !opts?.editorScene) {
    return {
      contents: generateScriptStubModuleContent(),
      watchFiles: []
    }
  }

  const runtimeCode = await prepareRuntimeCode(components.fs)

  // default empty implementation if no scripts
  if (!hasScripts) {
    return {
      contents: generateVirtualModuleContent('', runtimeCode, '[]', assetPacksBoot),
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
  const contents = generateVirtualModuleContent(
    scriptData.runtimeImports,
    runtimeCode,
    scriptData.scriptsArray,
    assetPacksBoot
  )

  return { contents, watchFiles: scriptData.watchFiles }
}
