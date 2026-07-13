import { readFile } from 'fs/promises'
import {
  chunkPaths,
  isRegistryModule,
  loaderStub,
  registryKeys,
  sceneExternals,
  sdkRuntimeEntry
} from '../../../packages/@dcl/sdk-commands/src/logic/split'

describe('split-build logic', () => {
  it('derives the two chunk paths from the scene main', () => {
    expect(chunkPaths('bin/index.js')).toEqual({ sdk: 'bin/sdk-runtime.js', scene: 'bin/scene.js' })
    expect(chunkPaths('game.js')).toEqual({ sdk: 'sdk-runtime.js', scene: 'scene.js' })
    expect(chunkPaths('dist/nested/main.js')).toEqual({
      sdk: 'dist/nested/sdk-runtime.js',
      scene: 'dist/nested/scene.js'
    })
  })

  it('externalizes the SDK roots and the composite/script virtual modules', () => {
    const externals = sceneExternals
    expect(externals).toContain('@dcl/sdk')
    expect(externals).toContain('@dcl/sdk/*')
    expect(externals).toContain('react/*')
    expect(externals).toContain('~sdk/all-composites')
    expect(externals).toContain('~sdk/script-utils')
  })

  it('registers SDK modules and virtual modules, not host or inspector imports', () => {
    expect(isRegistryModule('@dcl/sdk')).toBe(true)
    expect(isRegistryModule('@dcl/ecs/dist-cjs')).toBe(true)
    expect(isRegistryModule('react/jsx-runtime')).toBe(true)
    expect(isRegistryModule('~sdk/all-composites')).toBe(true)
    expect(isRegistryModule('~sdk/script-utils')).toBe(true)
    expect(isRegistryModule('~system/Runtime')).toBe(false)
    expect(isRegistryModule('@dcl/inspector')).toBe(false)
    expect(isRegistryModule('@dcl/sdkx')).toBe(false)
  })

  it('every package aliased by the bundler is externalized into the registry', () => {
    // resolveSdkAliases (bundle.ts) redirects these packages; each must be a registry
    // module, or it would be aliased into the SDK chunk yet still bundled into the scene
    // chunk. This guards against the two lists drifting apart.
    for (const aliased of ['react', '@dcl/sdk', '@dcl/ecs', '@dcl/asset-packs']) {
      expect(isRegistryModule(aliased)).toBe(true)
    }
  })

  it('registry keys keep the scene imports, deduped and sorted', () => {
    // candidate probing needs real module resolution; test/build-ecs/split-build.spec.ts
    // asserts it against a built scene (jest's sandboxed resolver ignores resolve paths)
    const keys = registryKeys(process.cwd(), ['~sdk/script-utils', '~sdk/all-composites', '~sdk/all-composites'])
    expect(keys).toContain('~sdk/all-composites')
    expect(keys).toContain('~sdk/script-utils')
    expect(keys).toEqual([...keys].sort())
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('builds an SDK-runtime entry that requires and re-exports every key', () => {
    const entry = sdkRuntimeEntry(['@dcl/sdk', '@dcl/ecs', '~sdk/all-composites'])
    expect(entry).toContain(`require("@dcl/sdk")`)
    expect(entry).toContain(`require("@dcl/ecs")`)
    expect(entry).toContain(`require("~sdk/all-composites")`)
    expect(entry).toContain('module.exports = registry')
  })

  it('substitutes both chunk paths into the loader stub', async () => {
    const components = { fs: { readFile: (p: string, e: BufferEncoding) => readFile(p, e) } } as any
    const stub = await loaderStub(components, 'bin/sdk-runtime.js', 'bin/scene.js')
    expect(stub).toContain(`"bin/sdk-runtime.js"`)
    expect(stub).toContain(`"bin/scene.js"`)
    expect(stub).not.toContain('__DCL_SDK_CHUNK__')
    expect(stub).not.toContain('__DCL_SCENE_CHUNK__')
  })
})
