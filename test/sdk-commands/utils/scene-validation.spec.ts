import { areConnected } from '../../../packages/@dcl/ecs/src/runtime/helpers/coordinates'
import { initComponents } from '../../../packages/@dcl/sdk-commands/src/components'
import * as v from '../../../packages/@dcl/sdk-commands/src/logic/scene-validations'
import * as projectFiles from '../../../packages/@dcl/sdk-commands/src/logic/project-files'
import { Stats } from 'fs'

describe('scene validations', () => {
  it('sanity scene validations', async () => {
    const components = await initComponents()
    await expect(async () => v.assertValidScene(components, {} as any)).rejects.toThrow()
    await expect(async () => v.assertValidScene(components, { base: null } as any)).rejects.toThrow()
    await expect(async () => v.assertValidScene(components, { main: 'test' } as any)).rejects.toThrow()
    await expect(async () => v.assertValidScene(components, { main: 'test.js', scene: null as any })).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene(components, { main: 'test.js', scene: { base: 'test', parcels: [] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene(components, { main: 'test.js', scene: { base: '0,0', parcels: [] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene(components, { main: 'test.js', scene: { base: '0,0', parcels: ['0,0', '0,0'] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene(components, { main: 'test.js', scene: { base: '0,0', parcels: ['0,0', '3,0'] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene(components, { main: 'test.js', scene: { base: '1,0', parcels: ['0,0'] } })
    ).rejects.toThrow()
    await expect(async () =>
      v.assertValidScene(components, { main: 'test.js', scene: { base: '1000,0', parcels: ['1000,0'] } })
    ).rejects.toThrow()
    v.assertValidScene(components, { main: 'test.js', scene: { base: '0,0', parcels: ['0,0'] } })
    await expect(async () =>
      v.assertValidScene(components, { main: 'test.json', scene: { base: '1,0', parcels: ['1,0'] } })
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
  it('areConnected: two adjacent parcels - horizontal', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ])
    ).toEqual(true)
  })
  it('areConnected: two diagonal parcels are not connected', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ])
    ).toEqual(false)
  })
  it('areConnected: straight horizontal line', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 }
      ])
    ).toEqual(true)
  })
  it('areConnected: straight vertical line', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 0, y: 3 },
        { x: 0, y: 4 }
      ])
    ).toEqual(true)
  })
  it('areConnected: L-shape', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ])
    ).toEqual(true)
  })
  it('areConnected: T-shape / cross', () => {
    expect(
      areConnected([
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 0, y: 1 },
        { x: 2, y: 1 }
      ])
    ).toEqual(true)
  })
  it('areConnected: 2x2 square block', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ])
    ).toEqual(true)
  })
  it('areConnected: 3x3 square block', () => {
    const parcels: { x: number; y: number }[] = []
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        parcels.push({ x, y })
      }
    }
    expect(areConnected(parcels)).toEqual(true)
  })
  it('areConnected: zig-zag / snake path', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 2 }
      ])
    ).toEqual(true)
  })
  it('areConnected: two internally-connected clusters separated', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 5, y: 5 },
        { x: 6, y: 5 }
      ])
    ).toEqual(false)
  })
  it('areConnected: outlier parcel far from a connected cluster', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 10, y: 10 }
      ])
    ).toEqual(false)
  })
  it('areConnected: two parcels separated by exactly one gap', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 2, y: 0 }
      ])
    ).toEqual(false)
  })
  it('areConnected: horizontal line separated from outlier parcel by exactly one gap', () => {
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 4, y: 0 }
      ])
    ).toEqual(false)
  })
  it('areConnected: diagonal-only staircase - corners touch but no edges', () => {
    // Each sub-cluster is internally edge-connected, but sub-clusters
    // are only joined at corners (diagonal contact), so the whole set
    // is not connected under edge-adjacency.
    expect(
      areConnected([
        { x: 0, y: 3 },
        { x: 1, y: 3 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 3, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 }
      ])
    ).toEqual(false)
  })
  it('areConnected: parcels with negative coords', () => {
    expect(
      areConnected([
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ])
    ).toEqual(true)
  })
  it('areConnected: parcels around the origin (excluding the origin)', () => {
    expect(
      areConnected([
        { x: -1, y: -1 },
        { x: -1, y: 0 },
        { x: -1, y: 1 },
        { x: 1, y: -1 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: -1 },
        { x: 0, y: 1 }
      ])
    ).toEqual(true)
  })
  it('areConnected: order independence - same set in different orders', () => {
    const a = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ]
    const b = [
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 0 }
    ]
    const c = [
      { x: 1, y: 1 },
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 0 }
    ]
    expect(areConnected(a)).toEqual(true)
    expect(areConnected(b)).toEqual(true)
    expect(areConnected(c)).toEqual(true)
  })
  it('areConnected: starting parcel is the farthest from the origin', () => {
    // Traversal starts at parcels[0]; placing a leaf there ensures
    // the algorithm still reaches the rest of the connected set.
    expect(
      areConnected([
        { x: 3, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ])
    ).toEqual(true)
  })
  it('areConnected: duplicates make a connected set report as not connected', () => {
    // Pin current behavior: visited counts unique parcels, but the
    // length check compares against the raw input length, so any
    // duplicate causes a false result.
    expect(
      areConnected([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 1 }
      ])
    ).toEqual(false)
  })
  it('areConnected: large connected 20x20 grid', () => {
    const parcels: { x: number; y: number }[] = []
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        parcels.push({ x, y })
      }
    }
    expect(areConnected(parcels)).toEqual(true)
  })
  it('areConnected: large disconnected set', () => {
    const parcels: { x: number; y: number }[] = []
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        parcels.push({ x, y })
      }
    }
    parcels.push({ x: 100, y: 100 })
    expect(areConnected(parcels)).toEqual(false)
  })
  it('getValidSceneJson: throws when failing to read "scene.json" file', async () => {
    const components = await initComponents()
    jest.spyOn(components.fs, 'readFile').mockResolvedValue('invalid-scene')
    await expect(() => v.getValidSceneJson(components, 'some-path')).rejects.toThrow()
  })
  it('getFiles: should return an "IFile" list', async () => {
    const components = await initComponents()
    jest.spyOn(projectFiles, 'getPublishableFiles').mockResolvedValue(['file1', 'file2'])
    jest.spyOn(components.fs, 'stat').mockResolvedValue({ size: 1 } as Stats)
    jest.spyOn(components.fs, 'readFile').mockResolvedValue(Buffer.from('test'))

    const res = await v.getFiles(components, 'some-dir')

    expect(res).toStrictEqual([
      {
        path: 'file1',
        content: Buffer.from('test'),
        size: 1
      },
      {
        path: 'file2',
        content: Buffer.from('test'),
        size: 1
      }
    ])
  })
  it('validateFilesSizes: should throw if any "IFile" size is bigger than the desired file size', async () => {
    const list = [
      {
        path: 'file1',
        content: Buffer.from('test'),
        size: 1
      },
      {
        path: 'file2',
        content: Buffer.from('test'),
        size: v.MAX_FILE_SIZE_BYTES + 1
      }
    ]
    expect(() => v.validateFilesSizes(list)).toThrow()
  })
})
