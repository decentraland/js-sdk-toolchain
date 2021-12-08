import future from 'fp-future'
import { mockEnvironment } from './helpers'

describe('simple circular deps', () => {
  const { starters, define, errors } = mockEnvironment({})

  it('defines two circular deps', async () => {
    define('dep-a', ['exports', './dep-b'], (exports: any, _b: any) => {
      exports.a = 1
    })

    define('dep-b', ['exports', './dep-a'], (exports: any, _a: any) => {
      exports.b = 1
    })

    const resolvedTimeout = future<any>()

    const resolvedImmediate = new Promise((resolve) => {
      define('a/b/c', ['../../dep-a', 'dep-b'], (depA: any, depB: any) => {
        resolve(JSON.parse(JSON.stringify({ depA, depB })))
        setTimeout(
          () =>
            resolvedTimeout.resolve(JSON.parse(JSON.stringify({ depA, depB }))),
          100
        )
      })
    })

    expect(await resolvedImmediate).toEqual({
      depA: { a: 1 },
      depB: { b: 1 }
    })

    expect(await resolvedTimeout).toEqual({
      depA: { a: 1 },
      depB: { b: 1 }
    })
  })

  it('starters must not throw', () => {
    expect(starters.length).toBeGreaterThan(0)
    expect(() => starters.forEach(($) => $())).toThrow(
      'dep-a -> dep-b -> dep-a'
    )
    expect(errors).toEqual([])
  })
})
