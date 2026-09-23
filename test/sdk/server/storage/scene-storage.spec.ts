/**
 * Tests for scene storage: reads, writes, the read cache and the write queue.
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
    it('should reject with the storage prefix when the storage URL cannot be resolved', async () => {
      const storage = createSceneStorage()
      mockGetStorageServerUrl.mockRejectedValueOnce(new Error('realm down'))

      await expect(storage.getValues()).rejects.toThrow('Failed to get storage values: realm down')
    })

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
      mockWrapSignedFetch.mockResolvedValue([null, { data, pagination: { offset: 0, total: 1 } }])

      const result = await storage.getValues({ limit: 10, offset: 10 })

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/values?limit=10&offset=10`
      })
      // The server's own pagination wins over the request.
      expect(result).toEqual({ data, pagination: { offset: 0, total: 1 } })
    })

    it('should fall back to the requested offset and the page length when the server omits pagination', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'a', value: 1 }] }])

      expect((await storage.getValues({ offset: 10 })).pagination).toEqual({ offset: 10, total: 1 })
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
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(4)
      expect(mockWrapSignedFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          init: expect.objectContaining({ method: 'PUT', body: JSON.stringify({ value: 'v1' }) })
        })
      )
    })

    it('should reject a page that carries an entry without a string key', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([
        null,
        { data: [{ key: 'good', value: 1 }, { value: 'orphan' }, null] }
      ])

      await expect(storage.getValues()).rejects.toThrow(
        'Failed to get storage values: response carried a malformed entry'
      )
    })

    it('should reject a page that carries an entry without a value, seeding none of it', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'good', value: 1 }, { key: 'novalue' }] }])

      await expect(storage.getValues()).rejects.toThrow('response carried a malformed entry')

      // Validation runs before seeding, so 'good' was not cached either.
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'network' }, 200])
      expect(await storage.get('good')).toBe('network')
    })

    it('should accept a stored null as an entry value', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'k', value: null }] }])

      expect((await storage.getValues()).data).toEqual([{ key: 'k', value: null }])
    })

    it('should reject a successful response whose data is not a list', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, { data: {} }, 200])

      await expect(storage.getValues()).rejects.toThrow('Failed to get storage values: response carried no data array')
    })
  })

  describe('set', () => {
    it('should return false and log, sending nothing, when the storage URL cannot be resolved', async () => {
      const storage = createSceneStorage()
      const error = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockGetStorageServerUrl.mockRejectedValueOnce(new Error('realm down'))

      try {
        expect(await storage.set('key', 1)).toBe(false)
        expect(mockWrapSignedFetch).not.toHaveBeenCalled()
        expect(error).toHaveBeenCalledWith("Failed to set storage value 'key': realm down")
      } finally {
        error.mockRestore()
      }
    })

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
      const storage = createSceneStorage(createStorageConfig({ skipIfUnchanged: false }))
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

    it('should cache the absence a 404 confirms, so the next read is local', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])
      await storage.delete('key')

      expect(await storage.get('key')).toBeNull()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

    it('should let a set queued behind a 404 delete land and be read back', async () => {
      const storage = createSceneStorage()
      const del = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => del.promise)
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      const deleting = storage.delete('key')
      await flush()
      const writing = storage.set('key', 'after')
      del.resolve(['404 Not Found', null, 404])

      expect(await Promise.all([deleting, writing])).toEqual([false, true])
      expect(await storage.get('key')).toBe('after')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should reject with the storage error prefix when the storage URL cannot be resolved', async () => {
      const storage = createSceneStorage()
      mockGetStorageServerUrl.mockRejectedValueOnce(new Error('realm down'))

      await expect(storage.delete('key')).rejects.toThrow("Failed to delete storage value 'key': realm down")
    })

    it('should read from the network once the delete it waited for fails', async () => {
      const storage = createSceneStorage()
      const deleteCall = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockReturnValueOnce(deleteCall.promise)
      const deleting = storage.delete('key')
      await flush()

      const reading = storage.get('key')
      await flush()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'still there' }, 200])
      deleteCall.resolve(['500 Internal Server Error', null, 500])
      await expect(deleting).rejects.toThrow('500 Internal Server Error')
      expect(await reading).toBe('still there')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
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
    it('should not skip an unchanged write as a duplicate while a newer write to the key is still pending', async () => {
      const storage = createSceneStorage()
      const put1 = deferred<[null, object]>()
      const put2 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementation((req: { init?: { body?: string } }) =>
        req.init?.body === JSON.stringify({ value: 1 }) && !put1Done ? put1.promise : put2.promise
      )
      let put1Done = false

      const first = storage.set('key', 1)
      await flush()
      const second = storage.set('key', 2) // queued
      put1.resolve([null, {}])
      expect(await first).toBe(true)
      put1Done = true
      await flush()

      // The cache holds 1 from the landed write, but 2 is in flight: this write must still be issued,
      // queued behind 2, so the key ends at 1.
      const third = storage.set('key', 1, { skipIfUnchanged: true })
      put2.resolve([null, {}])
      expect(await Promise.all([second, third])).toEqual([true, true])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
      expect(mockWrapSignedFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ init: expect.objectContaining({ body: JSON.stringify({ value: 1 }) }) })
      )
    })

    it('should join a delete identical to the queued one, so both report the same 404 outcome', async () => {
      const storage = createSceneStorage()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put.promise)
      mockWrapSignedFetch.mockResolvedValueOnce(['404 Not Found', null, 404])

      const writing = storage.set('key', 1)
      await flush()
      const first = storage.delete('key')
      const second = storage.delete('key') // identical to the queued delete: joins it rather than replacing it
      put.resolve([null, {}])

      // A replaced delete would report true (the replacement applied); a joined one shares the 404.
      expect(await Promise.all([writing, first, second])).toEqual([true, false, false])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should issue one DELETE for two concurrent deletes of the same key', async () => {
      const storage = createSceneStorage()
      const del = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => del.promise)

      const first = storage.delete('key')
      const second = storage.delete('key')
      del.resolve([null, {}])

      expect(await Promise.all([first, second])).toEqual([true, true])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
    })

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

    it('should resolve false for a queued write whose own PUT fails, and invalidate the cache', async () => {
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

      // 1 landed and was cached; 2's failure must drop it, so an unchanged-looking set of 1 is still sent.
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await storage.set('key', 1, { skipIfUnchanged: true })).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('getValues seeding race guard', () => {
    it('should not let a page overwrite a value a read confirmed before the listing started', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'confirmed' }, 200])
      expect(await storage.get('a')).toBe('confirmed')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'a', value: 'from page' }] }])
      await storage.getValues()

      expect(await storage.get('a')).toBe('confirmed')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should not seed a key whose read is in flight, since that read settles the entry', async () => {
      const storage = createSceneStorage()
      const read = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => read.promise)
      const reading = storage.get('a')
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce([null, { data: [{ key: 'a', value: 'from page' }] }])
      await storage.getValues()

      read.resolve(['500 Internal Server Error', null, 500])
      await expect(reading).rejects.toThrow('500 Internal Server Error')

      // Nothing confirmed 'a', so the next read goes to the network rather than serving the page value.
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'fresh' }, 200])
      expect(await storage.get('a')).toBe('fresh')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

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

    it('should not seed a key written while the page was in flight', async () => {
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
    const hole = [1, , 3] // eslint-disable-line no-sparse-arrays
    it.each([
      ['an undefined array element', [1, undefined], '"1" is undefined or a hole in an array'],
      ['a sparse array hole', hole, '"1" is undefined or a hole in an array'],
      ['a RegExp', /a/, 'the value is a RegExp, which has no JSON form'],
      ['an Error', { e: new Error('x') }, '"e" is an Error, which has no JSON form'],
      ['a WeakMap', new WeakMap(), 'the value is a WeakMap, which has no JSON form'],
      ['a Promise', { p: Promise.resolve(1) }, '"p" is a Promise, which has no JSON form'],
      ['an ArrayBuffer', new ArrayBuffer(2), 'the value is an ArrayBuffer, which has no JSON form'],
      ['a typed array', { bytes: new Uint8Array([1]) }, '"bytes" is a Uint8Array, which has no JSON form'],
      ['a DataView', new DataView(new ArrayBuffer(1)), 'the value is a DataView, which has no JSON form'],
      [
        'a nested toJSON returning undefined',
        { a: { toJSON: () => undefined } },
        '"a" has a toJSON() that returns undefined'
      ],
      ['an unpaired surrogate', { name: 'a\ud800' }, '"name" contains an unpaired surrogate or a NUL character'],
      ['a NUL character', 'a\u0000b', 'the value contains an unpaired surrogate or a NUL character'],
      ['a key with a NUL character', { ['a\u0000']: 1 }, 'is a key with an unpaired surrogate or a NUL character']
    ])('should reject %s rather than store it changed', async (_label, value, reason) => {
      const storage = createSceneStorage()

      await expect(storage.set('key', value)).rejects.toThrow(reason)
    })

    it.each([
      ['a BigInt', { n: BigInt(1) }, 'BigInt'],
      [
        'a circular value',
        (() => {
          const c: Record<string, unknown> = {}
          c.self = c
          return c
        })(),
        'circular'
      ],
      [
        'nesting deeper than the engine stack',
        (() => {
          const root: Record<string, unknown> = {}
          let at = root
          for (let i = 0; i < 20000; i++) {
            const next = {}
            at.n = next
            at = next
          }
          return root
        })(),
        'call stack'
      ]
    ])('should report %s as a prefixed TypeError', async (_label, value, cause) => {
      const storage = createSceneStorage()
      const failure = await storage.set('key', value).catch((error: unknown) => error)

      expect([failure instanceof TypeError, String((failure as Error).message)]).toEqual([
        true,
        expect.stringMatching(
          new RegExp(`^Storage\\.set\\('key'\\): value must be JSON-serializable \\(.*${cause}`, 'i')
        )
      ])
    })

    it.each([
      ['an undefined object property', { kept: 1, dropped: undefined }, '{"value":{"kept":1}}'],
      ['a Date', { at: new Date(0) }, '{"value":{"at":"1970-01-01T00:00:00.000Z"}}'],
      [
        'a class instance',
        new (class Pet {
          name = 'rex'
          bark() {
            return 1
          }
        })(),
        '{"value":{"name":"rex"}}'
      ],
      ['a paired surrogate', '\ud83d\ude00', JSON.stringify({ value: '\ud83d\ude00' })]
    ])('should store %s as documented', async (_label, value, body) => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      await storage.set('key', value)

      expect(mockWrapSignedFetch).toHaveBeenCalledWith(
        expect.objectContaining({ init: expect.objectContaining({ body }) })
      )
    })

    it.each([
      ['NaN', NaN, 'the value is the non-finite number NaN'],
      ['Infinity', Infinity, 'the value is the non-finite number Infinity'],
      ['a nested -Infinity', { score: -Infinity }, '"score" is the non-finite number -Infinity'],
      ['a Map', new Map([['a', 1]]), 'the value is a Map'],
      ['a nested Set', { tags: new Set(['a']) }, '"tags" is a Set']
    ])('should reject %s rather than store it changed', async (_label, value, reason) => {
      const storage = createSceneStorage()

      await expect(storage.set('key', value)).rejects.toThrow(
        `Storage.set('key'): value must be JSON-serializable, but ${reason}`
      )
    })

    it('should send nothing for a value it rejects', async () => {
      const storage = createSceneStorage()

      await storage.set('key', { hp: NaN }).catch(() => undefined)

      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
    })

    it('should reject a nested function rather than persist the value without it', async () => {
      const storage = createSceneStorage()

      await expect(storage.set('key', { callback: () => 1 })).rejects.toThrow(
        `Storage.set('key'): value must be JSON-serializable, but "callback" is a function. Use delete() to remove a key.`
      )
      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
    })

    it('should reject a nested symbol, naming where it sits', async () => {
      const storage = createSceneStorage()

      await expect(storage.set('key', { items: [1, Symbol('x')] })).rejects.toThrow('"1" is a symbol')
    })

    it('should drop an undefined property, as JSON does, rather than reject the value', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])

      expect(await storage.set('key', { kept: 1, dropped: undefined })).toBe(true)
      expect(mockWrapSignedFetch).toHaveBeenCalledWith(
        expect.objectContaining({ init: expect.objectContaining({ body: '{"value":{"kept":1}}' }) })
      )
    })

    it('should reject undefined rather than send a payload the service refuses', async () => {
      const storage = createSceneStorage()

      await expect(storage.set('key', undefined)).rejects.toThrow(
        "Storage.set('key'): value must be JSON-serializable. Use delete() to remove a key."
      )
      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
    })

    it('should reject a root-level function, naming the value itself', async () => {
      const storage = createSceneStorage()

      await expect(storage.set('key', () => undefined)).rejects.toThrow(
        `Storage.set('key'): value must be JSON-serializable, but the value is a function. Use delete() to remove a key.`
      )
    })

    it('should reject a circular value', async () => {
      const storage = createSceneStorage()
      const circular: Record<string, unknown> = {}
      circular.self = circular

      await expect(storage.set('key', circular)).rejects.toThrow(TypeError)
      expect(mockWrapSignedFetch).not.toHaveBeenCalled()
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
    it('should answer a read issued during a write from that write once it lands, without a network read', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.set('key', 'v1')

      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(put.promise)
      const writing = storage.set('key', 'v2')
      await flush()

      const reading = storage.get('key')
      await flush()
      // The read is parked behind the write: no GET has been issued.
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)

      put.resolve([null, {}])
      expect(await writing).toBe(true)
      expect(await reading).toBe('v2')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
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
      await flush()
      // The fresh read is parked behind the PUT: only the first GET and the PUT are on the wire.
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)

      firstGet.resolve([null, { value: 'v1' }, 200])
      put.resolve([null, {}])
      await reading
      await writing

      expect(await fresh).toBe('v2')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('queued writes and the cache', () => {
    it('should drop the landed value when the queued write behind it cannot resolve the storage URL', async () => {
      const storage = createSceneStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      mockGetStorageServerUrl.mockResolvedValueOnce(baseUrl).mockRejectedValueOnce(new Error('realm down'))

      const first = storage.set('key', 1)
      await flush()
      const second = storage.set('key', 2)
      put1.resolve([null, {}])
      expect(await Promise.all([first, second])).toEqual([true, false])

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'server' }, 200])
      expect(await storage.get('key')).toBe('server')
    })

    it('should drop the landed value when the delete queued behind it fails', async () => {
      const storage = createSceneStorage()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put.promise)
      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])

      const writing = storage.set('key', 1)
      await flush()
      const deleting = storage.delete('key')
      put.resolve([null, {}])
      await Promise.allSettled([writing, deleting])
      await expect(deleting).rejects.toThrow('500 Internal Server Error')

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'server' }, 200])
      expect(await storage.get('key')).toBe('server')
    })

    it('should read from the network when the queued delete it waited for fails', async () => {
      const storage = createSceneStorage()
      const put = deferred<[null, object]>()
      const del = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put.promise).mockImplementationOnce(() => del.promise)

      const writing = storage.set('key', 1)
      await flush()
      const deleting = storage.delete('key')
      const reading = storage.get('key') // parked behind both
      put.resolve([null, {}])
      await writing
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'server' }, 200])
      del.resolve(['500 Internal Server Error', null, 500])
      await expect(deleting).rejects.toThrow('500 Internal Server Error')
      expect(await reading).toBe('server')
    })

    it('should also wait for the write that replaced the queued one, then answer from it without a network read', async () => {
      const storage = createSceneStorage()
      const put1 = deferred<[null, object]>()
      const put3 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementation((req: { init?: { method?: string; body?: string } }) => {
        if (req.init?.method !== 'PUT') return Promise.resolve([null, { value: 'v1' }, 200])
        return req.init.body === JSON.stringify({ value: 'v1' }) ? put1.promise : put3.promise
      })

      const first = storage.set('k', 'v1')
      await flush()
      const second = storage.set('k', 'v2') // queued
      const reading = storage.get('k') // parked behind v1 and v2
      await flush()
      const third = storage.set('k', 'v3') // replaces the queued v2 after the read was issued

      put1.resolve([null, {}])
      expect(await first).toBe(true)
      await flush()
      // v1 landed and v3 is in flight in place of v2: the read stays parked and issues no GET.
      expect(mockWrapSignedFetch.mock.calls.map((call) => call[0].init?.method ?? 'GET')).toEqual(['PUT', 'PUT'])

      put3.resolve([null, {}])
      expect(await Promise.all([second, third])).toEqual([true, true])
      expect(await reading).toBe('v3')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should answer a read issued while a write is queued behind another from the queued write, without a network read', async () => {
      const storage = createSceneStorage()
      const firstPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(firstPut.promise)
      const first = storage.set('k', 'v1')
      await flush()
      const secondPut = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(secondPut.promise)
      const second = storage.set('k', 'v2')

      const reading = storage.get('k')
      firstPut.resolve([null, {}])
      expect(await first).toBe(true)
      await flush()
      // v1 landed and v2 is in flight: the read is still parked and issued no GET.
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)

      secondPut.resolve([null, {}])
      expect(await second).toBe(true)
      expect(await reading).toBe('v2')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should answer a read issued while a set is queued behind a delete from the set, without a network read', async () => {
      const storage = createSceneStorage()
      const del = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(del.promise)
      const deleting = storage.delete('k')
      await flush()
      const put = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(put.promise)
      const writing = storage.set('k', 'v')

      const reading = storage.get('k')
      del.resolve([null, {}])
      expect(await deleting).toBe(true)
      put.resolve([null, {}])
      expect(await writing).toBe(true)
      expect(await reading).toBe('v')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should answer a read parked behind a landed write from it, even with a later write already in flight', async () => {
      const storage = createSceneStorage()
      const putA = deferred<[null, object]>()
      const putB = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementation((req: { init?: { method?: string; body?: string } }) =>
        req.init?.body === JSON.stringify({ value: 'a' }) ? putA.promise : putB.promise
      )

      const writingA = storage.set('k', 'a')
      await flush()
      const reading = storage.get('k') // parked behind a
      await flush()
      const writingB = storage.set('k', 'b') // issued after the read, so not awaited by it

      putA.resolve([null, {}])
      expect(await writingA).toBe(true)
      // a is the state the read was issued against; it is served from cache while b is in flight.
      expect(await reading).toBe('a')
      expect(mockWrapSignedFetch.mock.calls.map((call) => call[0].init?.method ?? 'GET')).toEqual(['PUT', 'PUT'])

      putB.resolve([null, {}])
      expect(await writingB).toBe(true)
      expect(await storage.get('k')).toBe('b')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should not wait for a write issued after the read, nor let the late answer overwrite that write', async () => {
      const storage = createSceneStorage()
      const putA = deferred<[string, null, number]>()
      const putB = deferred<[null, object]>()
      const read = deferred<[null, { value: string }, number]>()
      mockWrapSignedFetch.mockImplementation((req: { init?: { method?: string; body?: string } }) => {
        if (req.init?.method !== 'PUT') return read.promise
        return req.init.body === JSON.stringify({ value: 'a' }) ? putA.promise : putB.promise
      })

      const writingA = storage.set('k', 'a')
      await flush()
      const reading = storage.get('k') // parked behind a
      await flush()
      const writingB = storage.set('k', 'b') // issued after the read, so not awaited by it

      // a fails, so nothing is cached and the read goes to the network while b is in flight.
      putA.resolve(['500 Internal Server Error', null, 500])
      expect(await writingA).toBe(false)
      await flush()
      expect(mockWrapSignedFetch.mock.calls.map((call) => call[0].init?.method ?? 'GET')).toEqual(['PUT', 'PUT', 'GET'])

      putB.resolve([null, {}])
      expect(await writingB).toBe(true)
      // The server answered the read before applying b; the late answer must not replace b.
      read.resolve([null, { value: 'old' }, 200])
      expect(await reading).toBe('old')
      expect(await storage.get('k')).toBe('b')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

    it('should read from the network once the write it waited for fails', async () => {
      const storage = createSceneStorage()
      const put = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockReturnValueOnce(put.promise)
      const writing = storage.set('k', 'v2')
      await flush()

      const reading = storage.get('k')
      await flush()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'v1' }, 200])
      put.resolve(['500 Internal Server Error', null, 500])
      expect(await writing).toBe(false)
      expect(await reading).toBe('v1')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should answer a read issued during a delete with null once it lands, without a network read', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValueOnce([null, { value: 'old' }, 200])
      expect(await storage.get('k')).toBe('old')

      const del = deferred<[null, object]>()
      mockWrapSignedFetch.mockReturnValueOnce(del.promise)
      const deleting = storage.delete('k')
      await flush()
      const reading = storage.get('k')
      await flush()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)

      del.resolve([null, {}])
      expect(await deleting).toBe(true)
      expect(await reading).toBeNull()
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('superseded writes', () => {
    it('should resolve a set superseded by a set whose PUT fails to false', async () => {
      const storage = createSceneStorage()
      const put1 = deferred<[null, object]>()
      mockWrapSignedFetch.mockImplementationOnce(() => put1.promise)
      const first = storage.set('k', 'a')
      await flush()
      const second = storage.set('k', 'b') // queued
      const third = storage.set('k', 'c') // replaces b

      mockWrapSignedFetch.mockResolvedValueOnce(['500 Internal Server Error', null, 500])
      put1.resolve([null, {}])
      await Promise.allSettled([first, second, third])

      expect(await Promise.all([first, second, third])).toEqual([true, false, false])
    })

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
      await expect(deleting).rejects.toThrow(
        "Failed to delete storage value 'k': a write that replaced it did not apply"
      )
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
      await expect(deleting).rejects.toThrow(
        "Failed to delete storage value 'k': a write that replaced it did not apply"
      )
      await expect(deletingAgain).rejects.toThrow('500 Internal Server Error')
    })
  })

  describe('get read caching', () => {
    it('should not let a detached read that answers 404 overwrite a write that landed meanwhile', async () => {
      const storage = createSceneStorage()
      const read = deferred<[string, null, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => read.promise)
      const reading = storage.get('key')
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      expect(await storage.set('key', 'new')).toBe(true)
      read.resolve(['404 Not Found', null, 404])
      expect(await reading).toBeNull()

      expect(await storage.get('key')).toBe('new')
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
    })

    it('should keep a newer in-flight read joinable after a detached one finishes', async () => {
      const storage = createSceneStorage()
      const readA = deferred<[null, { value: string }, number]>()
      const readB = deferred<[null, { value: string }, number]>()
      mockWrapSignedFetch.mockImplementationOnce(() => readA.promise)
      const a = storage.get('key')
      await flush()

      mockWrapSignedFetch.mockResolvedValueOnce([null, {}])
      await storage.set('key', 'new') // detaches A
      mockWrapSignedFetch.mockImplementationOnce(() => readB.promise)
      const b = storage.get('key', { fresh: true })
      await flush()

      readA.resolve([null, { value: 'old' }, 200])
      await a
      const c = storage.get('key', { fresh: true }) // must join B, not issue a fourth request
      readB.resolve([null, { value: 'new' }, 200])

      expect(await Promise.all([b, c])).toEqual(['new', 'new'])
      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(3)
    })

    it('should reject with the storage prefix when the storage URL cannot be resolved', async () => {
      const storage = createSceneStorage()
      mockGetStorageServerUrl.mockRejectedValueOnce(new Error('realm down'))

      await expect(storage.get('key')).rejects.toThrow("Failed to get storage value 'key': realm down")
    })

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

  describe('when a key cannot address a storage entry', () => {
    it.each([[''], ['.'], ['..'], ['a\ud800'], ['a\u0000']])(
      'should reject %j in get(), set() and delete() before sending',
      async (key) => {
        const storage = createSceneStorage()
        const outcomes = await Promise.all(
          [storage.get(key), storage.set(key, 1), storage.delete(key)].map((p) =>
            p.then(
              () => 'resolved',
              (e: unknown) => (e instanceof TypeError ? 'TypeError' : 'Error')
            )
          )
        )

        expect([outcomes, mockWrapSignedFetch.mock.calls.length]).toEqual([['TypeError', 'TypeError', 'TypeError'], 0])
      }
    )
  })
})
