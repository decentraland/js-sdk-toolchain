/**
 * Tests for Badges.award: the award URL it builds and how it reports the
 * service's answer. Mocks badges-url and utils so no runtime is required.
 */
const mockGetBadgesTarget = jest.fn()
const mockWrapSignedFetch = jest.fn()
const mockAssertIsServer = jest.fn()

jest.mock('../../../../packages/@dcl/sdk/src/server/badges-url', () => ({
  getBadgesTarget: () => mockGetBadgesTarget()
}))

jest.mock('../../../../packages/@dcl/sdk/src/server/utils', () => ({
  assertIsServer: (name: string) => mockAssertIsServer(name),
  wrapSignedFetch: (req: unknown) => mockWrapSignedFetch(req)
}))

import { Badges } from '../../../../packages/@dcl/sdk/src/server/badges'

describe('Badges.award', () => {
  const player = '0xAbCdEf0000000000000000000000000000000001'
  const world = 'boedo.dcl.eth'

  beforeEach(() => {
    jest.resetAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetBadgesTarget.mockResolvedValue({ serverUrl: 'https://badges.test', world })
    mockWrapSignedFetch.mockResolvedValue([null, { ok: true }, 201])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('PUTs the award path with the world and the lowercased player', async () => {
    expect(await Badges.award(player, 'marathon-finisher')).toBe(true)

    expect(mockWrapSignedFetch).toHaveBeenCalledWith({
      url: `https://badges.test/worlds/${world}/badges/marathon-finisher/awards/${player.toLowerCase()}`,
      init: { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' }
    })
  })

  it('URL-encodes the world name', async () => {
    mockGetBadgesTarget.mockResolvedValue({ serverUrl: 'https://badges.test', world: 'my world.dcl.eth' })

    await Badges.award(player, 'b')

    expect(mockWrapSignedFetch.mock.calls[0][0].url).toBe(
      `https://badges.test/worlds/my%20world.dcl.eth/badges/b/awards/${player.toLowerCase()}`
    )
  })

  it('asserts it is running on the server before doing anything', async () => {
    mockAssertIsServer.mockImplementation(() => {
      throw new Error('Badges is only available on server-side scenes')
    })

    await expect(Badges.award(player, 'b')).rejects.toThrow('only available on server-side scenes')
    expect(mockWrapSignedFetch).not.toHaveBeenCalled()
  })

  it('returns false without a request for a malformed address', async () => {
    expect(await Badges.award('not-an-address', 'b')).toBe(false)
    expect(await Badges.award('0x1234', 'b')).toBe(false)
    expect(mockWrapSignedFetch).not.toHaveBeenCalled()
  })

  it('returns false without a request for a malformed badge id', async () => {
    expect(await Badges.award(player, 'Marathon Finisher')).toBe(false)
    expect(await Badges.award(player, '')).toBe(false)
    expect(await Badges.award(player, '-leading-dash')).toBe(false)
    expect(await Badges.award(player, 'a'.repeat(65))).toBe(false)
    expect(mockWrapSignedFetch).not.toHaveBeenCalled()
  })

  it('returns false when the service rejects the award', async () => {
    mockWrapSignedFetch.mockResolvedValue(['401 Unauthorized', null, 401])

    expect(await Badges.award(player, 'b')).toBe(false)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('401'))
  })

  it('returns false when the request itself fails', async () => {
    mockWrapSignedFetch.mockResolvedValue(['network down', null, undefined])

    expect(await Badges.award(player, 'b')).toBe(false)
  })

  it('returns false when the realm cannot be resolved', async () => {
    mockGetBadgesTarget.mockRejectedValue(new Error('Unable to retrieve realm information'))

    expect(await Badges.award(player, 'b')).toBe(false)
    expect(mockWrapSignedFetch).not.toHaveBeenCalled()
  })
})
