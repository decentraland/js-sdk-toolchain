/**
 * Tests for player storage: reads, writes, the read cache and the write queue.
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
    it('should reject with the storage prefix when the storage URL cannot be resolved', async () => {
      const playerStorage = createPlayerStorage()
      mockGetStorageServerUrl.mockRejectedValueOnce(new Error('realm down'))

      await expect(playerStorage.getValues(address)).rejects.toThrow(
        `Failed to get player storage values for '${address}': realm down`
      )
    })

    it('should not seed a key whose read is in flight, since that read settles the entry', async () => {
      const playerStorage = createPlayerStorage()
      const read = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => read.promise)
      const reading = playerStorage.get(address, 'a')
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'a', value: 'from page' }] }])
      await playerStorage.getValues(address)
      read.resolve(['500 Internal Server Error', null, 500])
      await expect(reading).rejects.toThrow('500 Internal Server Error')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'fresh' }, 200])
      expect(await playerStorage.get(address, 'a')).toBe('fresh')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

    it('should not let a page overwrite a value a read confirmed before the listing started', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'confirmed' }, 200])
      expect(await playerStorage.get(address, 'a')).toBe('confirmed')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'a', value: 'from page' }] }])
      await playerStorage.getValues(address)

      expect(await playerStorage.get(address, 'a')).toBe('confirmed')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should reject a page that carries an entry without a string key or without a value', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'good', value: 1 }, { key: 'novalue' }] }])

      await expect(playerStorage.getValues(address)).rejects.toThrow(
        `Failed to get player storage values for '${address}': response carried a malformed entry`
      )
    })

    it('should not re-seed a key that a failed write invalidated while the page was in flight', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v1' }, 200])
      expect(await playerStorage.get(address, 'k')).toBe('v1')

      const page = deferred<[null, { data: Array<{ key: string; value: string }> }]>()
      mockWrapSignedFetch.mockReturnValueOnce(page.promise)
      const listing = playerStorage.getValues(address)
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      expect(await playerStorage.set(address, 'k', 'v2')).toBe(false)

      page.resolve([null, { data: [{ key: 'k', value: 'v1' }] }])
      await listing

      // Without the guard the page re-seeds 'v1' and this write is skipped as unchanged.
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await playerStorage.set(address, 'k', 'v1')).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(4)
      expect(mockWrapSignedFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          init: expect.objectContaining({ method: 'PUT', body: JSON.stringify({ value: 'v1' }) })
        })
      )
    })

    it('should reject when the request fails', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue(['Server error', null])

      await expect(playerStorage.getValues(address)).rejects.toThrow(
        `Failed to get player storage values for '${address}': Server error`
      )
    })

    it('should reject a successful response whose data is not a list', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValue([null, { data: {} }, 200])

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
      mockWrapSignedFetch.mockResolvedValue([null, { data, pagination: { offset: 0, total: 1 } }])

      const result = await playerStorage.getValues(address, { limit: 10, offset: 10 })

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/players/${encodeURIComponent(address)}/values?limit=10&offset=10`
      })
      expect(result).toEqual({ data, pagination: { offset: 0, total: 1 } })
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
    it('should return false and log, sending nothing, when the storage URL cannot be resolved', async () => {
      const playerStorage = createPlayerStorage()
      const error = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockGetStorageServerUrl.mockRejectedValueOnce(new Error('realm down'))

      try {
        expect(await playerStorage.set(address, 'key', 1)).toBe(false)
        expect(mockWrapSignedFetch).not.toHaveBeenCalled()
        expect(error).toHaveBeenCalledWith(`Failed to set player storage value 'key' for '${address}': realm down`)
      } finally {
        error.mockRestore()
      }
    })

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
      const playerStorage = createPlayerStorage(createStorageConfig({ skipIfUnchanged: false }))
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
    it.each([
      ['an undefined array element', [undefined], '"0" is undefined or a hole in an array'],
      ['a typed array', new Uint8Array([1]), 'the value is a Uint8Array, which has no JSON form'],
      ['an unpaired surrogate', 'a\udc00', 'the value contains an unpaired surrogate or a NUL character']
    ])('should reject %s rather than store it changed', async (_label, value, reason) => {
      const playerStorage = createPlayerStorage()

      await expect(playerStorage.set(address, 'key', value)).rejects.toThrow(reason)
      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
    })

    it.each([
      ['NaN', NaN, 'the value is the non-finite number NaN'],
      ['a nested Infinity', { score: Infinity }, '"score" is the non-finite number Infinity'],
      ['a Set', new Set([1]), 'the value is a Set']
    ])('should reject %s rather than store it changed', async (_label, value, reason) => {
      const playerStorage = createPlayerStorage()

      await expect(playerStorage.set(address, 'key', value)).rejects.toThrow(
        `Storage.player.set('${address}', 'key'): value must be JSON-serializable, but ${reason}`
      )
      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
    })

    it('should reject a nested function rather than persist the value without it', async () => {
      const playerStorage = createPlayerStorage()

      await expect(playerStorage.set(address, 'key', { callback: () => 1 })).rejects.toThrow(
        `Storage.player.set('${address}', 'key'): value must be JSON-serializable, but "callback" is a function. Use delete() to remove a key.`
      )
      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
    })

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

    it('should cache the absence a 404 confirms, so the next read is local', async () => {
      const playerStorage = createPlayerStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])
      await playerStorage.delete(address, 'seeds')

      expect(await playerStorage.get(address, 'seeds')).toBeNull()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
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
    it('should not join the in-flight PUT when skipIfUnchanged is false', async () => {
      const playerStorage = createPlayerStorage()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put.promise)
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      const first = playerStorage.set(address, 'key', 7)
      const second = playerStorage.set(address, 'key', 7, { skipIfUnchanged: false })
      await flush()
      put.resolve([null, {}])

      expect(await Promise.all([first, second])).toEqual([true, true])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should not skip an unchanged write as a duplicate while a newer write to the key is still pending', async () => {
      const playerStorage = createPlayerStorage()
      const put1 = deferred<[null, object]>()
      const put2 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise).mockImplementationOnce(() => put2.promise)
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      const first = playerStorage.set(address, 'key', 1)
      await flush()
      const second = playerStorage.set(address, 'key', 2)
      put1.resolve([null, {}])
      expect(await first).toBe(true)
      await flush()

      const third = playerStorage.set(address, 'key', 1, { skipIfUnchanged: true })
      put2.resolve([null, {}])
      expect(await Promise.all([second, third])).toEqual([true, true])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

    it('should drop the landed value when the queued write behind it fails', async () => {
      const playerStorage = createPlayerStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])

      const first = playerStorage.set(address, 'key', 1)
      await flush()
      const second = playerStorage.set(address, 'key', 2)
      put1.resolve([null, {}])
      expect(await Promise.all([first, second])).toEqual([true, false])

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await playerStorage.set(address, 'key', 1, { skipIfUnchanged: true })).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

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
    it('should also wait for the write that replaced the queued one, then answer from it without a network read', async () => {
      const playerStorage = createPlayerStorage()
      const put1 = deferred<[null, object]>()
      const put3 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementation((req: { init?: { method?: string; body?: string } }) => {
        if (req.init?.method !== 'PUT') return Promise.resolve([null, { value: 'v1' }, 200])
        return req.init.body === JSON.stringify({ value: 'v1' }) ? put1.promise : put3.promise
      })

      const first = playerStorage.set(address, 'k', 'v1')
      await flush()
      const second = playerStorage.set(address, 'k', 'v2')
      const reading = playerStorage.get(address, 'k')
      await flush()
      const third = playerStorage.set(address, 'k', 'v3')

      put1.resolve([null, {}])
      expect(await first).toBe(true)
      await flush()
      expect(mockWrapSignedFetch.mock.calls.map((call) => call[0].init?.method ?? 'GET')).toEqual(['PUT', 'PUT'])

      put3.resolve([null, {}])
      expect(await Promise.all([second, third])).toEqual([true, true])
      expect(await reading).toBe('v3')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should answer a read parked behind a landed write from it, even with a later write already in flight', async () => {
      const playerStorage = createPlayerStorage()
      const putA = deferred<[null, object]>()
      const putB = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementation((req: { init?: { method?: string; body?: string } }) =>
        req.init?.body === JSON.stringify({ value: 'a' }) ? putA.promise : putB.promise
      )

      const writingA = playerStorage.set(address, 'k', 'a')
      await flush()
      const reading = playerStorage.get(address, 'k')
      await flush()
      const writingB = playerStorage.set(address, 'k', 'b')

      putA.resolve([null, {}])
      expect(await writingA).toBe(true)
      expect(await reading).toBe('a')
      expect(mockWrapSignedFetch.mock.calls.map((call) => call[0].init?.method ?? 'GET')).toEqual(['PUT', 'PUT'])

      putB.resolve([null, {}])
      expect(await writingB).toBe(true)
      expect(await playerStorage.get(address, 'k')).toBe('b')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should not wait for a write issued after the read, nor let the late answer overwrite that write', async () => {
      const playerStorage = createPlayerStorage()
      const putA = deferred<[string, null, number]>()
      const putB = deferred<[null, object]>()
      const read = deferred<[null, { value: string }, number]>()
      mockWrapSignedFetch.mockImplementation((req: { init?: { method?: string; body?: string } }) => {
        if (req.init?.method !== 'PUT') return read.promise
        return req.init.body === JSON.stringify({ value: 'a' }) ? putA.promise : putB.promise
      })

      const writingA = playerStorage.set(address, 'k', 'a')
      await flush()
      const reading = playerStorage.get(address, 'k')
      await flush()
      const writingB = playerStorage.set(address, 'k', 'b')

      putA.resolve(['500 Internal Server Error', null, 500])
      expect(await writingA).toBe(false)
      await flush()
      expect(mockWrapSignedFetch.mock.calls.map((call) => call[0].init?.method ?? 'GET')).toEqual(['PUT', 'PUT', 'GET'])

      putB.resolve([null, {}])
      expect(await writingB).toBe(true)
      read.resolve([null, { value: 'old' }, 200])
      expect(await reading).toBe('old')
      expect(await playerStorage.get(address, 'k')).toBe('b')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

    it('should answer a read issued while a write is queued behind another from the queued write, without a network read', async () => {
      const playerStorage = createPlayerStorage()
      const firstPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(firstPut.promise)
      const first = playerStorage.set(address, 'k', 'v1')
      await flush()
      const secondPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(secondPut.promise)
      const second = playerStorage.set(address, 'k', 'v2')

      const reading = playerStorage.get(address, 'k')
      firstPut.resolve([null, {}])
      expect(await first).toBe(true)
      await flush()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)

      secondPut.resolve([null, {}])
      expect(await second).toBe(true)
      expect(await reading).toBe('v2')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
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

    it('should answer a read issued during a write from that write once it lands, without a network read', async () => {
      const playerStorage = createPlayerStorage()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(put.promise)
      const writing = playerStorage.set(address, 'k', 'v2')
      await flush()

      const reading = playerStorage.get(address, 'k')
      await flush()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

      put.resolve([null, {}])
      expect(await writing).toBe(true)
      expect(await reading).toBe('v2')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('superseded writes', () => {
    it('should resolve a set superseded by a delete to false when the DELETE fails, never reject it', async () => {
      const playerStorage = createPlayerStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      const first = playerStorage.set(address, 'k', 'a')
      await flush()
      const second = playerStorage.set(address, 'k', 'b')
      const deleting = playerStorage.delete(address, 'k')

      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      put1.resolve([null, {}])
      await Promise.allSettled([first, second, deleting])

      expect(await first).toBe(true)
      expect(await second).toBe(false)
      await expect(deleting).rejects.toThrow('500 Internal Server Error')
    })

    it('should reject a delete superseded by a set when the PUT fails, naming the player key', async () => {
      const playerStorage = createPlayerStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      const first = playerStorage.set(address, 'k', 'a')
      await flush()
      const deleting = playerStorage.delete(address, 'k')
      const third = playerStorage.set(address, 'k', 'c')

      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      put1.resolve([null, {}])
      await Promise.allSettled([first, deleting, third])

      expect(await first).toBe(true)
      expect(await third).toBe(false)
      await expect(deleting).rejects.toThrow(
        `Failed to delete player storage value 'k' for '${address}': a write that replaced it did not apply`
      )
    })
  })

  describe('delete when the storage URL cannot be resolved', () => {
    it('should reject with the storage error prefix', async () => {
      const playerStorage = createPlayerStorage()
      mockGetStorageServerUrl.mockRejectedValueOnce(new Error('realm down'))

      await expect(playerStorage.delete(address, 'key')).rejects.toThrow(
        `Failed to delete player storage value 'key' for '${address}': realm down`
      )
    })
  })

  describe('get read caching', () => {
    it('should reject with the storage prefix when the storage URL cannot be resolved', async () => {
      const playerStorage = createPlayerStorage()
      mockGetStorageServerUrl.mockRejectedValueOnce(new Error('realm down'))

      await expect(playerStorage.get(address, 'key')).rejects.toThrow(
        `Failed to get player storage value 'key' for '${address}': realm down`
      )
    })

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

  describe('when an address or key cannot address a player entry', () => {
    it.each([['..'], ['.'], [''], ['not-an-address'], ['0x123']])(
      'should reject the address %j in every method before sending',
      async (bad) => {
        const playerStorage = createPlayerStorage()
        const calls = [
          playerStorage.get(bad, 'k'),
          playerStorage.set(bad, 'k', 1),
          playerStorage.delete(bad, 'k'),
          playerStorage.getValues(bad)
        ]
        const outcomes = await Promise.all(
          calls.map((p) =>
            p.then(
              () => 'resolved',
              (e: unknown) => (e instanceof TypeError ? 'TypeError' : 'Error')
            )
          )
        )

        // '..' would otherwise resolve /players/../values/k to the scene's own /values/k.
        expect([outcomes, mockWrapSignedFetch.mock.calls.length]).toEqual([
          ['TypeError', 'TypeError', 'TypeError', 'TypeError'],
          0
        ])
      }
    )

    it.each([[''], ['..'], ['a\ud800']])('should reject the key %j before sending', async (key) => {
      const playerStorage = createPlayerStorage()

      await expect(playerStorage.set(address, key, 1)).rejects.toThrow(TypeError)
      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
    })
  })
})
