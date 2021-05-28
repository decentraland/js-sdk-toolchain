import 'expect'
import { mockEnvironment } from './helpers'

describe('simple test with external module that doesnt exist and throw', () => {
  const { starters, define, errors } = mockEnvironment({
    ['@throw/test']: async () => ({
      async xxx(...args: number[]) {
        return args.reduce((a, c) => a + c, 0)
      },
      async zzz() {
        throw new Error('unknown zzzz')
      }
    })
  })

  it('defines a module that loads other module that loads @throw/test', async () => {
    define('asyncModule', ['exports', '@throw/test', '@throw/test2', '@throw/tes3'], (exports: any, testDCL: any) => {
      exports.exportedTestDCL = testDCL
    })

    define(['asyncModule'], (asyncModule: any) => {})
  })

  it('starters must not throw', () => {
    expect(starters.length).toBeGreaterThan(0)
    expect(errors).toEqual(['Unknown module @throw/test2', 'Unknown module @throw/tes3'])
    expect(() => starters.forEach(($) => $())).toThrow()
  })
})
