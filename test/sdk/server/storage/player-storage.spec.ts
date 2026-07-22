/**
 * Tests for player storage getValues (list/prefix/pagination) method.
 * Mocks storage-url and utils so no real server or runtime is required.
 */
const mockGetStorageServerUrl = jest.fn()
const mockWrapSignedFetch = jest.fn()

jest.mock('../../../../packages/@dcl/sdk/src/server/storage-url', () => ({
  getStorageServerUrl: () => mockGetStorageServerUrl()
}))

jest.mock('../../../../packages/@dcl/sdk/src/server/utils', () => ({
  assertIsServer: () => {},
  wrapSignedFetch: (req: { url: string }) => mockWrapSignedFetch(req)
}))

import { createStorageConfig } from '../../../../packages/@dcl/sdk/src/server/storage/constants'
import { createPlayerStorage } from '../../../../packages/@dcl/sdk/src/server/storage/player'

describe('player storage', () => {
  const baseUrl = 'https://storage.test'
  const address = '0x1234567890123456789012345678901234567890'

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageServerUrl.mockResolvedValue(baseUrl)
  })

  describe('getValues', () => {
    it('should request /players/:address/values and return entries when no prefix is passed', async () => {
      const playerStorage = createPlayerStorage()
      const data = [
        { key: 'k1', value: 'v1' },
        { key: 'k2', value: 42 }
      ]
      mockWrapSignedFetch.mockResolvedValue([null, { data }])

      const result = await playerStorage.getValues(address)

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/players/${encodeURIComponent(address)}/values`
      })
      expect(result).toEqual({ data, pagination: { offset: 0, total: data.length } })
    })

    it('should request /players/:address/values?prefix=... and return matching entries when prefix is passed', async () => {
      const playerStorage = createPlayerStorage()
      const data = [{ key: 'pref-x', value: true }]
      mockWrapSignedFetch.mockResolvedValue([null, { data }])

      const result = await playerStorage.getValues(address, { prefix: 'pref-' })

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/players/${encodeURIComponent(address)}/values?prefix=pref-`
      })
      expect(result).toEqual({ data, pagination: { offset: 0, total: data.length } })
    })

    it('should request /players/:address/values?limit=...&offset=... when limit and offset are passed', async () => {
      const playerStorage = createPlayerStorage()
      const data = [{ key: 'score', value: 100 }]
      mockWrapSignedFetch.mockResolvedValue([null, { data, pagination: { offset: 10, total: 1 } }])

      const result = await playerStorage.getValues(address, { limit: 10, offset: 10 })

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/players/${encodeURIComponent(address)}/values?limit=10&offset=10`
      })
      expect(result).toEqual({ data, pagination: { offset: 10, total: 1 } })
    })

    it('should request /players/:address/values?prefix=...&limit=...&offset=... when prefix, limit and offset are passed', async () => {
      const playerStorage = createPlayerStorage()
      const data: Array<{ key: string; value: unknown }> = []
      mockWrapSignedFetch.mockResolvedValue([null, { data, pagination: { offset: 10, total: 0 } }])

      const result = await playerStorage.getValues(address, { prefix: 'inv-', limit: 5, offset: 10 })

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/players/${encodeURIComponent(address)}/values?prefix=inv-&limit=5&offset=10`
      })
      expect(result).toEqual({ data: [], pagination: { offset: 10, total: 0 } })
    })

    it('should return empty array when the request fails', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue(['Error', null])

      const result = await playerStorage.getValues(address)

      expect(result).toEqual({ data: [], pagination: { offset: 0, total: 0 } })
    })
  })

  describe('set', () => {
    it('should skip the PUT for an unchanged value by default', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      expect(await playerStorage.set(address, 'score', 42)).toBe(true)
      expect(await playerStorage.set(address, 'score', 42)).toBe(true)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/players/${encodeURIComponent(address)}/values/score`,
        init: {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: 42 })
        }
      })
    })

    it('should skip the PUT for an unchanged value when skipIfUnchanged is passed', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      expect(await playerStorage.set(address, 'score', 42, { skipIfUnchanged: true })).toBe(true)
      expect(await playerStorage.set(address, 'score', 42, { skipIfUnchanged: true })).toBe(true)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should not dedupe across different addresses', async () => {
      const playerStorage = createPlayerStorage()
      const otherAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      await playerStorage.set(address, 'score', 42, { skipIfUnchanged: true })
      await playerStorage.set(otherAddress, 'score', 42, { skipIfUnchanged: true })

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should dedupe addresses case-insensitively', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      await playerStorage.set('0xAbCdefAbcdEFabcdefabcdefabcdefabcdefabcd', 'score', 42, { skipIfUnchanged: true })
      await playerStorage.set('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'score', 42, { skipIfUnchanged: true })

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should dedupe by configured default and allow a per-call false to force the PUT', async () => {
      const playerStorage = createPlayerStorage(createStorageConfig({ skipIfUnchanged: true }))
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      await playerStorage.set(address, 'score', 42)
      await playerStorage.set(address, 'score', 42)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

      await playerStorage.set(address, 'score', 42, { skipIfUnchanged: false })
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('get and set interplay', () => {
    it('should populate the cache from get so an unchanged write is skipped', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: { hp: 100 } }])

      expect(await playerStorage.get(address, 'state')).toEqual({ hp: 100 })
      expect(await playerStorage.set(address, 'state', { hp: 100 }, { skipIfUnchanged: true })).toBe(true)

      // Only the GET hit the network.
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('delete', () => {
    it('should invalidate the cache so a later identical set writes again', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      await playerStorage.set(address, 'score', 42, { skipIfUnchanged: true })
      expect(await playerStorage.delete(address, 'score')).toBe(true)
      await playerStorage.set(address, 'score', 42, { skipIfUnchanged: true })

      // set + delete + set all hit the network.
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('get read caching', () => {
    function deferred<T>() {
      let resolve!: (value: T) => void
      const promise = new Promise<T>((r) => (resolve = r))
      return { promise, resolve }
    }

    it('should serve a repeated get from cache', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: { hp: 100 } }, 200])

      expect(await playerStorage.get(address, 'state')).toEqual({ hp: 100 })
      expect(await playerStorage.get(address, 'state')).toEqual({ hp: 100 })

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should bypass the cache with fresh: true and refresh it with the result', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'A' }, 200])
      expect(await playerStorage.get(address, 'key')).toBe('A')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'B' }, 200])
      expect(await playerStorage.get(address, 'key', { fresh: true })).toBe('B')

      expect(await playerStorage.get(address, 'key')).toBe('B')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should cache a confirmed 404 as absent', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])

      expect(await playerStorage.get(address, 'missing')).toBeNull()
      expect(await playerStorage.get(address, 'missing')).toBeNull()

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should serve null from the negative cache after a successful delete', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 1 }, 200])
      expect(await playerStorage.get(address, 'key')).toBe(1)

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await playerStorage.delete(address, 'key')).toBe(true)

      expect(await playerStorage.get(address, 'key')).toBeNull()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should coalesce concurrent gets case-insensitively per address, never across addresses', async () => {
      const playerStorage = createPlayerStorage()
      const mixedCaseAddress = '0xAbCdefAbcdEFabcdefabcdefabcdefabcdefabcd'
      const lowerCaseAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      const request = deferred<[null, { value: number }, number]>()
      const otherRequest = deferred<[null, { value: number }, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => request.promise)
      mockWrapSignedFetch.mockImplementationOnce(() => otherRequest.promise)

      const gets = Promise.all([
        playerStorage.get(mixedCaseAddress, 'key'),
        playerStorage.get(lowerCaseAddress, 'key'),
        playerStorage.get(address, 'key')
      ])
      request.resolve([null, { value: 1 }, 200])
      otherRequest.resolve([null, { value: 2 }, 200])

      expect(await gets).toEqual([1, 1, 2])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should seed the per-key cache from getValues, scoped to the address', async () => {
      const playerStorage = createPlayerStorage()
      const otherAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'a', value: 1 }] }])

      await playerStorage.getValues(address)
      expect(await playerStorage.get(address, 'a')).toBe(1)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

      // The seed for one address must not serve another address's reads.
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 2 }, 200])
      expect(await playerStorage.get(otherAddress, 'a')).toBe(2)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })
  })
})
