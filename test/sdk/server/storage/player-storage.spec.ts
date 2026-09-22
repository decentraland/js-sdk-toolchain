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
    jest.resetAllMocks()
    mockGetStorageServerUrl.mockResolvedValue(baseUrl)
  })

  describe('getValues', () => {
    it('should reject when the request fails', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue(['Server error', null])

      await expect(playerStorage.getValues(address)).rejects.toThrow(
        `Failed to get player storage values for '${address}': Server error`
      )
    })

    it('should reject a successful response whose data is not a list', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}, 200])

      await expect(playerStorage.getValues(address)).rejects.toThrow(
        `Failed to get player storage values for '${address}': response carried no data array`
      )
    })

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

  describe('set value serialization', () => {
    it('should reject undefined rather than send a payload the service refuses', async () => {
      const playerStorage = createPlayerStorage()

      await expect(playerStorage.set(address, 'seeds', undefined)).rejects.toThrow('value must be JSON-serializable')
      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
    })

    it('should still store a legitimate null', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      expect(await playerStorage.set(address, 'seeds', null)).toBe(true)
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
    it('should reject a failed delete rather than report it as a confirmed absence', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])

      await expect(playerStorage.delete(address, 'seeds')).rejects.toThrow(
        `Failed to delete player storage value 'seeds' for '${address}': 500 Internal Server Error`
      )
    })

    it('should still resolve false for a confirmed 404', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])

      expect(await playerStorage.delete(address, 'seeds')).toBe(false)
    })

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

  function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((r) => (resolve = r))
    return { promise, resolve }
  }

  /** Lets queued executors advance to their network call. */
  const flush = () => new Promise((r) => setTimeout(r, 0))

  describe('write serialization', () => {
    it('should serialize overlapping sets per player key and coalesce to the latest value', async () => {
      const playerStorage = createPlayerStorage()
      const firstPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => firstPut.promise)
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      const results = Promise.all([
        playerStorage.set(address, 'key', 1),
        playerStorage.set(address, 'key', 2),
        playerStorage.set(address, 'key', 3)
      ])
      await flush()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
      firstPut.resolve([null, {}])

      expect(await results).toEqual([true, true, true])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
      expect(mockWrapSignedFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ init: expect.objectContaining({ body: JSON.stringify({ value: 3 }) }) })
      )

      expect(await playerStorage.get(address, 'key')).toBe(3)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should serialize writes case-insensitively across address casings', async () => {
      const playerStorage = createPlayerStorage()
      const firstPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => firstPut.promise)
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      const first = playerStorage.set(address, 'key', 1)
      const second = playerStorage.set(address.toUpperCase().replace('0X', '0x'), 'key', 2)
      await flush()

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
      firstPut.resolve([null, {}])

      expect(await first).toBe(true)
      expect(await second).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should not let a stale getValues page overwrite a newer write', async () => {
      const playerStorage = createPlayerStorage()
      const list = deferred<[null, { data: Array<{ key: string; value: unknown }> }]>()
      mockWrapSignedFetch.mockImplementationOnce(() => list.promise)

      const listing = playerStorage.getValues(address)

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await playerStorage.set(address, 'a', 'new')

      list.resolve([null, { data: [{ key: 'a', value: 'stale' }] }])
      await listing

      expect(await playerStorage.get(address, 'a')).toBe('new')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('queued writes and the cache', () => {
    it('should not cache a completed write while a newer write to the same key is queued', async () => {
      const playerStorage = createPlayerStorage()
      const firstPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(firstPut.promise)

      const first = playerStorage.set(address, 'k', 'v1')
      await flush()
      const secondPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(secondPut.promise)
      const second = playerStorage.set(address, 'k', 'v2')

      firstPut.resolve([null, {}])
      await first

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v2' }, 200])
      expect(await playerStorage.get(address, 'k')).toBe('v2')

      secondPut.resolve([null, {}])
      await second
    })

    it('should reject every get joined to one failed request', async () => {
      const playerStorage = createPlayerStorage()
      const request = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockReturnValueOnce(request.promise)

      const first = playerStorage.get(address, 'seeds')
      const second = playerStorage.get(address, 'seeds')
      request.resolve(['500 Internal Server Error', null, 500])

      await expect(first).rejects.toThrow('500 Internal Server Error')
      await expect(second).rejects.toThrow('500 Internal Server Error')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('get read caching', () => {
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

    it('should reject a failed read rather than resolve null like a missing key', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])

      await expect(playerStorage.get(address, 'seeds')).rejects.toThrow(
        `Failed to get player storage value 'seeds' for '${address}': 500 Internal Server Error`
      )
    })

    it('should reject a 200 response with a missing value and not cache it', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}, 200])

      await expect(playerStorage.get(address, 'seeds')).rejects.toThrow(
        `Failed to get player storage value 'seeds' for '${address}': response carried no value`
      )
      await expect(playerStorage.get(address, 'seeds')).rejects.toThrow(
        `Failed to get player storage value 'seeds' for '${address}': response carried no value`
      )

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should not cache a failed read', async () => {
      const playerStorage = createPlayerStorage()

      mockWrapSignedFetch.mockResolvedValueOnce(['network down', null])
      await expect(playerStorage.get(address, 'seeds')).rejects.toThrow('network down')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 3 }, 200])
      expect(await playerStorage.get(address, 'seeds')).toBe(3)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
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
