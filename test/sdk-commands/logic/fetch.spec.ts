import { withDeadline } from '../../../packages/@dcl/sdk-commands/src/logic/fetch'

function neverSettles(): Promise<string> {
  return new Promise(() => undefined)
}

describe('when running an operation with a deadline', () => {
  let operation: jest.Mock<Promise<string>, [AbortSignal]>
  let result: unknown

  beforeEach(() => {
    operation = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and the operation settles in time', () => {
    beforeEach(async () => {
      operation.mockResolvedValueOnce('done')
      result = await withDeadline(operation, { timeoutMs: 1000 })
    })

    it('should resolve with its result', () => {
      expect(result).toBe('done')
    })

    it('should hand it a signal that is not aborted', () => {
      expect(operation.mock.calls[0][0].aborted).toBe(false)
    })
  })

  describe('and the operation outlives the timeout without following the signal', () => {
    beforeEach(async () => {
      operation.mockImplementationOnce(neverSettles)
      result = await withDeadline(operation, { timeoutMs: 10 }).catch((e) => e)
    })

    it('should reject with a timeout error', () => {
      expect(result).toEqual(expect.objectContaining({ name: 'TimeoutError' }))
    })

    it('should abort the signal handed to the operation', () => {
      expect(operation.mock.calls[0][0].aborted).toBe(true)
    })
  })

  describe('and the caller aborts while the operation runs without following the signal', () => {
    beforeEach(async () => {
      operation.mockImplementationOnce(neverSettles)
      const controller = new AbortController()
      const running = withDeadline(operation, { signal: controller.signal }).catch((e) => e)
      controller.abort()
      result = await running
    })

    it('should reject with the abort reason', () => {
      expect(result).toEqual(expect.objectContaining({ name: 'AbortError' }))
    })
  })

  describe('and the caller aborted before it started', () => {
    beforeEach(async () => {
      result = await withDeadline(operation, { signal: AbortSignal.abort() }).catch((e) => e)
    })

    it('should reject without running the operation', () => {
      expect({ error: result, calls: operation.mock.calls.length }).toEqual({
        error: expect.objectContaining({ name: 'AbortError' }),
        calls: 0
      })
    })
  })
})
