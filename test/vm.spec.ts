import { withQuickJsVm } from './vm'

describe('ensure that VM works', () => {
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
          if (moduleName == 'test') {
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
          if (moduleName == 'test') {
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
})
