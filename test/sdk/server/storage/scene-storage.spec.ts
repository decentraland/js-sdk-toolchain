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
})
