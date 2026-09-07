import { concurrentMap } from '../../../packages/@dcl/sdk-commands/src/logic/promise-utils'

describe('concurrentMap', () => {
  describe('when the limit is below the input size', () => {
    let activeTasks: number
    let maximumActiveTasks: number
    let mapper: jest.Mock<Promise<number>, [number]>
    let result: number[]

    beforeEach(async () => {
      activeTasks = 0
      maximumActiveTasks = 0
      mapper = jest.fn(async (value: number): Promise<number> => {
        activeTasks++
        maximumActiveTasks = Math.max(maximumActiveTasks, activeTasks)
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
        activeTasks--
        return value * 2
      })

      result = await concurrentMap([1, 2, 3, 4, 5], mapper, 2)
    })

    it('should resolve with the results in input order', () => {
      expect(result).toEqual([2, 4, 6, 8, 10])
    })

    it('should never run more tasks at once than the limit', () => {
      expect(maximumActiveTasks).toBe(2)
    })

    it('should call the mapper once per value', () => {
      expect(mapper).toHaveBeenCalledTimes(5)
    })
  })

  describe('when the input is empty', () => {
    let mapper: jest.Mock<Promise<number>, [number]>
    let result: number[]

    beforeEach(async () => {
      mapper = jest.fn(async (value: number): Promise<number> => value)

      result = await concurrentMap([], mapper)
    })

    it('should resolve with an empty array', () => {
      expect(result).toEqual([])
    })

    it('should not call the mapper', () => {
      expect(mapper).not.toHaveBeenCalled()
    })
  })

  describe('when the limit exceeds the input size', () => {
    let mapper: jest.Mock<Promise<number>, [number]>
    let result: number[]

    beforeEach(async () => {
      mapper = jest.fn(async (value: number): Promise<number> => value * 2)

      result = await concurrentMap([1, 2, 3], mapper, 10)
    })

    it('should map every value exactly once', () => {
      expect(result).toEqual([2, 4, 6])
    })
  })

  describe('when the limit is not a positive number', () => {
    let activeTasks: number
    let maximumActiveTasks: number
    let result: number[]

    beforeEach(async () => {
      activeTasks = 0
      maximumActiveTasks = 0

      result = await concurrentMap(
        [1, 2, 3],
        async (value: number): Promise<number> => {
          activeTasks++
          maximumActiveTasks = Math.max(maximumActiveTasks, activeTasks)
          await new Promise<void>((resolve) => setTimeout(resolve, 0))
          activeTasks--
          return value * 2
        },
        0
      )
    })

    it('should still map every value in order', () => {
      expect(result).toEqual([2, 4, 6])
    })

    it('should fall back to a single worker', () => {
      expect(maximumActiveTasks).toBe(1)
    })
  })

  describe('when the mapper rejects for one value', () => {
    let failure: Error
    let mapper: jest.Mock<Promise<number>, [number]>
    let rejection: unknown

    beforeEach(async () => {
      failure = new Error('mapper failed')
      mapper = jest.fn(async (value: number): Promise<number> => {
        if (value === 2) throw failure
        return value * 2
      })

      rejection = await concurrentMap([1, 2, 3], mapper, 2).catch((error) => error)
    })

    it('should reject with the original error', () => {
      expect(rejection).toBe(failure)
    })
  })
})
