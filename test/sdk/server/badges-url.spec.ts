const mockGetRealm = jest.fn()

jest.mock('~system/Runtime', () => ({
  getRealm: mockGetRealm
}))

describe('getBadgesServerUrl', () => {
  beforeEach(() => {
    jest.resetModules()
    mockGetRealm.mockReset()
  })

  async function loadModule() {
    return import('../../../packages/@dcl/sdk/src/server/badges-url')
  }

  function mockRealm(realmInfo: { isPreview: boolean; baseUrl: string } | undefined) {
    mockGetRealm.mockResolvedValue({ realmInfo })
  }

  it('returns the realm baseUrl in preview mode', async () => {
    mockRealm({ isPreview: true, baseUrl: 'http://localhost:8000' })
    const { getBadgesServerUrl } = await loadModule()
    expect(await getBadgesServerUrl()).toBe('http://localhost:8000')
  })

  it('returns the .zone badges server for staging realms', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.zone' })
    const { getBadgesServerUrl } = await loadModule()
    expect(await getBadgesServerUrl()).toBe('https://badges.decentraland.zone')
  })

  it('matches .zone on the host only, with a port or a path present', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.zone:443/some/path' })
    const { getBadgesServerUrl } = await loadModule()
    expect(await getBadgesServerUrl()).toBe('https://badges.decentraland.zone')
  })

  it('is not fooled by look-alike hosts or .zone elsewhere in the URL', async () => {
    for (const baseUrl of [
      'https://decentraland.zone.evil.com',
      'https://realm.decentraland.zone.attacker.net',
      'https://evil.com/?next=realm.decentraland.zone',
      'https://evil.com/realm.decentraland.zone'
    ]) {
      jest.resetModules()
      mockRealm({ isPreview: false, baseUrl })
      const { getBadgesServerUrl } = await loadModule()
      expect(await getBadgesServerUrl()).toBe('https://badges.decentraland.org')
    }
  })

  it('returns the .org badges server for production realms', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org' })
    const { getBadgesServerUrl } = await loadModule()
    expect(await getBadgesServerUrl()).toBe('https://badges.decentraland.org')
  })

  it('throws when realm information is unavailable', async () => {
    mockRealm(undefined)
    const { getBadgesServerUrl } = await loadModule()
    await expect(getBadgesServerUrl()).rejects.toThrow('Unable to retrieve realm information')
  })

  it('memoizes the resolved URL across sequential calls', async () => {
    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org' })
    const { getBadgesServerUrl } = await loadModule()

    await getBadgesServerUrl()
    await getBadgesServerUrl()

    expect(mockGetRealm).toHaveBeenCalledTimes(1)
  })

  it('does not memoize failures, so a later call can retry', async () => {
    mockGetRealm.mockRejectedValueOnce(new Error('network down'))
    const { getBadgesServerUrl } = await loadModule()

    await expect(getBadgesServerUrl()).rejects.toThrow('network down')

    mockRealm({ isPreview: false, baseUrl: 'https://realm.decentraland.org' })
    expect(await getBadgesServerUrl()).toBe('https://badges.decentraland.org')
    expect(mockGetRealm).toHaveBeenCalledTimes(2)
  })
})
