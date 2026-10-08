/**
 * Tests for wrapSignedFetch error handling, in particular that a malformed
 * (non-JSON) response body degrades to an error tuple instead of rejecting.
 */
const mockSignedFetch = jest.fn()

// virtual: the module only exists inside the scene runtime, so jest cannot resolve it
jest.mock('~system/SignedFetch', () => ({ signedFetch: (req: unknown) => mockSignedFetch(req) }), { virtual: true })

jest.mock('../../../packages/@dcl/sdk/src/network', () => ({
  isServer: () => true
}))

import { wrapSignedFetch } from '../../../packages/@dcl/sdk/src/server/utils'

describe('wrapSignedFetch', () => {
  beforeEach(() => {
    mockSignedFetch.mockReset()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  function mockResponse(body: string, ok = true, status = 200) {
    mockSignedFetch.mockResolvedValue({ ok, status, statusText: ok ? 'OK' : 'Error', body })
  }

  it('returns the parsed body and status on success', async () => {
    mockResponse(JSON.stringify({ value: 42 }))

    const [error, data, status] = await wrapSignedFetch<{ value: number }>({ url: 'https://storage.test/values/k' })

    expect(error).toBeNull()
    expect(data).toEqual({ value: 42 })
    expect(status).toBe(200)
  })

  it('returns an empty object when the response body is empty', async () => {
    mockResponse('')

    const [error, data] = await wrapSignedFetch({ url: 'https://storage.test/values/k' })

    expect(error).toBeNull()
    expect(data).toEqual({})
  })

  it('returns an error tuple instead of throwing when the body is not valid JSON', async () => {
    mockResponse('<html>502 Bad Gateway</html>')

    const [error, data, status] = await wrapSignedFetch({ url: 'https://storage.test/values/k' })

    expect(error).toBe('Failed to parse response')
    expect(data).toBeNull()
    expect(status).toBe(200)
  })

  it('returns the status error tuple on a non-ok response', async () => {
    mockResponse('{}', false, 404)

    const [error, data, status] = await wrapSignedFetch({ url: 'https://storage.test/values/k' })

    expect(error).toBe('404 Error')
    expect(data).toBeNull()
    expect(status).toBe(404)
  })

  it('returns the error message when the fetch itself rejects', async () => {
    mockSignedFetch.mockRejectedValue(new Error('network down'))

    const [error, data, status] = await wrapSignedFetch({ url: 'https://storage.test/values/k' })

    expect(error).toBe('network down')
    expect(data).toBeNull()
    expect(status).toBeUndefined()
  })

  describe('when the fetch fails without a usable Error', () => {
    const url = 'https://storage.test/values/k'

    describe('and it rejects with a string', () => {
      let result: unknown

      beforeEach(async () => {
        mockSignedFetch.mockRejectedValueOnce('network down')
        result = await wrapSignedFetch({ url })
      })

      it('should report the string as the error, never as a success', () => {
        expect(result).toEqual(['network down', null, undefined])
      })
    })

    describe('and it rejects with an Error that has no message', () => {
      let result: unknown

      beforeEach(async () => {
        mockSignedFetch.mockRejectedValueOnce(new Error(''))
        result = await wrapSignedFetch({ url })
      })

      it('should report a generic error', () => {
        expect(result).toEqual(['signedFetch failed', null, undefined])
      })
    })

    describe('and it rejects with undefined', () => {
      let result: unknown

      beforeEach(async () => {
        mockSignedFetch.mockRejectedValueOnce(undefined)
        result = await wrapSignedFetch({ url })
      })

      it('should resolve an error tuple rather than reject', () => {
        expect(result).toEqual(['signedFetch failed', null, undefined])
      })
    })

    describe('and it throws synchronously', () => {
      let result: unknown

      beforeEach(async () => {
        mockSignedFetch.mockImplementationOnce(() => {
          throw new Error('bad request shape')
        })
        result = await wrapSignedFetch({ url })
      })

      it('should resolve an error tuple rather than reject', () => {
        expect(result).toEqual(['bad request shape', null, undefined])
      })
    })

    describe('and it resolves with no response', () => {
      let result: unknown

      beforeEach(async () => {
        mockSignedFetch.mockResolvedValueOnce(undefined)
        result = await wrapSignedFetch({ url })
      })

      it('should report it as an error', () => {
        expect(result).toEqual(['signedFetch returned no response', null, undefined])
      })
    })
  })
})
