const mockGetRealm = jest.fn()

jest.mock('~system/Runtime', () => ({
  getRealm: mockGetRealm
}))

describe('getStorageServerUrl', () => {
  beforeEach(() => {
    jest.resetModules()
    mockGetRealm.mockReset()
  })

  async function loadModule() {
    return import('../../../packages/@dcl/sdk/src/server/storage-url')
  }

  function mockRealm(realmInfo: { isPreview: boolean; baseUrl: string } | undefined) {
    mockGetRealm.mockResolvedValue({ realmInfo })
  }

  it('returns the realm baseUrl in preview mode', async () => {
    mockRealm({ isPreview: true, baseUrl: 'http://localhost:8000' })
    const { getStorageServerUrl } = await loadModule()
    expect(await getStorageServerUrl()).toBe('http://localhost:8000')
  })

  it('returns the .zone storage server for staging realms', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.zone' })
    const { getStorageServerUrl } = await loadModule()
    expect(await getStorageServerUrl()).toBe('https://storage.decentraland.zone')
  })

  it('returns the .org storage server for production realms', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org' })
    const { getStorageServerUrl } = await loadModule()
    expect(await getStorageServerUrl()).toBe('https://storage.decentraland.org')
  })

  it('throws when realm information is unavailable', async () => {
    mockRealm(undefined)
    const { getStorageServerUrl } = await loadModule()
    await expect(getStorageServerUrl()).rejects.toThrow('Unable to retrieve realm information')
  })

  it('memoizes the resolved URL across sequential calls', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org' })
    const { getStorageServerUrl } = await loadModule()

    expect(await getStorageServerUrl()).toBe('https://storage.decentraland.org')
    expect(await getStorageServerUrl()).toBe('https://storage.decentraland.org')

    expect(mockGetRealm).toHaveBeenCalledTimes(1)
  })

  it('collapses concurrent first calls into a single getRealm request', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org' })
    const { getStorageServerUrl } = await loadModule()

    const [first, second] = await Promise.all([getStorageServerUrl(), getStorageServerUrl()])

    expect(first).toBe('https://storage.decentraland.org')
    expect(second).toBe('https://storage.decentraland.org')
    expect(mockGetRealm).toHaveBeenCalledTimes(1)
  })

  it('does not memoize failures, so a later call can retry', async () => {
    mockGetRealm.mockRejectedValueOnce(new Error('network down'))
    const { getStorageServerUrl } = await loadModule()

    await expect(getStorageServerUrl()).rejects.toThrow('network down')

    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org' })
    expect(await getStorageServerUrl()).toBe('https://storage.decentraland.org')
    expect(mockGetRealm).toHaveBeenCalledTimes(2)
  })
})
