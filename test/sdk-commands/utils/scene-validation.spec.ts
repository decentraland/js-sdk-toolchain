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
