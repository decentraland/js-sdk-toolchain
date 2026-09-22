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
    jest.resetAllMocks()
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

    it('should reject when the request fails', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue(['Server error', null])

      await expect(storage.getValues()).rejects.toThrow('Failed to get storage values: Server error')
    })

    it('should not re-seed a key that a failed write invalidated while the page was in flight', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v1' }, 200])
      expect(await storage.get('k')).toBe('v1')

      const page = deferred<[null, { data: Array<{ key: string; value: string }> }]>()
      mockWrapSignedFetch.mockReturnValueOnce(page.promise)
      const listing = storage.getValues()
      await flush()

      // The PUT fails, so the stored value is unknown and the entry is dropped.
      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      expect(await storage.set('k', 'v2')).toBe(false)

      page.resolve([null, { data: [{ key: 'k', value: 'v1' }] }])
      await listing

      // Without the guard the page re-seeds 'v1' and this write is skipped as unchanged.
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await storage.set('k', 'v1')).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ init: expect.objectContaining({ method: 'PUT' }) })
      )
    })

    it('should skip entries that carry no usable key or value and still seed the rest of the page', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([
        null,
        { data: [null, { value: 'orphan' }, { key: 'novalue' }, { key: 'good', value: 1 }] }
      ])

      await storage.getValues()

      // 'good' was seeded and is served locally; 'novalue' was not and reads from the network.
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'network' }, 200])
      expect(await storage.get('good')).toBe(1)
      expect(await storage.get('novalue')).toBe('network')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should reject a successful response whose data is not a list', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}, 200])

      await expect(storage.getValues()).rejects.toThrow('Failed to get storage values: response carried no data array')
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

      await expect(storage.get('player-state')).rejects.toThrow('Server error')

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

    it('should reject a failed delete rather than report it as a confirmed absence', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])

      await expect(storage.delete('key')).rejects.toThrow(
        "Failed to delete storage value 'key': 500 Internal Server Error"
      )
    })

    it('should still resolve false for a confirmed 404', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])

      expect(await storage.delete('key')).toBe(false)
    })

    it('should reject with the storage error prefix when the storage URL cannot be resolved', async () => {
      const storage = createSceneStorage()
      mockGetStorageServerUrl.mockRejectedValueOnce(new Error('realm down'))

      await expect(storage.delete('key')).rejects.toThrow("Failed to delete storage value 'key': Error: realm down")
    })

    it('should not serve a value cached during an in-flight delete that then fails', async () => {
      const storage = createSceneStorage()
      const deleteCall = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockReturnValueOnce(deleteCall.promise)

      const deleting = storage.delete('key')
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'stale' }, 200])
      expect(await storage.get('key')).toBe('stale')

      deleteCall.resolve(['500 Internal Server Error', null, 500])
      await expect(deleting).rejects.toThrow('500 Internal Server Error')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'fresh' }, 200])
      expect(await storage.get('key')).toBe('fresh')
    })

    it('should invalidate the cache even when the delete request fails', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.set('score', 42, { skipIfUnchanged: true })

      mockWrapSignedFetch.mockResolvedValueOnce(['Server error', null])
      await expect(storage.delete('score')).rejects.toThrow('Server error')

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.set('score', 42, { skipIfUnchanged: true })

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
    it('should hold a second set for a key until the in-flight PUT lands, preserving issue order', async () => {
      const storage = createSceneStorage()
      const firstPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => firstPut.promise)
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      const first = storage.set('key', 'v1')
      const second = storage.set('key', 'v2')
      await flush()

      // v2 must not race v1 on the network.
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

      firstPut.resolve([null, {}])
      expect(await first).toBe(true)
      expect(await second).toBe(true)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
      expect(mockWrapSignedFetch).toHaveBeenLastCalledWith({
        url: `${baseUrl}/values/key`,
        init: {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: 'v2' })
        }
      })

      // The cache asserts the last write issued, served locally.
      expect(await storage.get('key')).toBe('v2')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should coalesce rapid writes into at most two PUTs, keeping the latest value', async () => {
      const storage = createSceneStorage()
      const firstPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => firstPut.promise)
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      const results = Promise.all([storage.set('key', 1), storage.set('key', 2), storage.set('key', 3)])
      await flush()
      firstPut.resolve([null, {}])

      expect(await results).toEqual([true, true, true])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
      expect(mockWrapSignedFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ init: expect.objectContaining({ body: JSON.stringify({ value: 3 }) }) })
      )

      expect(await storage.get('key')).toBe(3)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should join concurrent identical sets into the in-flight PUT', async () => {
      const storage = createSceneStorage()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put.promise)

      const first = storage.set('key', 7)
      const second = storage.set('key', 7)
      await flush()
      put.resolve([null, {}])

      expect(await first).toBe(true)
      expect(await second).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should not join the in-flight PUT when skipIfUnchanged is false', async () => {
      const storage = createSceneStorage()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put.promise)
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      const first = storage.set('key', 7)
      // An always-write caller expects a PUT issued at-or-after its call.
      const second = storage.set('key', 7, { skipIfUnchanged: false })
      await flush()
      put.resolve([null, {}])

      expect(await first).toBe(true)
      expect(await second).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should serialize a delete behind an in-flight set', async () => {
      const storage = createSceneStorage()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put.promise)
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      const setting = storage.set('key', 'v')
      const deleting = storage.delete('key')
      await flush()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

      put.resolve([null, {}])
      expect(await setting).toBe(true)
      expect(await deleting).toBe(true)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
      expect(mockWrapSignedFetch).toHaveBeenLastCalledWith({
        url: `${baseUrl}/values/key`,
        init: { method: 'DELETE', headers: {} }
      })

      // Issue order won: the key ends up absent, served from the negative cache.
      expect(await storage.get('key')).toBeNull()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should fail coalesced writers and invalidate the cache when their PUT fails', async () => {
      const storage = createSceneStorage()
      const firstPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => firstPut.promise)
      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null])

      const first = storage.set('key', 1)
      const second = storage.set('key', 2)
      await flush()
      firstPut.resolve([null, {}])

      expect(await first).toBe(true)
      expect(await second).toBe(false)

      // The failed flush invalidated the entry, so the retry hits the network.
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await storage.set('key', 2)).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('getValues seeding race guard', () => {
    it('should not let a page overwrite per-key state confirmed while the list was in flight', async () => {
      const storage = createSceneStorage()
      const list = deferred<[null, { data: Array<{ key: string; value: unknown }> }]>()
      mockWrapSignedFetch.mockImplementationOnce(() => list.promise)

      const listing = storage.getValues()

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.set('a', 'new')

      list.resolve([
        null,
        {
          data: [
            { key: 'a', value: 'stale' },
            { key: 'b', value: 2 }
          ]
        }
      ])
      await listing

      // 'a' keeps the write-through value; unknown 'b' was seeded.
      expect(await storage.get('a')).toBe('new')
      expect(await storage.get('b')).toBe(2)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should not seed keys whose write is still pending when the page lands', async () => {
      const storage = createSceneStorage()
      const list = deferred<[null, { data: Array<{ key: string; value: unknown }> }]>()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => list.promise)
      mockWrapSignedFetch.mockImplementationOnce(() => put.promise)

      const listing = storage.getValues()
      const setting = storage.set('a', 'new')
      await flush()

      list.resolve([null, { data: [{ key: 'a', value: 'stale' }] }])
      await listing

      put.resolve([null, {}])
      expect(await setting).toBe(true)

      expect(await storage.get('a')).toBe('new')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it("should keep a delete's negative entry over a stale page value", async () => {
      const storage = createSceneStorage()
      const list = deferred<[null, { data: Array<{ key: string; value: unknown }> }]>()
      mockWrapSignedFetch.mockImplementationOnce(() => list.promise)

      const listing = storage.getValues()

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.delete('a')

      list.resolve([null, { data: [{ key: 'a', value: 'stale' }] }])
      await listing

      expect(await storage.get('a')).toBeNull()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('set value serialization', () => {
    it('should reject undefined rather than send a payload the service refuses', async () => {
      const storage = createSceneStorage()

      await expect(storage.set('key', undefined)).rejects.toThrow(
        "Storage.set('key'): value must be JSON-serializable. Use delete() to remove a key."
      )
      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
    })

    it('should reject a function, which serializes to the same empty payload', async () => {
      const storage = createSceneStorage()

      await expect(storage.set('key', () => undefined)).rejects.toThrow('must be JSON-serializable')
    })

    it('should reject a circular value', async () => {
      const storage = createSceneStorage()
      const circular: Record<string, unknown> = {}
      circular.self = circular

      await expect(storage.set('key', circular)).rejects.toThrow(TypeError)
    })

    it('should still store a legitimate null', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      expect(await storage.set('key', null)).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledWith(
        expect.objectContaining({ init: expect.objectContaining({ body: '{"value":null}' }) })
      )
    })
  })

  describe('read-your-own-writes', () => {
    it('should not serve the previous value from cache while the write is in flight', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.set('key', 'v1')

      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(put.promise)
      const writing = storage.set('key', 'v2')
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v2' }, 200])
      expect(await storage.get('key')).toBe('v2')

      put.resolve([null, {}])
      await writing
    })

    it('should not let a fresh read join a request issued before the caller wrote', async () => {
      const storage = createSceneStorage()
      const firstGet = deferred<[null, { value: string }, number]>()
      mockWrapSignedFetch.mockReturnValueOnce(firstGet.promise)

      const reading = storage.get('key')
      await flush()

      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(put.promise)
      const writing = storage.set('key', 'v2')
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v2' }, 200])
      const fresh = storage.get('key', { fresh: true })

      firstGet.resolve([null, { value: 'v1' }, 200])
      put.resolve([null, {}])
      await reading
      await writing

      expect(await fresh).toBe('v2')
    })
  })

  describe('queued writes and the cache', () => {
    it('should not cache a completed write while a newer write to the same key is queued', async () => {
      const storage = createSceneStorage()
      const firstPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(firstPut.promise)

      const first = storage.set('k', 'v1')
      await flush()
      const secondPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(secondPut.promise)
      const second = storage.set('k', 'v2')

      firstPut.resolve([null, {}])
      await first

      // v2 is still in flight: a read must go to the network, not serve v1 from cache.
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v2' }, 200])
      expect(await storage.get('k')).toBe('v2')

      secondPut.resolve([null, {}])
      await second
    })

    it('should not cache an absence for a completed delete while a newer set to the same key is queued', async () => {
      const storage = createSceneStorage()
      const del = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(del.promise)

      const deleting = storage.delete('k')
      await flush()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(put.promise)
      const writing = storage.set('k', 'v')

      del.resolve([null, {}])
      await deleting

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v' }, 200])
      expect(await storage.get('k')).toBe('v')

      put.resolve([null, {}])
      await writing
    })

    it('should not cache a read answered while a write to the key is in flight', async () => {
      const storage = createSceneStorage()
      const put2 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put2.promise)
      const second = storage.set('k', 'v2')
      await flush()
      const third = storage.set('k', 'v3')

      // The server answers the read before it applied v2.
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v1' }, 200])
      expect(await storage.get('k')).toBe('v1')

      const put3 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put3.promise)
      put2.resolve([null, {}])
      await second
      await flush()

      // v2 landed and v3 is in flight: the read must reach the network rather than serve v1.
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v2' }, 200])
      expect(await storage.get('k')).toBe('v2')

      put3.resolve([null, {}])
      await third
    })

    it('should not cache an absence answered while a write to the key is in flight', async () => {
      const storage = createSceneStorage()
      const put2 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put2.promise)
      const second = storage.set('k', 'v2')
      await flush()
      const third = storage.set('k', 'v3')

      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])
      expect(await storage.get('k')).toBeNull()

      const put3 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put3.promise)
      put2.resolve([null, {}])
      await second
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v2' }, 200])
      expect(await storage.get('k')).toBe('v2')

      put3.resolve([null, {}])
      await third
    })

    it('should not cache a read answered while a delete of the key is in flight', async () => {
      const storage = createSceneStorage()
      const del = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => del.promise)
      const deleting = storage.delete('k')
      await flush()
      const writing = storage.set('k', 'w')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'old' }, 200])
      expect(await storage.get('k')).toBe('old')

      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put.promise)
      del.resolve([null, {}])
      await deleting
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])
      expect(await storage.get('k')).toBeNull()

      put.resolve([null, {}])
      await writing
    })
  })

  describe('superseded writes', () => {
    it('should resolve a set superseded by a delete to false when the DELETE fails, never reject it', async () => {
      const storage = createSceneStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      const first = storage.set('k', 'a')
      await flush()
      const second = storage.set('k', 'b')
      const deleting = storage.delete('k')

      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      put1.resolve([null, {}])
      await Promise.allSettled([first, second, deleting])

      expect(await first).toBe(true)
      expect(await second).toBe(false)
      await expect(deleting).rejects.toThrow('500 Internal Server Error')
    })

    it('should resolve a set superseded by a delete to true once the key is confirmed absent', async () => {
      const storage = createSceneStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      const first = storage.set('k', 'a')
      await flush()
      const second = storage.set('k', 'b')
      const deleting = storage.delete('k')

      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])
      put1.resolve([null, {}])
      await Promise.allSettled([first, second, deleting])

      expect(await first).toBe(true)
      expect(await second).toBe(true)
      expect(await deleting).toBe(false)
    })

    it('should reject a delete superseded by a set when the PUT fails, instead of reporting a confirmed absence', async () => {
      const storage = createSceneStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      const first = storage.set('k', 'a')
      await flush()
      const deleting = storage.delete('k')
      const third = storage.set('k', 'c')

      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      put1.resolve([null, {}])
      await Promise.allSettled([first, deleting, third])

      expect(await first).toBe(true)
      expect(await third).toBe(false)
      await expect(deleting).rejects.toThrow("Failed to delete storage value 'k': the write that superseded it failed")
    })

    it('should resolve a delete superseded by a set to true once the PUT lands', async () => {
      const storage = createSceneStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      const first = storage.set('k', 'a')
      await flush()
      const deleting = storage.delete('k')
      const third = storage.set('k', 'c')

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      put1.resolve([null, {}])
      await Promise.allSettled([first, deleting, third])

      expect(await first).toBe(true)
      expect(await third).toBe(true)
      expect(await deleting).toBe(true)
    })

    it('should carry the outcome through a chain of supersessions', async () => {
      const storage = createSceneStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      const first = storage.set('k', 'a')
      await flush()
      const deleting = storage.delete('k') // queued
      const second = storage.set('k', 'b') // supersedes the delete
      const deletingAgain = storage.delete('k') // supersedes the set

      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      put1.resolve([null, {}])
      await Promise.allSettled([first, deleting, second, deletingAgain])

      expect(await first).toBe(true)
      expect(await second).toBe(false)
      // The first delete only learns that the set which superseded it did not apply.
      await expect(deleting).rejects.toThrow("Failed to delete storage value 'k': the write that superseded it failed")
      await expect(deletingAgain).rejects.toThrow('500 Internal Server Error')
    })
  })

  describe('get read caching', () => {
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
      await expect(storage.get('key')).rejects.toThrow('500 Internal Server Error')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 1 }, 200])
      expect(await storage.get('key')).toBe(1)

      // Statusless transport errors are not cached either.
      mockWrapSignedFetch.mockResolvedValueOnce(['network down', null])
      await expect(storage.get('other')).rejects.toThrow('network down')

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

    it('should reject a 200 response with a missing value and not cache it', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}, 200])

      await expect(storage.get('key')).rejects.toThrow("Failed to get storage value 'key': response carried no value")
      await expect(storage.get('key')).rejects.toThrow("Failed to get storage value 'key': response carried no value")

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should reject a failed read rather than resolve null like a missing key', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])

      await expect(storage.get('leaderboard')).rejects.toThrow(
        "Failed to get storage value 'leaderboard': 500 Internal Server Error"
      )
    })

    it('should resolve null only for a confirmed 404', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])

      expect(await storage.get('leaderboard')).toBeNull()
    })

    it('should reject every get joined to one failed request', async () => {
      const storage = createSceneStorage()
      const request = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockReturnValueOnce(request.promise)

      const first = storage.get('key')
      const second = storage.get('key')
      request.resolve(['500 Internal Server Error', null, 500])

      await expect(first).rejects.toThrow('500 Internal Server Error')
      await expect(second).rejects.toThrow('500 Internal Server Error')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
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
