/**
 * Tests for Badges.award: the award URL it builds and how it reports the
 * service's answer. Mocks badges-url and utils so no runtime is required.
 */
const mockGetBadgesServerUrl = jest.fn()
const mockWrapSignedFetch = jest.fn()
const mockAssertIsServer = jest.fn()

jest.mock('../../../../packages/@dcl/sdk/src/server/badges-url', () => ({
  getBadgesServerUrl: () => mockGetBadgesServerUrl()
}))

jest.mock('../../../../packages/@dcl/sdk/src/server/utils', () => ({
  assertIsServer: (name: string) => mockAssertIsServer(name),
  wrapSignedFetch: (req: unknown) => mockWrapSignedFetch(req)
}))

const mockSendBadgeAwarded = jest.fn()

jest.mock('../../../../packages/@dcl/sdk/src/network/internal-messages', () => ({
  sendBadgeAwarded: (address: string, badgeId: string) => mockSendBadgeAwarded(address, badgeId)
}))

import { Badges } from '../../../../packages/@dcl/sdk/src/server/badges'

describe('Badges.award', () => {
  const player = '0xAbCdEf0000000000000000000000000000000001'
  const badge = 'bdg_0123456789abcdef'

  beforeEach(() => {
    jest.resetAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetBadgesServerUrl.mockResolvedValue('https://badges.test')
    mockWrapSignedFetch.mockResolvedValue([null, { ok: true }, 201])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('PUTs the award path with the badge id and the lowercased player', async () => {
    expect(await Badges.award(player, badge)).toBe(true)

    expect(mockWrapSignedFetch).toHaveBeenCalledWith({
      url: `https://badges.test/badges/${badge}/awards/${player.toLowerCase()}`,
      init: { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' }
    })
  })

  it('hints the player on a new award (201) but not on a repeat (200)', async () => {
    mockWrapSignedFetch.mockResolvedValue([null, { ok: true }, 201])
    expect(await Badges.award(player, badge)).toBe(true)
    expect(mockSendBadgeAwarded).toHaveBeenCalledTimes(1)
    expect(mockSendBadgeAwarded).toHaveBeenCalledWith(player, badge)

    mockSendBadgeAwarded.mockClear()
    mockWrapSignedFetch.mockResolvedValue([null, { ok: true }, 200])
    expect(await Badges.award(player, badge)).toBe(true)
    expect(mockSendBadgeAwarded).not.toHaveBeenCalled()
  })

  it('asserts it is running on the server before doing anything', async () => {
    mockAssertIsServer.mockImplementation(() => {
      throw new Error('Badges is only available on server-side scenes')
    })

    await expect(Badges.award(player, badge)).rejects.toThrow('only available on server-side scenes')
    expect(mockWrapSignedFetch).not.toHaveBeenCalled()
  })

  it('returns false without a request for a malformed address', async () => {
    expect(await Badges.award('not-an-address', badge)).toBe(false)
    expect(await Badges.award('0x1234', badge)).toBe(false)
    expect(mockWrapSignedFetch).not.toHaveBeenCalled()
  })

  it('returns false without a request for a malformed badge id', async () => {
    expect(await Badges.award(player, 'marathon-finisher')).toBe(false)
    expect(await Badges.award(player, '')).toBe(false)
    expect(await Badges.award(player, 'bdg_1234567')).toBe(false)
    expect(await Badges.award(player, 'bdg_' + 'a'.repeat(33))).toBe(false)
    expect(await Badges.award(player, 'bdg_0123456789ABCDEF')).toBe(false)
    expect(await Badges.award(player, 'BDG_0123456789abcdef')).toBe(false)
    expect(mockWrapSignedFetch).not.toHaveBeenCalled()
  })

  it('returns false when the service rejects the award', async () => {
    mockWrapSignedFetch.mockResolvedValue(['401 Unauthorized', null, 401])

    expect(await Badges.award(player, badge)).toBe(false)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('401'))
  })

  it('returns false when the request itself fails', async () => {
    mockWrapSignedFetch.mockResolvedValue(['network down', null, undefined])

    expect(await Badges.award(player, badge)).toBe(false)
  })

  it('returns false when the realm cannot be resolved', async () => {
    mockGetBadgesServerUrl.mockRejectedValue(new Error('Unable to retrieve realm information'))

    expect(await Badges.award(player, badge)).toBe(false)
    expect(mockWrapSignedFetch).not.toHaveBeenCalled()
  })
})
