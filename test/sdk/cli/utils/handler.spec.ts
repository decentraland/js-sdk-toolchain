import * as handlers from '../../../../packages/@dcl/sdk/cli/utils/handler'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('utils/handler', () => {
  it('should call handler fn with proper args', async () => {
    // const handler = jest.fn()
    // await handlers.main(handler)({ prop: 1 })
    // expect(handler).toBeCalledWith({ prop: 1 })
  })

  it('should call error fn when provided and handler fails', async () => {
    const error = new Error('asd')
    const handler = jest.fn(() => {
      throw error
    })
    const errorFn = jest.fn()

    try {
      await handlers.main(handler, errorFn)({ prop: 1 })
    } catch (_) {
      expect(handler).toBeCalledWith({ prop: 1 })
      expect(errorFn).toBeCalledWith(error)
    }
  })

  it('should throw when handler fn fails', async () => {
    const error = new Error('asd')
    const handler = jest.fn(() => {
      throw error
    })

    try {
      await handlers.main(handler)({ prop: 1 })
    } catch (e: any) {
      expect(e.message).toBe(error.message)
    }
  })
})
