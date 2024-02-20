import { Scene } from '@dcl/schemas'
import {
  createTempEngineContext,
  generateFeededComposite,
  generateMinimalComposite
} from '../../../client/feeded-local-fs'
import { buildNodesHierarchy } from './build-nodes-hierarchy'

const scene: Scene = {
  main: '',
  display: {
    title: 'Feeded Scene',
    description: 'This is a feeded scene.json into memory',
    navmapThumbnail: 'assets/scene/feeded-thumbnail.png'
  },
  scene: {
    parcels: ['2,2', '2,3', '3,2', '3,3'],
    base: '2,2'
  },
  contact: {
    name: 'John Doe',
    email: 'johndoe@email.com'
  },
  tags: ['game', 'art', 'super fun', 'cool'],
  spawnPoints: [
    {
      name: 'Feeded Spawn Point',
      default: true,
      position: {
        x: [4, 6],
        y: [1, 1],
        z: [4, 6]
      },
      cameraTarget: {
        x: 8,
        y: 1,
        z: 8
      }
    }
  ],
  featureToggles: {
    voiceChat: 'disabled'
  }
}

describe('Migration: Build Node component hierarchy', () => {
  let engineCtx: ReturnType<typeof createTempEngineContext>
  beforeEach(() => {
    engineCtx = createTempEngineContext()
  })
  it('should build same hierarchy as in main composite', () => {
    generateFeededComposite(engineCtx, scene) // create entities & components

    const { engine, components } = engineCtx

    const hierarchy = buildNodesHierarchy(engineCtx.engine)
    const expected = components.Nodes.getMutable(engine.RootEntity).value

    expect(hierarchy).toEqual(expect.arrayContaining(expected))
  })

  it('should build same hierarchy as in minimal composite', () => {
    generateMinimalComposite(engineCtx) // create entities & components

    const { engine, components } = engineCtx

    const hierarchy = buildNodesHierarchy(engineCtx.engine)
    const expected = components.Nodes.getMutable(engine.RootEntity).value

    expect(hierarchy).toEqual(expect.arrayContaining(expected))
  })

  it('should build hierarchy with RootEntity as only node', () => {
    const { engine } = engineCtx
    const hierarchy = buildNodesHierarchy(engineCtx.engine)
    expect(hierarchy).toEqual([
      { entity: engine.RootEntity, open: true, children: [] },
      { entity: engine.PlayerEntity, children: [] },
      { entity: engine.CameraEntity, children: [] }
    ])
  })
})
