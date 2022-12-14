import { newAsyncContext, QuickJSHandle, QuickJSContext, getQuickJS } from '@dcl/quickjs-emscripten'

export type ProvideOptions = {
  log(...args: any[]): void
  error(...args: any[]): void
  require(module: string): any
}

export type RunWithVmOptions = {
  eval(code: string): void
  onUpdate(dt: number): Promise<any>
  onStart(): Promise<void>
  provide(opts: ProvideOptions): void
}

export async function withQuickJsVm<T>(cb: (opts: RunWithVmOptions) => Promise<T>): Promise<T> {
  // const vm = await newAsyncContext()
  const Q = await getQuickJS()
  const vm = Q.newContext()

  const module = vm.newObject()
  const exports = vm.newObject()

  vm.setProp(module, 'exports', exports)
  vm.setProp(vm.global, 'module', module)
  vm.setProp(vm.global, 'exports', exports)
  vm.setProp(vm.global, 'self', vm.global)
  vm.setProp(vm.global, 'global', vm.global)

  vm.unwrapResult(vm.evalCode('(t) => { return (t && t instanceof Uint8Array) ? Array.from(t) : null }')).consume(
    (isUint8Array) => vm.setProp(vm.global, 'isUint8Array', isUint8Array)
  )

  const int = setInterval(() => vm.runtime.executePendingJobs(), 1)

  let failure: any = null

  try {
    return await cb({
      eval(code: string) {
        const result = vm.evalCode(code)
        const $ = vm.unwrapResult(result)
        const ret = dumpAndDispose(vm, $)
        return ret
      },
      async onUpdate(dt) {
        const result = vm.evalCode(`exports.onUpdate(${JSON.stringify(dt)})`)

        const promiseHandle = vm.unwrapResult(result)

        // Convert the promise handle into a native promise and await it.
        // If code like this deadlocks, make sure you are calling
        // runtime.executePendingJobs appropriately.
        const resolvedResult = await vm.resolvePromise(promiseHandle)
        promiseHandle.dispose()
        const resolvedHandle = vm.unwrapResult(resolvedResult)
        return dumpAndDispose(vm, resolvedHandle)
      },
      async onStart() {
        const result = vm.evalCode(`exports.onStart ? exports.onStart() : Promise.resolve()`)

        const promiseHandle = vm.unwrapResult(result)

        // Convert the promise handle into a native promise and await it.
        // If code like this deadlocks, make sure you are calling
        // runtime.executePendingJobs appropriately.
        const resolvedResult = await vm.resolvePromise(promiseHandle)
        promiseHandle.dispose()
        const resolvedHandle = vm.unwrapResult(resolvedResult)
        return dumpAndDispose(vm, resolvedHandle)
      },
      provide(opts) {
        vm.newObject().consume((console) => {
          vm.newFunction('log', (...args) => {
            const localArgs = args.map(($) => $.consume(($) => dumpAndDispose(vm, $)))
            opts.log(...localArgs)
          }).consume((fn) => vm.setProp(console, 'log', fn))
          vm.newFunction('error', (...args) => {
            const localArgs = args.map(($) => $.consume(($) => dumpAndDispose(vm, $)))
            opts.error(...localArgs)
          }).consume((fn) => vm.setProp(console, 'error', fn))
          vm.setProp(vm.global, 'console', console)
        })

        vm.newFunction('require', (...args) => {
          const localArgs = args.map(($) => $.consume(($) => dumpAndDispose(vm, $)))
          const fns = opts.require(localArgs[0])
          return nativeToVmType(vm, fns)
        }).consume((fn) => vm.setProp(vm.global, 'require', fn))
      }
    })
  } catch (err: any) {
    failure = err
    throw err
  } finally {
    expect(vm.runtime.hasPendingJob()).toEqual(false)
    clearInterval(int)
    module.dispose()
    exports.dispose()
    try {
      vm.dispose()
    } catch (err: any) {
      if (err.toString().includes('list_empty(&rt->gc_obj_list)') && !failure) {
        throw new Error('Ran succesfully but leaking memory')
      } else throw err
    }
  }
}

function dumpAndDispose(vm: QuickJSContext, val: QuickJSHandle) {
  const ret = vm.getProp(vm.global, 'isUint8Array').consume((fn) => vm.callFunction(fn, vm.global, val))
  const isUint8Array = vm.unwrapResult(ret).consume(vm.dump)
  if (isUint8Array) {
    val.dispose()
    return new Uint8Array(isUint8Array)
  } else {
    const ret = vm.dump(val)
    val.dispose()
    return ret
  }
}

// recusion is my passion
function nativeToVmType(vm: QuickJSContext, value: any): QuickJSHandle {
  if (typeof value === 'number') return vm.newNumber(value)
  if (typeof value === 'string') return vm.newString(value)
  if (typeof value === 'boolean') return value ? vm.true : vm.false
  if (typeof value === 'boolean') return value ? vm.true : vm.false
  if (value === undefined) return vm.undefined
  if (value === null) return vm.null
  if (value instanceof Uint8Array) {
    const code = `new Uint8Array(${JSON.stringify(Array.from(value))})`
    return vm.unwrapResult(vm.evalCode(code))
  }
  if (value && typeof value === 'object' && typeof value.then === 'function' && typeof value.catch === 'function') {
    const promise = vm.newPromise()
    value
      .then((result: any) => nativeToVmType(vm, result).consume($ => promise.resolve($)))
      .catch((error: any) => nativeToVmType(vm, error).consume($ => promise.reject($)))
    // IMPORTANT: Once you resolve an async action inside QuickJS,
    // call runtime.executePendingJobs() to run any code that was
    // waiting on the promise or callback.
    promise.settled.then(vm.runtime.executePendingJobs)
    return promise.handle
  }
  if (typeof value === 'function') {
    return vm.newFunction('a', (...args) => {
      const localArgs = args.map(($) => $.consume(($) => dumpAndDispose(vm, $)))
      const val = value(...localArgs)

      return nativeToVmType(vm, val)
    })
  }
  if (Array.isArray(value)) {
    const array = vm.newArray()
    for (let i = 0; i < value.length; i++) {
      nativeToVmType(vm, value[i]).consume(($) => vm.setProp(array, i, $))
    }
    return array
  }
  if (typeof value === 'object') {
    const obj = vm.newObject()
    for (let key of Object.getOwnPropertyNames(value)) {
      nativeToVmType(vm, value[key]).consume(($) => vm.setProp(obj, key, $))
    }
    return obj
  }
  return vm.undefined
}
