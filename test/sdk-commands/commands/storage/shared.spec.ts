import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import * as workspaceValidations from '../../../../packages/@dcl/sdk-commands/src/logic/workspace-validations'
import * as sceneValidations from '../../../../packages/@dcl/sdk-commands/src/logic/scene-validations'
import {
  validateWorkspaceAndWorld,
  buildStorageMetadata,
  createStorageInfo
} from '../../../../packages/@dcl/sdk-commands/src/commands/storage/shared'

const REMOTE = 'https://storage.decentraland.org'
const LOCAL = 'http://localhost:3000'

afterEach(() => {
  jest.restoreAllMocks()
})

function mockSceneJson(scene: any) {
  jest.spyOn(workspaceValidations, 'getValidWorkspace').mockResolvedValue({} as any)
  jest.spyOn(sceneValidations, 'getValidSceneJson').mockResolvedValue(scene)
}

describe('storage/shared: validateWorkspaceAndWorld', () => {
  it('resolves a World scene from worldConfiguration.name', async () => {
    const components = await initComponents()
    mockSceneJson({ worldConfiguration: { name: 'boedo.dcl.eth' }, scene: { base: '0,0', parcels: ['0,0'] } })

    const res = await validateWorkspaceAndWorld(components, 'root', REMOTE)

    expect(res).toEqual({ worldName: 'boedo.dcl.eth', baseParcel: '0,0', parcels: ['0,0'] })
  })

  it('resolves a Genesis City scene (no worldConfiguration.name) by its base parcel', async () => {
    const components = await initComponents()
    mockSceneJson({ scene: { base: '20,2', parcels: ['20,2', '20,3'] } })

    const res = await validateWorkspaceAndWorld(components, 'root', REMOTE)

    expect(res).toEqual({ worldName: undefined, baseParcel: '20,2', parcels: ['20,2', '20,3'] })
  })

  it('falls back to the base parcel for parcels when scene.parcels is absent', async () => {
    const components = await initComponents()
    mockSceneJson({ scene: { base: '-3,-2' } })

    const res = await validateWorkspaceAndWorld(components, 'root', REMOTE)

    expect(res).toEqual({ worldName: undefined, baseParcel: '-3,-2', parcels: ['-3,-2'] })
  })

  it('throws when neither worldConfiguration.name nor scene.base is present', async () => {
    const components = await initComponents()
    mockSceneJson({ scene: {} })

    await expect(validateWorkspaceAndWorld(components, 'root', REMOTE)).rejects.toMatchObject({
      name: 'STORAGE_MISSING_LOCATION'
    })
  })

  it('does not throw against a local target even without world name or base parcel', async () => {
    const components = await initComponents()
    mockSceneJson({ scene: {} })

    const res = await validateWorkspaceAndWorld(components, 'root', LOCAL)

    expect(res).toEqual({ worldName: undefined, baseParcel: '0,0', parcels: [] })
  })
})

describe('storage/shared: buildStorageMetadata', () => {
  it('sends realm + realmName + parcel for a World', () => {
    expect(JSON.parse(buildStorageMetadata('boedo.dcl.eth', '0,0'))).toEqual({
      realm: { serverName: 'boedo.dcl.eth' },
      realmName: 'boedo.dcl.eth',
      parcel: '0,0'
    })
  })

  it('sends only the parcel for a Genesis City scene (server defaults the realm to "main")', () => {
    expect(JSON.parse(buildStorageMetadata(undefined, '20,2'))).toEqual({ parcel: '20,2' })
  })
})

describe('storage/shared: createStorageInfo', () => {
  it('marks a World as isWorld and carries the world name', () => {
    const info = createStorageInfo(
      'player',
      'get',
      'https://storage.decentraland.org/players/0xabc/values/k',
      'boedo.dcl.eth',
      '0,0',
      ['0,0'],
      'k',
      undefined,
      '0xabc'
    )

    expect(info.isWorld).toBe(true)
    expect(info.world).toBe('boedo.dcl.eth')
    expect(JSON.parse(info.metadata)).toEqual({
      realm: { serverName: 'boedo.dcl.eth' },
      realmName: 'boedo.dcl.eth',
      parcel: '0,0'
    })
  })

  it('marks a Genesis City scene as not isWorld and omits the realm from metadata', () => {
    const info = createStorageInfo(
      'player',
      'get',
      'https://storage.decentraland.org/players/0xabc/values/k',
      undefined,
      '20,2',
      ['20,2'],
      'k',
      undefined,
      '0xabc'
    )

    expect(info.isWorld).toBe(false)
    expect(info.world).toBeUndefined()
    expect(JSON.parse(info.metadata)).toEqual({ parcel: '20,2' })
  })
})
