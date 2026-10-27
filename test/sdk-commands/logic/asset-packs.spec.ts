import { pickAssetPacks } from '../../../packages/@dcl/sdk-commands/src/logic/asset-packs'

const bundled = { dir: '/sdk-commands/inspector/asset-packs', version: '2.18.0' }
const sceneOwn = (version: string) => ({ dir: '/scene/node_modules/@dcl/asset-packs', version })

describe('pickAssetPacks', () => {
  it('should use the bundled copy when the scene has none', () => {
    expect(pickAssetPacks(undefined, bundled)).toEqual({ dir: bundled.dir })
  })

  it('should use the scene copy when it is as new as the bundled one', () => {
    expect(pickAssetPacks(sceneOwn('2.18.0'), bundled)).toEqual({ dir: sceneOwn('').dir })
  })

  it('should use the scene copy when it is newer than the bundled one', () => {
    expect(pickAssetPacks(sceneOwn('2.19.1'), bundled)).toEqual({ dir: sceneOwn('').dir })
  })

  it('should use the bundled copy and warn when the scene copy is older', () => {
    const picked = pickAssetPacks(sceneOwn('2.17.2'), bundled)

    expect(picked?.dir).toBe(bundled.dir)
    expect(picked?.warning).toContain('@dcl/asset-packs 2.17.2')
    expect(picked?.warning).toContain('npm i @dcl/asset-packs@latest')
  })

  it('should treat a prerelease of the bundled version as older', () => {
    expect(pickAssetPacks(sceneOwn('2.18.0-123.commit-abc'), bundled)?.dir).toBe(bundled.dir)
  })

  it('should use the bundled copy when the scene copy has no readable version', () => {
    expect(pickAssetPacks(sceneOwn(''), bundled)?.dir).toBe(bundled.dir)
  })

  it('should keep the scene copy when the bundled version is unreadable', () => {
    expect(pickAssetPacks(sceneOwn('2.17.2'), { ...bundled, version: '' })?.dir).toBe(sceneOwn('').dir)
  })
})
