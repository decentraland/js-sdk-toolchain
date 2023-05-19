import { Engine } from '@dcl/ecs'
import { defineTransformComponent } from '@dcl/ecs/dist/components/manual/Transform'
import { createFsInMemory } from '../../logic/in-memory-storage'
import { defineMeshRendererComponent } from '@dcl/ecs/dist/components/extended/MeshRenderer'
import { createEditorComponents } from '../../sdk/components'
import { dumpEngineToComposite } from '../host/utils/engine-to-composite'
import { Composite } from '@dcl/ecs'
import { GltfContainer, PointerEvents } from '@dcl/ecs/dist/components'
import { defineMaterialComponent } from '@dcl/ecs/dist/components/extended/Material'
import { defineMeshColliderComponent } from '@dcl/ecs/dist/components/extended/MeshCollider'

function createTempEngine() {
  const engine = Engine()
  return {
    engine,
    Transform: defineTransformComponent(engine),
    MeshRenderer: defineMeshRendererComponent(engine),
    MeshCollider: defineMeshColliderComponent(engine),
    Material: defineMaterialComponent(engine),
    GltfContainer: GltfContainer(engine),
    PointerEvents: PointerEvents(engine),
    ...createEditorComponents(engine)
  }
}

function generateMinimalComposite() {
  const tmp = createTempEngine()
  // custom component
  const cubeIdComponent = tmp.engine.defineComponent('cube-id', {})

  // main box
  const entity = tmp.engine.addEntity()
  tmp.Transform.create(entity, { position: { x: 8, y: 1, z: 8 } })
  tmp.MeshRenderer.setBox(entity)
  cubeIdComponent.create(entity)
  tmp.EntityNode.create(entity, { label: 'Magic Cube', parent: tmp.engine.RootEntity })

  // scene
  tmp.Scene.create(tmp.engine.RootEntity, {
    layout: {
      base: {
        x: 0,
        y: 0
      },
      parcels: [
        {
          x: 0,
          y: 0
        }
      ]
    }
  })

  const composite = dumpEngineToComposite(tmp.engine, 'json')
  return Composite.toJson(composite)
}

function generateMainComposite() {
  const tmp = createTempEngine()
  // custom component
  const cubeIdComponent = tmp.engine.defineComponent('cube-id', {})

  // main box

  const entity = tmp.engine.addEntity()
  tmp.Transform.create(entity, { position: { x: 8, y: 1, z: 8 } })
  tmp.MeshRenderer.setBox(entity)
  cubeIdComponent.create(entity)
  tmp.PointerEvents.create(entity, {
    pointerEvents: [
      {
        eventType: 1,
        eventInfo: {
          button: 1,
          hoverText: 'Press E to spawn',
          maxDistance: 100,
          showFeedback: true
        }
      }
    ]
  })
  tmp.Material.setPbrMaterial(entity, {
    albedoColor: {
      r: 1.0,
      g: 0.85,
      b: 0.42,
      a: 1.0
    }
  })
  tmp.EntityNode.create(entity, { label: 'Magic Cube', parent: tmp.engine.RootEntity })

  const gltfEntity = tmp.engine.addEntity()
  tmp.Transform.create(gltfEntity, {
    position: {
      x: 4,
      y: 0.8,
      z: 8
    }
  })
  tmp.GltfContainer.create(gltfEntity, { src: 'assets/models/test-glb.glb' })
  cubeIdComponent.create(gltfEntity)
  tmp.EntityNode.create(gltfEntity, { label: 'Gltf Test', parent: tmp.engine.RootEntity })

  // scene
  tmp.Scene.create(tmp.engine.RootEntity, {
    layout: {
      base: {
        x: 0,
        y: 0
      },
      parcels: [
        {
          x: 0,
          y: 0
        },
        {
          x: 0,
          y: 1
        },
        {
          x: 1,
          y: 0
        }
      ]
    }
  })

  const composite = dumpEngineToComposite(tmp.engine, 'json')
  return Composite.toJson(composite)
}

export const mainComposite = generateMainComposite()
export const minimalComposite = generateMinimalComposite()

const builderMappings: Record<string, string> = {
  'assets/models/test-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models2/test2-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB'
}

export async function feededFileSystem(mappings: Record<string, string> = builderMappings) {
  const fileContent: Record<string, Buffer> = {}

  async function downloadAndAssignAsset([path, contentHash]: [string, string]) {
    try {
      const url = `https://builder-api.decentraland.org/v1/storage/contents/${contentHash}`
      const request = await fetch(url)
      const content = await request.arrayBuffer()
      fileContent[path] = Buffer.from(content)
    } catch (err) {
      console.error('Error fetching an asset for feed in-memory storage ' + path)
    }
  }

  const assetPromises = Object.entries(mappings).map(downloadAndAssignAsset)
  await Promise.all(assetPromises)

  return createFsInMemory({
    ...fileContent,
    'main.composite': Buffer.from(JSON.stringify(mainComposite), 'utf-8')
  })
}
