import { getBadgesServerUrl } from '../../../../packages/@dcl/sdk-commands/src/commands/start/badges-server-url'

describe('getBadgesServerUrl', () => {
  it('is undefined when the variable is unset or blank', () => {
    expect(getBadgesServerUrl({})).toBeUndefined()
    expect(getBadgesServerUrl({ BADGES_SERVER_URL: '  ' })).toBeUndefined()
  })

  it('returns the origin, tolerating a trailing slash', () => {
    expect(getBadgesServerUrl({ BADGES_SERVER_URL: 'http://localhost:4000' })).toBe('http://localhost:4000')
    expect(getBadgesServerUrl({ BADGES_SERVER_URL: 'http://localhost:4000/' })).toBe('http://localhost:4000')
    expect(getBadgesServerUrl({ BADGES_SERVER_URL: 'https://badges.decentraland.zone/' })).toBe(
      'https://badges.decentraland.zone'
    )
  })

  it('refuses a path, query or fragment, since the award is signed over its path', () => {
    for (const value of ['http://localhost:4000/api', 'http://localhost:4000/?x=1', 'http://localhost:4000/#f']) {
      expect(() => getBadgesServerUrl({ BADGES_SERVER_URL: value })).toThrow('origin with no path')
    }
  })

  it('refuses anything but http(s), and strings that are not URLs', () => {
    expect(() => getBadgesServerUrl({ BADGES_SERVER_URL: 'file:///tmp' })).toThrow('http(s)')
    expect(() => getBadgesServerUrl({ BADGES_SERVER_URL: 'ftp://host' })).toThrow('http(s)')
    expect(() => getBadgesServerUrl({ BADGES_SERVER_URL: 'localhost:4000' })).toThrow()
    expect(() => getBadgesServerUrl({ BADGES_SERVER_URL: 'not a url' })).toThrow('not a valid URL')
  })
})
