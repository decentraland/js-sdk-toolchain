/* eslint-disable @typescript-eslint/ban-ts-comment */
import { deepReadonly } from '../../packages/@dcl/ecs/src/engine/readonly'
import { isNotUndefined } from './utils'

declare let process: { env: any }

describe('Engine utils', () => {
  it('Should fail if you try to update a readonly prop', () => {
    const obj = {
      prop: {
        nested: {
          superNested: 'boedo'
        }
      }
    }

    const readonlyObj = deepReadonly(obj)
    // @ts-ignore
    expect(() => (readonlyObj.prop = 1)).toThrowError()
  })

  it('Should not fail if you try to update a readonly prop on production (perf issues) 👀', () => {
    process.env.PRODUCTION = 'true'
    const obj = {
      prop: {
        nested: {
          superNested: 'boedo'
        }
      }
    }

    const readonlyObj = deepReadonly(obj)
    // @ts-ignore
    readonlyObj.prop.nested.superNested = 'casla'
    expect(readonlyObj.prop.nested.superNested).toBe('casla')
    process.env.PRODUCTION = ''
  })

  it('should filter undefined values on array', () => {
    const array: (number | undefined)[] = [1, 2, 3, undefined]
    const newArray = array.filter(isNotUndefined)
    expect(newArray).toStrictEqual([1, 2, 3])
  })

  describe('when development readonly checks are disabled', () => {
    let value: { x: number }

    beforeEach(() => {
      value = { x: 1 }
    })

    it('should return the original value without allocating a frozen copy', () => {
      expect(deepReadonly(value, false)).toBe(value)
    })
  })
})
