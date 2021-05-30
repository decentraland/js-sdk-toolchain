type Module = {
  name: string
  dclamd: 1 | 2
  parent: string | null
  dependants: Set<string>
  dependencies: Array<string>
  handlers: ModuleLoadedHandler[]
  exports: any
}

type ModuleLoadedHandler = (module: Module) => void

declare var onerror: ((err: Error) => void) | undefined

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

const globalObject = (getGlobalThis as any)()

namespace loader {
  'use strict'

  const MODULE_LOADING = 1
  const MODULE_READY = 2

  let unnamedModules = 0

  let anonymousQueue: any[] = []
  let cycles: string[][] = []

  const settings = {
    baseUrl: ''
  }

  const registeredModules: Record<string, Module> = {}

  export function config(config: Record<string, any>) {
    if (typeof config === 'object') {
      for (let x in config) {
        if (config.hasOwnProperty(x)) {
          ;(settings as any)[x] = config[x]
        }
      }
    }
  }

  export function define(factory: Function): void
  export function define(id: string, factory: Function): void
  export function define(dependencies: string[], factory: Function): void
  export function define(id: string, dependencies: string[], factory: Function): void
  export function define(
    first: string | Function | string[],
    second?: string[] | string | Function,
    third?: Function | object
  ): void {
    let moduleToLoad: string | null = null
    let factory: Function | object = {}
    let dependencies: string[] | null = null

    if (typeof first === 'function') {
      factory = first
    } else if (typeof first === 'string') {
      moduleToLoad = first

      if (typeof second === 'function') {
        factory = second
      } else if (second instanceof Array) {
        dependencies = second
        factory = third!
      }
    } else if (first instanceof Array) {
      dependencies = first
      if (typeof second === 'function') {
        factory = second
      }
    }

    dependencies = dependencies || ['require', 'exports', 'module']

    if (moduleToLoad === null) {
      moduleToLoad = `unnamed-module-${unnamedModules++}`
    }

    moduleToLoad = normalizeModuleId(moduleToLoad)

    function ready(deps: any[]) {
      const module = registeredModules[moduleToLoad!]

      if (!module) throw new Error('Could not access registered module ' + moduleToLoad)

      let exports = module.exports

      exports = typeof factory === 'function' ? factory.apply(globalObject, deps) || exports : factory

      module.exports = exports

      moduleReady(moduleToLoad!)
    }

    dependencies = (dependencies || []).map((dep) => resolve(moduleToLoad!, dep))

    if (!registeredModules[moduleToLoad]) {
      registeredModules[moduleToLoad] = {
        name: moduleToLoad!,
        parent: null,
        dclamd: MODULE_LOADING,
        dependencies,
        handlers: [],
        exports: {},
        dependants: new Set()
      }
    }

    registeredModules[moduleToLoad].dependencies = dependencies

    require(dependencies, ready, (err: Error) => {
      if (typeof onerror == 'function') {
        onerror(err)
      } else {
        throw err
      }
    }, moduleToLoad!)
  }

  export namespace define {
    export const amd = {}
    export const modules = registeredModules
  }

  function moduleReady(moduleName: string) {
    const module = registeredModules[moduleName]

    if (!module) throw new Error('Could not access registered module ' + moduleName)

    module.dclamd = MODULE_READY

    let handlers: ModuleLoadedHandler[] = module.handlers

    if (handlers && handlers.length) {
      for (let x = 0; x < handlers.length; x++) {
        handlers[x](registeredModules[moduleName])
      }
    }
  }

  /**
   * Walks (recursively) the dependencies of 'from' in search of 'to'.
   * Returns cycle as array.
   */
  function getCyclePath(fromModule: string, toModule: string, depth: number): string[] | null {
    if (!registeredModules[fromModule]) {
      return null
    }

    if (fromModule == toModule || depth == 50) return [fromModule]

    const dependencies = registeredModules[fromModule].dependencies

    for (let i = 0, len = dependencies.length; i < len; i++) {
      let path = getCyclePath(dependencies[i], toModule, depth + 1)
      if (path !== null) {
        path.push(fromModule)
        return path
      }
    }

    return null
  }

