/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable @typescript-eslint/ban-types */
/// <reference path="../../packages/decentraland-ecs/node_modules/@dcl/posix/index.d.ts" />

import { IFuture } from 'fp-future'
import { readFileSync } from 'fs'

// A naive attempt at getting the global `this`. Don’t use `this`!
const getGlobalThis = function () {
  // @ts-ignore
  if (typeof globalThis !== 'undefined') return globalThis
  // @ts-ignore
  if (typeof self !== 'undefined') return self
  // @ts-ignore
  if (typeof window !== 'undefined') return window
  // Note: this might still return the wrong result!
  // @ts-ignore
  if (typeof this !== 'undefined') return this
  throw new Error('Unable to locate global `this`')
}

const globalObject: {
  dcl: Pick<DecentralandInterface, 'loadModule' | 'callRpc' | 'onStart'>
  define: Function & { modules: any }
  onerror: CallableFunction
} = (getGlobalThis as any)()

export function resolveFutureWith<T>(f: IFuture<T>, fn: () => Promise<T>) {
  fn().then(f.resolve).catch(f.catch)
}

export type ModulesMock = Record<string, () => Promise<any>>

export function mockEnvironment(modules: ModulesMock) {
  const starters: CallableFunction[] = []
  const loadedModuleDescriptors = new Map<string, ModuleDescriptor>()
  const loadedModulesByHandle = new Map<string, any>()

  const errors: string[] = []

  it('mocks the environment', () => {
    const amdModuleRequire = require.resolve('../../packages/@dcl/amd')
    const content = readFileSync(amdModuleRequire).toString()
    ;(globalObject as any).define = null
    delete (globalObject as any).dcl
    delete (globalObject as any).onerror

    expect(globalObject.dcl).toBeUndefined()
    expect(globalObject.define).toEqual(null)
    expect(globalObject.onerror).toBeUndefined()

    function getModuleHandle(moduleName: string) {
      return moduleName + '_handle'
    }

    globalObject.onerror = (err: Error) => {
      errors.push(err.message)
    }

    globalObject.dcl = {
      async loadModule(moduleName: string) {
        if (loadedModuleDescriptors.has(moduleName)) {
          return loadedModuleDescriptors.get(moduleName)!
        }

        if (moduleName in modules) {
          const rpcHandle = getModuleHandle(moduleName)
          const moduleInstance = await modules[moduleName]()

          const ret: ModuleDescriptor = {
            rpcHandle,
            methods: Object.keys(moduleInstance)
              .filter((key) => typeof moduleInstance[key] === 'function')
              .map((key) => {
                return { name: key }
              })
          }

          loadedModuleDescriptors.set(moduleName, ret)
          loadedModulesByHandle.set(rpcHandle, moduleInstance)

          return ret
        }

        throw new Error('Unknown module ' + moduleName)
      },
      async callRpc(moduleHandle: string, methodName: string, args: any[]) {
        if (!loadedModulesByHandle.has(moduleHandle)) {
          throw new Error('Unknown module handle ' + moduleHandle)
        }

        const moduleInstance = loadedModulesByHandle.get(moduleHandle)!

        if (!moduleInstance[methodName]) {
          throw new Error(`Unknown method '${methodName}'`)
        }

        return moduleInstance[methodName].apply(null, args)
      },
      onStart(cb: CallableFunction) {
        starters.push(cb)
      }
    }

    // RUN THE AMD LOADER
    eval(content + '//# sourceURL=' + amdModuleRequire)

    expect(globalObject.dcl).not.toBeUndefined()
    expect(globalObject.define).not.toBeUndefined()
    expect(globalObject.onerror).not.toBeUndefined()
  })

  function start() {
    for (const $ of starters) {
      $()
    }
  }

  function define(factory: any): void
  function define(dependencies: string[], factory: any): void
  function define(id: string, factory: any): void
  function define(id: string, dependencies: string[], factory: any): void
  function define(this: any, ...args: any[]): void {
    return globalObject.define.apply(this, args)
  }

  function getModules(): Record<
    string,
    {
      name: string
      dependencies: Array<string>
    }
  > {
    return globalObject.define.modules
  }

  return {
    starters,
    start,
    loadedModuleDescriptors,
    loadedModulesByHandle,
    define,
    errors,
    getModules
  }
}
