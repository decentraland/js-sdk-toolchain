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

  it('dedupes unchanged writes by default for both scene and player storage', async () => {
    const Storage = await loadStorage()

    await Storage.set('score', 42)
    await Storage.set('score', 42)
    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)

    await Storage.player.set(address, 'score', 42)
    await Storage.player.set(address, 'score', 42)
    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
  })

  it('configure({ skipIfUnchanged: false }) disables write dedup for both scene and player storage', async () => {
    const Storage = await loadStorage()
    Storage.configure({ skipIfUnchanged: false })

    await Storage.set('score', 42)
    await Storage.set('score', 42)
    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)

    await Storage.player.set(address, 'score', 42)
    await Storage.player.set(address, 'score', 42)
    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(4)
  })

  it('scene and player caches are isolated for the same key and value', async () => {
    const Storage = await loadStorage()

    await Storage.set('score', 42)
    await Storage.player.set(address, 'score', 42)

    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)
  })

  it('serves repeated gets from cache by default', async () => {
    const Storage = await loadStorage()
    mockWrapSignedFetch.mockResolvedValue([null, { value: 42 }, 200])

    expect(await Storage.get('score')).toBe(42)
    expect(await Storage.get('score')).toBe(42)

    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(1)
  })

  it('configure({ cacheReads: false }) disables read caching for both scene and player storage', async () => {
    const Storage = await loadStorage()
    Storage.configure({ cacheReads: false })
    mockWrapSignedFetch.mockResolvedValue([null, { value: 42 }, 200])

    await Storage.get('score')
    await Storage.get('score')
    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(2)

    await Storage.player.get(address, 'score')
    await Storage.player.get(address, 'score')
    expect(mockWrapSignedFetch).toHaveBeenCalledTimes(4)
  })
})
