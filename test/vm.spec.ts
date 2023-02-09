import { withQuickJsVm } from './vm'

describe('ensure that VM works', () => {
  it('runs no code and vm has no leaks', async () => withQuickJsVm(async () => {}))

  it('runs empty script and returns without leaks', async () =>
    withQuickJsVm(async (opts) => {
      expect(opts.eval(``)).toEqual(void 0)
    }))

  it('runs script and returns without leaks', async () =>
    withQuickJsVm(async (opts) => {
      expect(opts.eval(`void 0`)).toEqual(void 0)
      expect(opts.eval(`1==1`)).toEqual(true)
    }))

  it('converts qjs types to js', async () =>
    withQuickJsVm(async (opts) => {
      expect(opts.eval(`true`)).toEqual(true)
      expect(opts.eval(`false`)).toEqual(false)
      expect(opts.eval(`null`)).toEqual(null)
      expect(opts.eval(`123`)).toEqual(123)
      expect(opts.eval(`"123"`)).toEqual('123')
      expect(opts.eval(`["123"]`)).toEqual(['123'])
      expect(opts.eval(`(() => ({a: "123"}))()`)).toEqual({ a: '123' })
      expect(opts.eval(`new Uint8Array([1,2,3])`)).toEqual(new Uint8Array([1, 2, 3]))
    }))

  it('doesnt leak on provide', async () =>
    withQuickJsVm(async (opts) => {
      const values: any[] = []
      opts.provide({
        log(...args) {
          values.push(args)
        },
        error() {
          throw new Error('not implemented')
        },
        require() {
          throw new Error('not implemented')
        }
      })
    }))

  it('doesnt leak on log', async () =>
    withQuickJsVm(async (opts) => {
      const values: any[] = []
      opts.provide({
        log(...args) {
          values.push(args)
        },
        error() {
          throw new Error('not implemented')
        },
        require() {
          throw new Error('not implemented')
        }
      })

      opts.eval(`
        console.log(true)
        console.log(false)
        console.log(null)
        console.log(123)
        console.log("123")
        console.log(["123"])
        console.log((() => ({a: "123"}))())
        console.log(new Uint8Array([1,2,3]))
      `)

      expect(values).toEqual([
        [true],
        [false],
        [null],
        [123],
        ['123'],
        [['123']],
        [{ a: '123' }],
        [new Uint8Array([1, 2, 3])]
      ])
    }))

  it('doesnt leak on module call', async () =>
    withQuickJsVm(async (opts) => {
      const values: any[] = []
      opts.provide({
        log() {
          throw new Error('not implemented')
        },
        error() {
          throw new Error('not implemented')
        },
        require() {
          return {
            fn(...args: any[]) {
              values.push(args)
            }
          }
        }
      })

      opts.eval(`
        const m = require('test')
        m.fn(true)
        m.fn(false)
        m.fn(null)
        m.fn(123)
        m.fn("123")
        m.fn(["123"])
        m.fn((() => ({a: "123"}))())
        m.fn(new Uint8Array([1,2,3]))
      `)

      expect(values).toEqual([
        [true],
        [false],
        [null],
        [123],
        ['123'],
        [['123']],
        [{ a: '123' }],
        [new Uint8Array([1, 2, 3])]
      ])
    }))

  it('runs the vm and logs results', async () =>
    withQuickJsVm(async (opts) => {
      const logs: any[] = []
      opts.provide({
        log(...args) {
          logs.push(...args)
        },
        error(...args) {
          logs.push(...args)
        },
        require() {
          throw 'Not implemented'
        }
      })

      opts.eval(`
        console.log(1)
        console.log(typeof exports)
        console.log(typeof module)
        console.log(typeof module.exports)
        console.log(typeof module.asd)
       // console.log({data: new Uint8Array([1,2,3])})
      `)

      expect(logs).toEqual([
        1,
        'object',
        'object',
        'object',
        'undefined'
        // {data: new Uint8Array([1,2,3])}
      ])
    }))

  it('onStart and onUpdate work', async () =>
    withQuickJsVm(async (opts) => {
      const logs: any[] = []
      opts.provide({
        log(...args) {
          logs.push(...args)
        },
        error(...args) {
          logs.push(...args)
        },
        require() {
          throw 'Not implemented'
        }
      })

      opts.eval(`
        module.exports.onStart = async function () {
          console.log('onStart')
        }
        module.exports.onUpdate = async function (dt) {
          console.log('onUpdate', dt)
        }
      `)

      await opts.onStart()
      await opts.onUpdate(0)
      await opts.onUpdate(1)

      expect(logs).toEqual(['onStart', 'onUpdate', 0, 'onUpdate', 1])
    }))

  it('setImmediate works resolving promise', async () =>
    withQuickJsVm(async (opts) => {
      const logs: any[] = []
      opts.provide({
        log(...args) {
          logs.push(...args)
        },
        error() {
          throw 'Not implemented'
        },
        require() {
          throw 'Not implemented'
        }
      })

      opts.eval(`
      module.exports.onUpdate = async function () {
        console.log('onUpdate')
        await new Promise(setImmediate)
        console.log('onUpdateEnd')
      }
    `)

      await opts.onUpdate(1)

      expect(logs).toEqual(['onUpdate', 'onUpdateEnd'])
    }))

  it('onStart and onUpdate fail', async () =>
    withQuickJsVm(async (opts) => {
      const logs: any[] = []
      opts.provide({
        log(...args) {
          logs.push(...args)
        },
        error(...args) {
          logs.push(...args)
        },
        require() {
          throw 'Not implemented'
        }
      })

      opts.eval(`
        module.exports.onStart = async function () {
          console.log('onStart')
          throw new Error('onStartFailed')
        }
        module.exports.onUpdate = async function (dt) {
          console.log('onUpdate', dt)
          await Promise.resolve(1)
          throw new Error('onUpdateFailed')
        }
      `)

      await expect(opts.onStart()).rejects.toThrow('onStartFailed')
      await expect(opts.onUpdate(0)).rejects.toThrow('onUpdateFailed')

      expect(logs).toEqual(['onStart', 'onUpdate', 0])
    }))

  it('require works', async () =>
    withQuickJsVm(async (opts) => {
      const logs: any[] = []
      opts.provide({
        log(...args) {
          logs.push(...args)
        },
        error(...args) {
          logs.push(...args)
        },
        require(moduleName) {
          if (moduleName === 'test') {
            return {
              fnNumber() {
                return 1
              },
              fnBytes() {
                return new Uint8Array([1, 2, 3])
              },
              fnNativeTypes() {
                return {
                  Number: 1,
                  String: 'asd',
                  True: true,
                  False: false,
                  Null: null,
                  Undefined: undefined,
                  nested: { object: true },
                  array: [1, null, false]
                }
              }
            }
          }
        }
      })

      opts.eval(`
        const t = require('test')
        console.log(typeof t.fnNumber)
        console.log(t.fnNumber('test'))
        console.log(['test'])
        console.log(t.fnNativeTypes())
        console.log(new Uint8Array([3,3,3]))
        console.log(
          t.fnBytes(new Uint8Array([1,2,3]))
        )
      `)

      expect(logs).toEqual([
        'function',
        1,
        ['test'],
        {
          False: false,
          Null: null,
          True: true,
          nested: {
            object: true
          },
          Number: 1,
          String: 'asd',
          array: [1, null, false]
        },
        new Uint8Array([3, 3, 3]),
        new Uint8Array([1, 2, 3])
      ])
    }))

  it('promises resolve', async () =>
    withQuickJsVm(async (opts) => {
      const logs: any[] = []
      let wasCalledWithValue: any = -999
      opts.provide({
        log(...args) {
          logs.push(...args)
        },
        error(...args) {
          logs.push(...args)
        },
        require(moduleName) {
          if (moduleName === 'test') {
            return {
              async promise(arg: any) {
                wasCalledWithValue = arg
                return Promise.resolve(1)
              }
            }
          }
        }
      })

      opts.eval(`
        const t = require('test');
        module.exports.onStart = async function() {
          const r = t.promise(123)
          console.log(r instanceof Promise ? 'its a promise' : 'ah re')
          await Promise.resolve(123)
          console.log('awaiting promises work')
          console.log(await r)
          console.log('end')
        }
      `)

      await opts.onStart()

      expect(wasCalledWithValue).toEqual(123)

      expect(logs).toEqual(['its a promise', 'awaiting promises work', 1, 'end'])
    }))

  it('missing onServerUpdate', async () =>
    withQuickJsVm(async (opts) => {
      const logs: any[] = []
      opts.provide({
        log(...args) {
          logs.push(...args)
        },
        error(...args) {
          logs.push(...args)
        },
        require(_moduleName) {
          return {}
        }
      })

      opts.eval(`
        module.exports.onUpdate = async function() {
        }
      `)

      await opts.onUpdate(0.0)
    }))

  it('onServerUpdate works', async () =>
    withQuickJsVm(async (opts) => {
      const logs: any[] = []
      opts.provide({
        log(...args) {
          logs.push(...args)
        },
        error(...args) {
          logs.push(...args)
        },
        require(_moduleName) {
          return {
            async call(data: Uint8Array) {
              logs.push(data)
              const res = await opts.onServerUpdate(data)
              logs.push(res)
              return res
            }
          }
        }
      })

      opts.eval(`
        const t = require('module')
        module.exports.onUpdate = async function() {
          console.log(await t.call(new Uint8Array([1,2,3])))
        }
      `)

      await opts.onUpdate(0.0)

      expect(logs).toEqual([new Uint8Array([1, 2, 3]), new Uint8Array([]), new Uint8Array([])])
    }))
})
