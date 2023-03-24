import { QuickJSHandle, QuickJSContext, getQuickJS } from '@dcl/quickjs-emscripten'

export type ProvideOptions = {
  log(...args: any[]): void
  error(...args: any[]): void
  require(module: string): any
}

export type OpCodeResult = { count: bigint; opcode: number }
export type MemoryDump = {
  malloc_limit: number
  memory_used_size: number
  malloc_count: number
  memory_used_count: number
  atom_count: number
  atom_size: number
  str_count: number
  str_size: number
  obj_count: number
  obj_size: number
  prop_count: number
  prop_size: number
  shape_count: number
  shape_size: number
  js_func_count: number
  js_func_size: number
  js_func_code_size: number
  js_func_pc2line_count: number
  js_func_pc2line_size: number
  c_func_count: number
  array_count: number
  fast_array_count: number
  fast_array_elements: number
  binary_object_count: number
  binary_object_size: number
}

export type RunWithVmOptions = {
  eval(code: string, filename?: string): void
  onUpdate(dt: number): Promise<any>
  onStart(): Promise<void>
  onServerUpdate(data: Uint8Array): Promise<Uint8Array>
  provide(opts: ProvideOptions): void
  getStats(): { opcodes: OpCodeResult[]; memory: MemoryDump }
  dumpMemory(): string
}

export async function withQuickJsVm<T>(
  cb: (opts: RunWithVmOptions) => Promise<T>
): Promise<{ result: T; leaking: boolean }> {
  // const vm = await newAsyncContext()
  const Q = await getQuickJS()
  const vm = Q.newContext()

  vm.newObject().consume((exports) => {
    vm.newObject().consume((module) => {
      vm.setProp(module, 'exports', exports)
      vm.setProp(vm.global, 'module', module)
    })

    vm.setProp(vm.global, 'exports', exports)
  })

  vm.setProp(vm.global, 'self', vm.global)
  vm.setProp(vm.global, 'global', vm.global)
  const failures: any[] = []

  const immediates: QuickJSHandle[] = []

  vm.newFunction('setImmediate', (fn) => {
    immediates.push(fn.dupable ? fn.dup() : fn)
    fn.dispose()
  }).consume((fn) => vm.setProp(vm.global, 'setImmediate', fn))

  vm.unwrapResult(
    vm.evalCode('(t) => { return (t && t instanceof Uint8Array) ? Array.from(t) : null }', 'isUint8Array.js')
  ).consume((isUint8Array) => vm.setProp(vm.global, 'isUint8Array', isUint8Array))

  const int = setInterval(() => {
    try {
      while (immediates.length) {
        const elem = immediates.shift()!

        try {
          vm.unwrapResult(vm.callFunction(elem, vm.undefined)).dispose()
        } catch (e) {
          console.log(e)
        }

        elem.dispose()
      }

      vm.runtime.executePendingJobs()
    } catch (err) {
      failures.push(err)
      console.log(err)
    }
  }, 1)

  const ops = Q.getOpcodeInfo()

  let result: T
  let leaking = false

  try {
    result = await cb({
      eval(code: string, filename?: string) {
        const result = vm.evalCode(code, filename)
        const $ = vm.unwrapResult(result)
        const ret = dumpAndDispose(vm, $)
        return ret
      },
      getStats() {
        const opcodes = ops.getOpcodesCount()
        ops.resetOpcodeCounters()
        return {
          opcodes,
          memory: dumpAndDispose(vm, vm.runtime.computeMemoryUsage())
        }
      },
      dumpMemory() {
        return vm.runtime.dumpMemoryUsage()
      },
      async onUpdate(dt) {
        const result = vm.evalCode(`module.exports.onUpdate(${JSON.stringify(dt)})`, 'onUpdate')

        const promiseHandle = vm.unwrapResult(result)

        // Convert the promise handle into a native promise and await it.
        // If code like this deadlocks, make sure you are calling
        // runtime.executePendingJobs appropriately.
        const resolvedResult = await vm.resolvePromise(promiseHandle)
        promiseHandle.dispose()
        const resolvedHandle = vm.unwrapResult(resolvedResult)
        return dumpAndDispose(vm, resolvedHandle)
      },
      async onServerUpdate(data: Uint8Array) {
        const result = callFunctionFromEval(
          vm,
          '(module.exports.onServerUpdate || (async () => (new Uint8Array())))',
          data
        )

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
        const result = vm.evalCode(`module.exports.onStart ? module.exports.onStart() : Promise.resolve()`, 'onStart')

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
    failures.push(err)
    throw err
  } finally {
    let counter = 1000
    while (immediates.length || vm.runtime.hasPendingJob()) {
      if (!counter--) throw new Error("VM won't finish immediates or pending jobs")
      await new Promise((res) => setTimeout(res, 1))
    }

    expect(vm.runtime.hasPendingJob()).toEqual(false)
    clearInterval(int)
    try {
      vm.dispose()
    } catch (err: any) {
      if (err.toString().includes('list_empty(&rt->gc_obj_list)') && !failures.length) {
        leaking = true
      } else throw err
    }
    if (failures.length) {
      throw failures[0]
    }
  }
  return { result, leaking }
}

function callFunctionFromEval(vm: QuickJSContext, codeReturningAFunction: string, arg: any) {
  return vm.unwrapResult(vm.evalCode(codeReturningAFunction)).consume((fn) => {
    return nativeToVmType(vm, arg).consume((arg) => vm.callFunction(fn, vm.global, arg))
  })
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
      .then((result: any) => nativeToVmType(vm, result).consume(($) => promise.resolve($)))
      .catch((error: any) => nativeToVmType(vm, error).consume(($) => promise.reject($)))
    // IMPORTANT: Once you resolve an async action inside QuickJS,
    // call runtime.executePendingJobs() to run any code that was
    // waiting on the promise or callback.
    void promise.settled.then(vm.runtime.executePendingJobs)
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
    for (const key of Object.getOwnPropertyNames(value)) {
      nativeToVmType(vm, value[key]).consume(($) => vm.setProp(obj, key, $))
    }
    return obj
  }
  return vm.undefined
}
