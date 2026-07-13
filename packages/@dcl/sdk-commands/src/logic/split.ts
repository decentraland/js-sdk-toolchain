import * as path from 'path'

import { CliComponents } from '../components'

/**
 * `sdk-commands build --split-build` emits three files instead of one bundle:
 *
 *   - the SDK-runtime chunk (`<main-dir>/sdk-runtime.js`): every stable SDK package,
 *     bundled once and exported as a require-registry keyed by module specifier.
 *   - the scene chunk (`<main-dir>/scene.js`): just the scene code, with the SDK
 *     packages, composites and scripts left as external `require(...)` calls.
 *   - a loader stub (the scene's `main`): reads both chunks at runtime and resolves
 *     the scene's SDK requires from the registry.
 *
 * The SDK chunk carries the composites and scripts too (see VIRTUAL_MODULES), so it is
 * identical across code edits; a runtime that caches it only re-fetches the small scene
 * chunk until a composite changes.
 */

// The SDK packages that move to the SDK-runtime chunk. Everything under these roots is
// externalized out of the scene chunk (as require calls) and registered in the SDK chunk.
const SDK_MODULE_ROOTS = ['@dcl/sdk', '@dcl/ecs', '@dcl/ecs-math', '@dcl/react-ecs', '@dcl/asset-packs', 'react']

// The composite and script virtual modules also go in the SDK chunk: `@dcl/sdk`'s
// composite-provider imports `~sdk/all-composites`, so the scene's composite data has to
// live alongside the SDK code that reads it. The SDK-chunk build resolves them via the
// composite-loader plugin, so they carry the real composites and scripts, not empty stubs.
const VIRTUAL_MODULES = ['~sdk/all-composites', '~sdk/script-utils']

/** Scene-chunk externals: every SDK root plus its sub-paths, and the virtual modules. */
export const sceneExternals = [...SDK_MODULE_ROOTS.flatMap((root) => [root, `${root}/*`]), ...VIRTUAL_MODULES]

/** Whether an external import belongs in the SDK-runtime registry (vs ~system/* or the inspector). */
export function isRegistryModule(specifier: string): boolean {
  if (VIRTUAL_MODULES.includes(specifier)) return true
  return SDK_MODULE_ROOTS.some((root) => specifier === root || specifier.startsWith(`${root}/`))
}

// Every SDK specifier a scene may import. The registry bundles all of these that resolve,
// not just what one scene uses, so two scenes on the same SDK version emit an identical
// SDK-runtime chunk and a runtime cache shares it across scenes.
const REGISTRY_CANDIDATES = [
  '@dcl/sdk',
  '@dcl/sdk/ecs',
  '@dcl/sdk/math',
  '@dcl/sdk/react-ecs',
  '@dcl/sdk/composite-provider',
  '@dcl/sdk/observables',
  '@dcl/sdk/message-bus',
  '@dcl/sdk/players',
  '@dcl/sdk/network',
  '@dcl/sdk/ethereum-provider',
  '@dcl/sdk/testing',
  '@dcl/ecs',
  '@dcl/ecs-math',
  '@dcl/react-ecs',
  'react',
  'react/jsx-runtime',
  '@dcl/asset-packs',
  '@dcl/asset-packs/dist/scene-entrypoint'
]

/** The candidates that resolve from the scene, unioned with what the scene chunk imports. */
export function registryKeys(workingDirectory: string, sceneImports: string[]): string[] {
  const keys = new Set(sceneImports)
  for (const candidate of REGISTRY_CANDIDATES) {
    try {
      require.resolve(candidate, { paths: [workingDirectory] })
      keys.add(candidate)
    } catch {}
  }
  return [...keys].sort()
}

/**
 * Source for the SDK-runtime chunk's entrypoint: a CJS module exporting a lazy
 * registry of the SDK packages. esbuild bundles the `require(...)` calls, so the
 * emitted chunk carries the SDK code and exposes it keyed by specifier.
 */
export function sdkRuntimeEntry(keys: string[]): string {
  const defs = keys.map(
    (key) => `  ${JSON.stringify(key)}: memo(function () { return require(${JSON.stringify(key)}) })`
  )
  return `'use strict'
function memo(load) {
  var value
  var done = false
  return function () {
    if (!done) {
      value = load()
      done = true
    }
    return value
  }
}
var defs = {
${defs.join(',\n')}
}
var registry = {}
Object.keys(defs).forEach(function (key) {
  Object.defineProperty(registry, key, { enumerable: true, get: defs[key] })
})
module.exports = registry
`
}

/** Derives the two chunk paths from the scene's `main` (e.g. bin/index.js). */
export function chunkPaths(main: string): { sdk: string; scene: string } {
  const slash = main.lastIndexOf('/')
  const dir = slash === -1 ? '' : main.slice(0, slash + 1)
  return { sdk: `${dir}sdk-runtime.js`, scene: `${dir}scene.js` }
}

export async function loaderStub(
  components: Pick<CliComponents, 'fs'>,
  sdkChunk: string,
  sceneChunk: string
): Promise<string> {
  const template = await components.fs.readFile(path.join(__dirname, 'split-loader.template'), 'utf-8')
  return template
    .replace('__DCL_SDK_CHUNK__', () => JSON.stringify(sdkChunk))
    .replace('__DCL_SCENE_CHUNK__', () => JSON.stringify(sceneChunk))
}
