/**
 * Tests for the Storage singleton: configure() defaults and scene/player
 * cache isolation. The singleton is created at import time, so each test
 * resets modules and re-imports it (same pattern as platform.spec.ts).
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

describe('Storage singleton', () => {
  const baseUrl = 'https://storage.test'
  const address = '0x1234567890123456789012345678901234567890'

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    mockGetStorageServerUrl.mockResolvedValue(baseUrl)
    mockWrapSignedFetch.mockResolvedValue([null, {}])
  })

  async function loadStorage() {
    const { Storage } = await import('../../../../packages/@dcl/sdk/src/server/storage/index')
    return Storage
  }

  it('configure({ skipIfUnchanged: true }) applies to both scene and player storage', async () => {
    const Storage = await loadStorage()
    Storage.configure({ skipIfUnchanged: true })

    await Storage.set('score', 42)
    await Storage.set('score', 42)
    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

    await Storage.player.set(address, 'score', 42)
    await Storage.player.set(address, 'score', 42)
    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
  })

  it('does not dedupe by default', async () => {
    const Storage = await loadStorage()

    await Storage.set('score', 42)
    await Storage.set('score', 42)

    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
  })

  it('scene and player caches are isolated for the same key and value', async () => {
    const Storage = await loadStorage()
    Storage.configure({ skipIfUnchanged: true })

    await Storage.set('score', 42)
    await Storage.player.set(address, 'score', 42)

    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
  })
})