  /**
   * Walks (recursively) the dependencies of 'from' in search of 'to'.
   * Returns true if there is such a path or false otherwise.
   * @param from Module id to start at
   * @param to Module id to look for
   */
  function hasDependencyPath(fromId: string, toId: string): boolean {
    let from = registeredModules[fromId]
    if (!from) {
      return false
    }

    let inQueue: Record<string, boolean> = {}
    for (let i in registeredModules) {
      inQueue[i] = false
    }
    let queue: Module[] = []

    // Insert 'from' in queue
    queue.push(from)
    inQueue[fromId] = true

    while (queue.length > 0) {
      // Pop first inserted element of queue
      let element = queue.shift()!
      let dependencies = element.dependencies
      if (dependencies) {
        // Walk the element's dependencies
        for (let i = 0, len = dependencies.length; i < len; i++) {
          let dependency = dependencies[i]

          if (dependency === toId) {
            // There is a path to 'to'
            return true
          }

          let dependencyModule = registeredModules[dependency]
          if (dependencyModule && !inQueue[dependency]) {
            // Insert 'dependency' in queue
            inQueue[dependency] = true
            queue.push(dependencyModule)
          }
        }
      }
    }

    // There is no path to 'to'
    return false
  }

  export function require(
    dependencies: string | string[],
    callback: (deps: any[]) => void,
    errorCallback: Function,
    parentModule: string
  ) {
    let dependenciesResults: any[] = new Array(dependencies.length).fill(null)
    let loadedCount = 0
    let hasLoaded = false

    if (typeof dependencies === 'string') {
      if (registeredModules[dependencies]) {
        if (registeredModules[dependencies].dclamd === MODULE_LOADING) {
          throw new Error(`Trying to load ${dependencies} from ${parentModule}. The first module is still loading.`)
        }
        return registeredModules[dependencies]
      }
      throw new Error(
        dependencies + ' has not been defined. Please include it as a dependency in ' + parentModule + "'s define()"
      )
    }

    const depsLength = dependencies.length

    for (let index = 0; index < depsLength; index++) {
      switch (dependencies[index]) {
        case 'require':
          let _require: typeof require = function (
            new_module: string | string[],
            callback: () => void,
            errorCallback: Function
          ) {
            return require(new_module, callback, errorCallback, parentModule)
          } as any
          _require.toUrl = function (module) {
            return toUrl(module, parentModule)
          }
          dependenciesResults[index] = _require
          loadedCount++
          break
        case 'exports':
          if (!registeredModules[parentModule]) {
            throw new Error('Parent module ' + parentModule + ' not registered yet')
          }

          dependenciesResults[index] = registeredModules[parentModule].exports
          loadedCount++
          break
        case 'module':
          dependenciesResults[index] = {
            id: parentModule,
            uri: toUrl(parentModule)
          }
          loadedCount++
          break
        default: {
          // If we have a circular dependency, then we resolve the module even if it hasn't loaded yet
          const dependency = dependencies[index]

          const hasCycles = hasDependencyPath(dependency, parentModule)

          const handleLoadedModule = () => {
            dependenciesResults[index] = registeredModules[dependency].exports
            loadedCount++
            if (loadedCount === depsLength && callback) {
              hasLoaded = true
              callback(dependenciesResults)
            }
          }

          if (hasCycles) {
            const cyclePath = getCyclePath(dependency, parentModule, 0)
            if (cyclePath) {
              cyclePath.reverse()
              cyclePath.push(dependency)
              cycles.push(cyclePath)
            }
            load(dependency, () => {}, errorCallback, parentModule)
            handleLoadedModule()
          } else {
            load(dependency, handleLoadedModule, errorCallback, parentModule)
          }

          break
        }
      }
    }

    if (!hasLoaded && loadedCount === depsLength && callback) {
      callback(dependenciesResults)
    }
  }

  function createMethodHandler(rpcHandle: string, method: MethodDescriptor) {
    return function () {
      return dcl.callRpc(rpcHandle, method.name, anonymousQueue.slice.call(arguments, 0))
    }
  }

  // returns: resolvedModuleName
  function resolve(fromModule: string, toModule: string) {
    return fromModule ? toUrl(toModule, fromModule) : toModule
  }

