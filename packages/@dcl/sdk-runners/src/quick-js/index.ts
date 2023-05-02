import { QuickJSHandle, QuickJSContext, getQuickJS } from '@dcl/quickjs-emscripten'
import { dumpAndDispose, nativeToVmType } from './convert-values'
import { RunWithVmOptions } from './types'

export * from './types'

export async function withQuickJsVm<T>(
  cb: (opts: RunWithVmOptions) => Promise<T>
): Promise<{ result: T; leaking: boolean }> {
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

  vm.unwrapResult(
    vm.evalCode('(t) => { return (t && t instanceof Uint8Array) ? Array.from(t) : null }', 'isUint8Array.js')
  ).consume((isUint8Array) => vm.setProp(vm.global, 'isUint8Array', isUint8Array))

  let result: T
  let leaking = false

  const immediates = setupSetImmediate(vm)

  const ops = Q.getOpcodeInfo()

  try {
    result = await cb({
      eval(code: string, filename?: string) {
        const result = vm.evalCode(code, filename)

        if (result.error) {
          const error = dumpAndDispose(vm, result.error)
          if (error instanceof Error) throw error
          throw Object.assign(new Error(error.toString()), error)
        }

        const $ = vm.unwrapResult(result)
        const ret = dumpAndDispose(vm, $)
        return ret
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
      provide(opts) {
        // create the "console" object
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

        // create a proxy function for "require"
        vm.newFunction('require', (...args) => {
          const localArgs = args.map(($) => $.consume(($) => dumpAndDispose(vm, $)))
          const fns = opts.require(localArgs[0])
          return nativeToVmType(vm, fns)
        }).consume((fn) => vm.setProp(vm.global, 'require', fn))
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
      }
    })
  } catch (err: any) {
    failures.push(err)
    if (err instanceof Error) throw err
    else throw Object.assign(new Error(err.message || `${err}`), err)
  } finally {
    let counter = 1000
    while (immediates.hasPendingJobs() || vm.runtime.hasPendingJob()) {
      if (!counter--) throw new Error("VM won't finish immediates or pending jobs")
      await new Promise((res) => setTimeout(res, 1))
    }

    immediates.dispose()
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

// Notice: setImmediate will be removed from the protocol requirements, until then
// we are implementing a good-enough replacement:
export function setupSetImmediate(vm: QuickJSContext) {
  const immediates: QuickJSHandle[] = []

  vm.newFunction('setImmediate', (fn) => {
    immediates.push(fn.dupable ? fn.dup() : fn)
    fn.dispose()
  }).consume((fn) => vm.setProp(vm.global, 'setImmediate', fn))

  const int = setInterval(() => {
    while (immediates.length) {
      const elem = immediates.shift()!

      try {
        vm.unwrapResult(vm.callFunction(elem, vm.undefined)).dispose()
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error(e.message)
      }

      elem.dispose()
    }

    vm.runtime.executePendingJobs()
  }, 16)

  return {
    hasPendingJobs() {
      return immediates.length > 0
    },
    dispose() {
      clearInterval(int)
    }
  }
}

function callFunctionFromEval(vm: QuickJSContext, codeReturningAFunction: string, arg: any) {
  return vm.unwrapResult(vm.evalCode(codeReturningAFunction)).consume((fn) => {
    return nativeToVmType(vm, arg).consume((arg) => vm.callFunction(fn, vm.global, arg))
  })
}
