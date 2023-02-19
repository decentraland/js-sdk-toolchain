import * as v from '../../../packages/@dcl/sdk-commands/src/logic/scene-validations'
import { areConnected } from '../../../packages/@dcl/sdk-commands/src/logic/coordinates'

describe('scene validations', () => {
  it('sanity scene validations', async () => {
    await expect(async () => v.assertValidScene({} as any)).rejects.toThrow()
    await expect(async () => v.assertValidScene({ base: null } as any)).rejects.toThrow()
    await expect(async () => v.assertValidScene({ main: 'test' } as any)).rejects.toThrow()
    await expect(async () => v.assertValidScene({ main: 'test.js', scene: null as any })).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene({ main: 'test.js', scene: { base: 'test', parcels: [] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene({ main: 'test.js', scene: { base: '0,0', parcels: [] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene({ main: 'test.js', scene: { base: '0,0', parcels: ['0,0', '0,0'] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene({ main: 'test.js', scene: { base: '0,0', parcels: ['0,0', '3,0'] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene({ main: 'test.js', scene: { base: '1,0', parcels: ['0,0'] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene({ main: 'test.js', scene: { base: '1000,0', parcels: ['1000,0'] } })
    ).rejects.toThrow()
    v.assertValidScene({ main: 'test.js', scene: { base: '0,0', parcels: ['0,0'] } })
    await expect(async () =>
      v.assertValidScene({ main: 'test.json', scene: { base: '1,0', parcels: ['1,0'] } })
    ).rejects.toThrow()
  })
  it('validates connected parcels', () => {
    expect(areConnected([{ x: 0, y: 0 }])).toEqual(true)
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 0, y: 1 }
      ])
    ).toEqual(true)
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 0, y: 2 }
      ])
    ).toEqual(false)
    expect(areConnected([])).toEqual(false)
  })
})
