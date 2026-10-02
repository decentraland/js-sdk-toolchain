const mockGetRealm = jest.fn()
const mockGetSceneInformation = jest.fn()

jest.mock('~system/Runtime', () => ({
  getRealm: mockGetRealm,
  getSceneInformation: mockGetSceneInformation
}))

describe('getBadgesTarget', () => {
  beforeEach(() => {
    jest.resetModules()
    mockGetRealm.mockReset()
    mockGetSceneInformation.mockReset()
  })

  async function loadModule() {
    return import('../../../packages/@dcl/sdk/src/server/badges-url')
  }

  function mockRealm(realmInfo: { isPreview: boolean; baseUrl: string; realmName?: string } | undefined) {
    mockGetRealm.mockResolvedValue({ realmInfo })
  }

  function mockSceneMetadata(metadata: unknown) {
    mockGetSceneInformation.mockResolvedValue({ urn: '', content: [], metadataJson: JSON.stringify(metadata), baseUrl: '' })
  }

  it('returns the realm baseUrl and the scene.json world (lowercased) in preview mode', async () => {
    mockRealm({ isPreview: true, baseUrl: 'http://localhost:8000', realmName: 'LocalPreview' })
    mockSceneMetadata({ worldConfiguration: { name: 'Boedo.dcl.eth' } })
    const { getBadgesTarget } = await loadModule()
    expect(await getBadgesTarget()).toEqual({ serverUrl: 'http://localhost:8000', world: 'boedo.dcl.eth' })
  })

  it('falls back to the realm name in preview mode when scene.json has no world', async () => {
    mockRealm({ isPreview: true, baseUrl: 'http://localhost:8000', realmName: 'LocalPreview' })
    mockSceneMetadata({})
    const { getBadgesTarget } = await loadModule()
    expect((await getBadgesTarget()).world).toBe('LocalPreview')
  })

  it('falls back to the realm name in preview mode when scene information fails', async () => {
    mockRealm({ isPreview: true, baseUrl: 'http://localhost:8000', realmName: 'LocalPreview' })
    mockGetSceneInformation.mockRejectedValue(new Error('unavailable'))
    const { getBadgesTarget } = await loadModule()
    expect((await getBadgesTarget()).world).toBe('LocalPreview')
  })

  it('does not read scene information outside preview', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org', realmName: 'boedo.dcl.eth' })
    const { getBadgesTarget } = await loadModule()
    expect((await getBadgesTarget()).world).toBe('boedo.dcl.eth')
    expect(mockGetSceneInformation).not.toHaveBeenCalled()
  })

  it('returns the .zone badges server for staging realms', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.zone', realmName: 'boedo.dcl.eth' })
    const { getBadgesTarget } = await loadModule()
    expect((await getBadgesTarget()).serverUrl).toBe('https://badges.decentraland.zone')
  })

  it('returns the .org badges server for production realms', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org', realmName: 'boedo.dcl.eth' })
    const { getBadgesTarget } = await loadModule()
    expect((await getBadgesTarget()).serverUrl).toBe('https://badges.decentraland.org')
  })

  it('throws when realm information is unavailable', async () => {
    mockRealm(undefined)
    const { getBadgesTarget } = await loadModule()
    await expect(getBadgesTarget()).rejects.toThrow('Unable to retrieve realm information')
  })

  it('throws when the realm has no name (nothing to bind the award to)', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org', realmName: '' })
    const { getBadgesTarget } = await loadModule()
    await expect(getBadgesTarget()).rejects.toThrow('Unable to retrieve the realm name')
  })

  it('memoizes the resolved target across sequential calls', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org', realmName: 'boedo.dcl.eth' })
    const { getBadgesTarget } = await loadModule()

    await getBadgesTarget()
    await getBadgesTarget()

    expect(mockGetRealm).toHaveBeenCalledTimes(1)
  })

  it('does not memoize failures, so a later call can retry', async () => {
    mockGetRealm.mockRejectedValueOnce(new Error('network down'))
    const { getBadgesTarget } = await loadModule()

    await expect(getBadgesTarget()).rejects.toThrow('network down')

    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org', realmName: 'boedo.dcl.eth' })
    expect((await getBadgesTarget()).world).toBe('boedo.dcl.eth')
    expect(mockGetRealm).toHaveBeenCalledTimes(2)
  })
})
