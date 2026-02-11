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
})
