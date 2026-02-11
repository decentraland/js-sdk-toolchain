/**
 * Tests for scene storage getKeys and getValues (list/prefix) methods.
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

  describe('getKeys', () => {
    it('should request /values and return keys when no prefix is passed', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([
        null,
        {
          data: [
            { key: 'a', value: 1 },
            { key: 'b', value: 2 }
          ]
        }
      ])

      const keys = await storage.getKeys()

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({ url: `${baseUrl}/values` })
      expect(keys).toEqual(['a', 'b'])
    })

    it('should request /values?prefix=... and return matching keys when prefix is passed', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([
        null,
        {
          data: [
            { key: 'some-prefix-1', value: 10 },
            { key: 'some-prefix-2', value: 20 }
          ]
        }
      ])

      const keys = await storage.getKeys('some-prefix')

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/values?prefix=some-prefix`
      })
      expect(keys).toEqual(['some-prefix-1', 'some-prefix-2'])
    })

    it('should return empty array when the request fails', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue(['Network error', null])

      const keys = await storage.getKeys()

      expect(keys).toEqual([])
    })

    it('should return empty array when data is missing', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue([null, {}])

      const keys = await storage.getKeys()

      expect(keys).toEqual([])
    })
  })

  describe('getValues', () => {
    it('should request /values and return entries when no prefix is passed', async () => {
      const storage = createSceneStorage()
      const data = [
        { key: 'a', value: 1 },
        { key: 'b', value: { nested: true } }
      ]
      mockWrapSignedFetch.mockResolvedValue([null, { data }])

      const values = await storage.getValues()

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({ url: `${baseUrl}/values` })
      expect(values).toEqual(data)
    })

    it('should request /values?prefix=... and return matching entries when prefix is passed', async () => {
      const storage = createSceneStorage()
      const data = [
        { key: 'player-1', value: 'alice' },
        { key: 'player-2', value: 'bob' }
      ]
      mockWrapSignedFetch.mockResolvedValue([null, { data }])

      const values = await storage.getValues('player-')

      expect(mockWrapSignedFetch).toHaveBeenCalledWith({
        url: `${baseUrl}/values?prefix=player-`
      })
      expect(values).toEqual(data)
    })

    it('should return empty array when the request fails', async () => {
      const storage = createSceneStorage()
      mockWrapSignedFetch.mockResolvedValue(['Server error', null])

      const values = await storage.getValues()

      expect(values).toEqual([])
    })
  })
})