  function load(moduleName: string, callback: ModuleLoadedHandler, errorCallback: Function, parentModule: string) {
    if (registeredModules[moduleName]) {
      registeredModules[moduleName].dependants.add(parentModule)

      if (registeredModules[moduleName].dclamd === MODULE_LOADING) {
        callback && registeredModules[moduleName].handlers.push(callback)
      } else {
        callback && callback(registeredModules[moduleName])
      }

      return
    } else {
      registeredModules[moduleName] = {
        name: moduleName,
        parent: parentModule,
        dclamd: MODULE_LOADING,
        handlers: [callback],
        dependencies: [],
        dependants: new Set([parentModule]),
        exports: {}
      }
    }

    if (moduleName.indexOf('@') === 0) {
      let exports = registeredModules[moduleName].exports
      if (typeof dcl.loadModule === 'function') {
        dcl
          .loadModule(moduleName, exports)
          .then((descriptor: ModuleDescriptor) => {
            for (let i in descriptor.methods) {
              const method = descriptor.methods[i]
              exports[method.name] = createMethodHandler(descriptor.rpcHandle, method)
            }

            moduleReady(moduleName)
          })
          .catch((e: any) => {
            errorCallback(e)
          })
      } else {
        throw new Error('Asynchronous modules will not work because loadModule function is not present')
      }
    }
  }

  if (typeof dcl !== 'undefined') {
    dcl.onStart(() => {
      const unknownModules = new Set<string>()
      const notLoadedModules: Module[] = []

      for (let i in registeredModules) {
        if (registeredModules[i]) {
          if (registeredModules[i].dclamd === MODULE_LOADING) {
            notLoadedModules.push(registeredModules[i])
          }

          registeredModules[i].dependencies.forEach(($) => {
            if ($ == 'require' || $ == 'exports' || $ == 'module') return
            if (!registeredModules[$]) unknownModules.add($)
          })
        }
      }

      const errorParts: string[] = []

      if (cycles.length) {
        errorParts.push(`\n> Cyclic dependencies: ${cycles.map(($) => '\n  - ' + $.join(' -> ')).join('')}`)
      }

      if (unknownModules.size) {
        errorParts.push(
          `\n> Undeclared/unknown modules: ${Array.from(unknownModules)
            .map(($) => '\n  - ' + $)
            .join('')}`
        )
      }

      if (notLoadedModules.length) {
        errorParts.push(`\n> These modules didn't load: ${notLoadedModules.map(($) => '\n  - ' + $.name).join('')}.\n`)
      }

      if (errorParts.length) {
        throw new Error(errorParts.join('\n'))
      }
    })
  }

  /**
   * Normalize 'a/../name' to 'name', etc.
   */
  function normalizeModuleId(moduleId: string): string {
    let r = moduleId,
      pattern: RegExp

    // replace /./ => /
    pattern = /\/\.\//
    while (pattern.test(r)) {
      r = r.replace(pattern, '/')
    }

    // replace ^./ => nothing
    r = r.replace(/^\.\//g, '')

    // replace /aa/../ => / (BUT IGNORE /../../)
    pattern = /\/(([^\/])|([^\/][^\/\.])|([^\/\.][^\/])|([^\/][^\/][^\/]+))\/\.\.\//
    while (pattern.test(r)) {
      r = r.replace(pattern, '/')
    }

    // replace ^aa/../ => nothing (BUT IGNORE ../../)
    r = r.replace(/^(([^\/])|([^\/][^\/\.])|([^\/\.][^\/])|([^\/][^\/][^\/]+))\/\.\.\//, '')

    // replace ^/ => nothing
    r = r.replace(/^\//g, '')

    return r
  }

  /**
   * Resolve relative module ids
   */
  function resolveModule(moduleId: string, parentModule: string): string {
    let result = moduleId

    if (!result.startsWith('@')) {
      if (result.startsWith('./') || result.startsWith('../')) {
        const currentPath = parentModule.split('/')
        currentPath.pop()
        result = normalizeModuleId(currentPath.join('/') + '/' + result)
      }
    }

    return result
  }

  function toUrl(moduleName: string, parentModule?: string) {
    switch (moduleName) {
      case 'require':
      case 'exports':
      case 'module':
        return moduleName
    }
    if (parentModule) {
      return resolveModule(moduleName, parentModule)
    }
    return normalizeModuleId(moduleName)
  }

  require.toUrl = toUrl
}

globalObject.define = loader.define
globalObject.dclamd = loader
