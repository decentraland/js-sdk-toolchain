import { newAsyncContext, QuickJSHandle, QuickJSContext } from "@dcl/quickjs-emscripten"

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
  const vm = await newAsyncContext()

  const module = vm.newObject()
  const exports = vm.newObject()

  vm.setProp(module, 'exports', exports)
  vm.setProp(vm.global, 'module', module)
  vm.setProp(vm.global, 'exports', exports)
  vm.setProp(vm.global, 'self', vm.global)
  vm.setProp(vm.global, 'global', vm.global)
  vm.setProp(
    vm.global,
    'isUint8Array',
    vm.unwrapResult(vm.evalCode('(t) => { return (t && t instanceof Uint8Array) ? Array.from(t) : null }'))
  )

  function dump(val: QuickJSHandle) {
    const ret = vm.callFunction(vm.getProp(vm.global, 'isUint8Array'), vm.global, val)
    if (ret.error) {
      const er = vm.dump(ret.error)
      console.dir(er)
      throw Object.assign(new Error(er.message + er.stack), { name: er.name })
    }
    const isUint8Array = vm.unwrapResult(ret).consume(vm.dump)
    if (isUint8Array) {
      return new Uint8Array(isUint8Array)
    }
    return vm.dump(val)
  }
  const int = setInterval(() => vm.runtime.executePendingJobs(), 1)

  try {
    return await cb({
      eval(code: string) {
        const err = vm.evalCode(code)
        if (err.error) {
          const er = dump(err.error)
          console.dir(er)
          throw Object.assign(new Error(er.message + er.stack), { name: er.name })
        }
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
        resolvedHandle.dispose()
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
        resolvedHandle.dispose()
      },
      provide(opts) {
        vm.newObject().consume((console) => {
          vm.newFunction('log', (...args) => {
            const localArgs = args.map(dump)
            opts.log(...localArgs)
          }).consume((fn) => vm.setProp(console, 'log', fn))
          vm.newFunction('error', (...args) => {
            const localArgs = args.map(dump)
            opts.error(...localArgs)
          }).consume((fn) => vm.setProp(console, 'error', fn))
          vm.setProp(vm.global, 'console', console)
        })

        vm.newFunction('require', (...args) => {
          const localArgs = args.map(dump)
          const fns = opts.require(localArgs[0])
          return betterInverseDump(vm, fns)
        }).consume((fn) => vm.setProp(vm.global, 'require', fn))
      }
    })
  } finally {
    clearInterval(int)
    module.dispose()
    exports.dispose()
    vm.dispose()
  }
}

// recusion is my passion
function betterInverseDump(vm: QuickJSContext, value: any): QuickJSHandle {
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
      .then((result: any) => promise.resolve(betterInverseDump(vm, result)))
      .catch((error: any) => promise.reject(betterInverseDump(vm, error)))
    // IMPORTANT: Once you resolve an async action inside QuickJS,
    // call runtime.executePendingJobs() to run any code that was
    // waiting on the promise or callback.
    promise.settled.then(vm.runtime.executePendingJobs)
    return promise.handle
  }
  if (typeof value === 'function') {
    return vm.newFunction('a', (...args) => {
      const localArgs = args.map(vm.dump)
      const val = value(...localArgs)

      return betterInverseDump(vm, val)
    })
  }
  if (Array.isArray(value)) {
    const array = vm.newArray()
    for (let i = 0; i < value.length; i++) {
      vm.setProp(array, i, betterInverseDump(vm, value[i]))
    }
    return array
  }
  if (typeof value === 'object') {
    const obj = vm.newObject()
    for (let key of Object.getOwnPropertyNames(value)) {
      betterInverseDump(vm, value[key]).consume((value) => vm.setProp(obj, key, value))
    }
    return obj
  }
  return vm.undefined
}
