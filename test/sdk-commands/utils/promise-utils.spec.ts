import { mapWithConcurrency } from '../../../packages/@dcl/sdk-commands/src/logic/promise-utils'

describe('when mapping asynchronous work with limited concurrency', () => {
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

    result = await mapWithConcurrency([1, 2, 3, 4, 5], mapper, 2)
  })

  it('should preserve input order while keeping work within the limit', () => {
    expect(result).toEqual([2, 4, 6, 8, 10])
    expect(maximumActiveTasks).toBe(2)
    expect(mapper).toHaveBeenCalledTimes(5)
  })
})
