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
    it('should PUT on every call by default, even for identical values', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      expect(await storage.set('score', 42)).toBe(true)
      expect(await storage.set('score', 42)).toBe(true)

      expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
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
})
