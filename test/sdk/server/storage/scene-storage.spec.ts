/**
 * Tests for scene storage getValues (list/prefix/pagination) method.
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
import { createSceneStorage } from '../../../../packages/@dcl/sdk/src/server/storage/scene'

describe('scene storage', () => {
  const baseUrl = 'https://storage.test'

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageServerUrl.mockResolvedValue(baseUrl)
  })

  describe('getValues', () => {
    it('should request /values and return entries when no prefix is passed', async () => {
      const storage = createSceneStorage()
      const data = [
        { key: 'a', value: 1 },
        { key: 'b', value: { nested: true } }
      ]
      mockWrapSignedFetch.mockResolvedValue([null, { data }])

      const result = await storage.getValues()

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({ url: `${baseUrl}/values` })
      expect(result).toEqual({ data, pagination: { offset: 0, total: data.length } })
    })

    it('should request /values?prefix=... and return matching entries when prefix is passed', async () => {
      const storage = createSceneStorage()
      const data = [
        { key: 'player-1', value: 'alice' },
        { key: 'player-2', value: 'bob' }
      ]
      mockWrapSignedFetch.mockResolvedValue([null, { data }])

      const result = await storage.getValues({ prefix: 'player-' })

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/values?prefix=player-`
      })
      expect(result).toEqual({ data, pagination: { offset: 0, total: data.length } })
    })

    it('should request /values?limit=...&offset=... when limit and offset are passed', async () => {
      const storage = createSceneStorage()
      const data = [{ key: 'a', value: 1 }]
      mockWrapSignedFetch.mockResolvedValue([null, { data, pagination: { offset: 10, total: 1 } }])

      const result = await storage.getValues({ limit: 10, offset: 10 })

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/values?limit=10&offset=10`
      })
      expect(result).toEqual({ data, pagination: { offset: 10, total: 1 } })
    })

    it('should request /values?prefix=...&limit=...&offset=... when prefix, limit and offset are passed', async () => {
      const storage = createSceneStorage()
      const data: Array<{ key: string; value: unknown }> = []
      mockWrapSignedFetch.mockResolvedValue([null, { data, pagination: { offset: 10, total: 0 } }])

      const result = await storage.getValues({ prefix: 'pref-', limit: 5, offset: 10 })

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/values?prefix=pref-&limit=5&offset=10`
      })
      expect(result).toEqual({ data: [], pagination: { offset: 10, total: 0 } })
    })

    it('should return empty array when the request fails', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue(['Server error', null])

      const result = await storage.getValues()

      expect(result).toEqual({ data: [], pagination: { offset: 0, total: 0 } })
    })
  })

  describe('set', () => {
    it('should skip the PUT for an unchanged value by default', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      expect(await storage.set('score', 42)).toBe(true)
      expect(await storage.set('score', 42)).toBe(true)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/values/score`,
        init: {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: 42 })
        }
      })
    })

    it('should skip the PUT for an unchanged value when skipIfUnchanged is passed', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      expect(await storage.set('score', 42, { skipIfUnchanged: true })).toBe(true)
      expect(await storage.set('score', 42, { skipIfUnchanged: true })).toBe(true)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should PUT again when the value changed', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      await storage.set('score', 42, { skipIfUnchanged: true })
      await storage.set('score', 43, { skipIfUnchanged: true })

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should not cache a failed PUT, so the next skipIfUnchanged set retries', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['500 Server error', null])

      expect(await storage.set('score', 42, { skipIfUnchanged: true })).toBe(false)

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await storage.set('score', 42, { skipIfUnchanged: true })).toBe(true)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should dedupe by configured default and allow a per-call false to force the PUT', async () => {
      const storage = createSceneStorage(createStorageConfig({ skipIfUnchanged: true }))
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      await storage.set('score', 42)
      await storage.set('score', 42)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

      await storage.set('score', 42, { skipIfUnchanged: false })
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should PUT again once the cache entry exceeds cacheMaxAgeMs', async () => {
      const storage = createSceneStorage(createStorageConfig({ cacheMaxAgeMs: 1000 }))
      mockWrapSignedFetch.mockResolvedValue([null, {}])
      const nowSpy = jest.spyOn(Date, 'now')

      try {
        nowSpy.mockReturnValue(10_000)
        await storage.set('score', 42, { skipIfUnchanged: true })

        nowSpy.mockReturnValue(11_500)
        await storage.set('score', 42, { skipIfUnchanged: true })

        expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
      } finally {
        nowSpy.mockRestore()
      }
    })
  })

  describe('get and set interplay', () => {
    it('should populate the cache from get so an unchanged write is skipped', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: { hp: 100 } }])

      expect(await storage.get('player-state')).toEqual({ hp: 100 })
      expect(await storage.set('player-state', { hp: 100 }, { skipIfUnchanged: true })).toBe(true)

      // Only the GET hit the network.
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should not populate the cache from a failed get', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['Server error', null])

      expect(await storage.get('player-state')).toBeNull()

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.set('player-state', null, { skipIfUnchanged: true })

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('delete', () => {
    it('should invalidate the cache on a successful delete', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      await storage.set('score', 42, { skipIfUnchanged: true })
      expect(await storage.delete('score')).toBe(true)
      await storage.set('score', 42, { skipIfUnchanged: true })

      // set + delete + set all hit the network.
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

    it('should invalidate the cache even when the delete request fails', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.set('score', 42, { skipIfUnchanged: true })

      mockWrapSignedFetch.mockResolvedValueOnce(['Server error', null])
      expect(await storage.delete('score')).toBe(false)

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.set('score', 42, { skipIfUnchanged: true })

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('get read caching', () => {
    function deferred<T>() {
      let resolve!: (value: T) => void
      const promise = new Promise<T>((r) => (resolve = r))
      return { promise, resolve }
    }

    it('should serve a repeated get from cache with fresh objects per hit', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: { hp: 100 } }, 200])

      const first = await storage.get<{ hp: number }>('player-state')
      const second = await storage.get<{ hp: number }>('player-state')

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
      expect(second).toEqual(first)
      expect(second).not.toBe(first)

      // Mutating a returned object must not leak into later cache hits.
      first!.hp = 1
      expect(await storage.get('player-state')).toEqual({ hp: 100 })
    })

    it('should re-fetch once the cached entry exceeds cacheMaxAgeMs', async () => {
      const storage = createSceneStorage(createStorageConfig({ cacheMaxAgeMs: 1000 }))
      mockWrapSignedFetch.mockResolvedValue([null, { value: 1 }, 200])
      const nowSpy = jest.spyOn(Date, 'now')

      try {
        nowSpy.mockReturnValue(10_000)
        await storage.get('score')

        nowSpy.mockReturnValue(11_500)
        await storage.get('score')

        expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
      } finally {
        nowSpy.mockRestore()
      }
    })

    it('should bypass the cache with fresh: true and refresh it with the result', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'A' }, 200])

      expect(await storage.get('key')).toBe('A')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'B' }, 200])
      expect(await storage.get('key', { fresh: true })).toBe('B')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)

      // The fresh read refreshed the cache, so a plain get serves B locally.
      expect(await storage.get('key')).toBe('B')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should coalesce concurrent gets for the same key into one request', async () => {
      const storage = createSceneStorage()
      const request = deferred<[null, { value: string }, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => request.promise)

      const gets = Promise.all([storage.get('key'), storage.get('key'), storage.get('key')])
      request.resolve([null, { value: 'shared' }, 200])

      expect(await gets).toEqual(['shared', 'shared', 'shared'])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should let a fresh get join an already in-flight request', async () => {
      const storage = createSceneStorage()
      const request = deferred<[null, { value: number }, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => request.promise)

      const plain = storage.get('key')
      const fresh = storage.get('key', { fresh: true })
      request.resolve([null, { value: 7 }, 200])

      expect(await plain).toBe(7)
      expect(await fresh).toBe(7)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should cache a confirmed 404 as absent', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])

      expect(await storage.get('missing')).toBeNull()
      expect(await storage.get('missing')).toBeNull()

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should never cache non-404 errors', async () => {
      const storage = createSceneStorage()

      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      expect(await storage.get('key')).toBeNull()

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 1 }, 200])
      expect(await storage.get('key')).toBe(1)

      // Statusless transport errors are not cached either.
      mockWrapSignedFetch.mockResolvedValueOnce(['network down', null])
      expect(await storage.get('other')).toBeNull()

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 2 }, 200])
      expect(await storage.get('other')).toBe(2)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(4)
    })

    it('should overwrite a cached absence with a successful set', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])
      expect(await storage.get('key')).toBeNull()

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await storage.set('key', 5)).toBe(true)

      // Served from the write-through cache entry.
      expect(await storage.get('key')).toBe(5)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should invalidate the read cache when a set fails', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 1 }, 200])
      expect(await storage.get('key')).toBe(1)

      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      expect(await storage.set('key', 2)).toBe(false)

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 1 }, 200])
      expect(await storage.get('key')).toBe(1)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

    it('should serve null from the negative cache after a successful delete', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 1 }, 200])
      expect(await storage.get('key')).toBe(1)

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await storage.delete('key')).toBe(true)

      expect(await storage.get('key')).toBeNull()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should seed the per-key cache from getValues for reads and write dedup', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'a', value: 1 }] }])

      await storage.getValues()

      expect(await storage.get('a')).toBe(1)
      expect(await storage.set('a', 1, { skipIfUnchanged: true })).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should hit the network per get with cacheReads: false while still coalescing', async () => {
      const storage = createSceneStorage(createStorageConfig({ cacheReads: false }))
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 1 }, 200])
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 1 }, 200])

      expect(await storage.get('key')).toBe(1)
      expect(await storage.get('key')).toBe(1)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)

      // Coalescing shares a live request, which is never stale.
      const request = deferred<[null, { value: number }, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => request.promise)
      const gets = Promise.all([storage.get('key'), storage.get('key')])
      request.resolve([null, { value: 2 }, 200])

      expect(await gets).toEqual([2, 2])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

    it('should not let a stale in-flight get clobber a newer set', async () => {
      const storage = createSceneStorage()
      const staleGet = deferred<[null, { value: string }, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => staleGet.promise)

      const pendingGet = storage.get('key')

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await storage.set('key', 'new')).toBe(true)

      staleGet.resolve([null, { value: 'old' }, 200])
      expect(await pendingGet).toBe('old')

      // The set's write-through entry survived the stale response.
      expect(await storage.get('key')).toBe('new')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should not cache a 200 response with a missing value', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}, 200])

      expect(await storage.get('key')).toBeNull()
      expect(await storage.get('key')).toBeNull()

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should cache a stored null as a positive entry', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: null }, 200])

      expect(await storage.get('key')).toBeNull()
      expect(await storage.get('key')).toBeNull()

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })
  })
})
