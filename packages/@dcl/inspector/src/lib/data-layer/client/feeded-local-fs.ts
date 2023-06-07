import { Engine } from '@dcl/ecs'
import { defineTransformComponent } from '@dcl/ecs/dist/components/manual/Transform'
import { defineMeshRendererComponent } from '@dcl/ecs/dist/components/extended/MeshRenderer'
import { Composite } from '@dcl/ecs'
import { GltfContainer, PointerEvents } from '@dcl/ecs/dist/components'
import { defineMaterialComponent } from '@dcl/ecs/dist/components/extended/Material'
import { defineMeshColliderComponent } from '@dcl/ecs/dist/components/extended/MeshCollider'

import { parseSceneFromComponent } from '../host/utils/component'
import { dumpEngineToComposite } from '../host/utils/engine-to-composite'
import { createFsInMemory } from '../../logic/in-memory-storage'
import { createEditorComponents } from '../../sdk/components'

function createTempEngine() {
  const engine = Engine()
  return {
    engine,
    components: {
      Transform: defineTransformComponent(engine),
      MeshRenderer: defineMeshRendererComponent(engine),
      MeshCollider: defineMeshColliderComponent(engine),
      Material: defineMaterialComponent(engine),
      GltfContainer: GltfContainer(engine),
      PointerEvents: PointerEvents(engine),
      ...createEditorComponents(engine)
    }
  }
}

type TempEngine = ReturnType<typeof createTempEngine>

function generateMinimalComposite({ engine, components }: TempEngine) {
  // custom component
  const cubeIdComponent = engine.defineComponent('cube-id', {})

  // main box
  const entity = engine.addEntity()
  components.Transform.create(entity, { position: { x: 8, y: 1, z: 8 } })
  components.MeshRenderer.setBox(entity)
  cubeIdComponent.create(entity)
  components.EntityNode.create(entity, { label: 'Magic Cube', parent: engine.RootEntity })

  // scene
  components.Scene.create(engine.RootEntity, {
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

  const composite = dumpEngineToComposite(engine, 'json')
  return Composite.toJson(composite)
}

function generateMainComposite({ engine, components }: TempEngine) {
  // custom component
  const cubeIdComponent = engine.defineComponent('cube-id', {})

  // main box

  const entity = engine.addEntity()
  components.Transform.create(entity, { position: { x: 8, y: 1, z: 8 } })
  components.MeshRenderer.setBox(entity)
  cubeIdComponent.create(entity)
  components.PointerEvents.create(entity, {
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
  components.Material.setPbrMaterial(entity, {
    albedoColor: {
      r: 1.0,
      g: 0.85,
      b: 0.42,
      a: 1.0
    }
  })
  components.EntityNode.create(entity, { label: 'Magic Cube', parent: engine.RootEntity })

  const gltfEntity = engine.addEntity()
  components.Transform.create(gltfEntity, {
    position: {
      x: 4,
      y: 0.8,
      z: 8
    }
  })
  components.GltfContainer.create(gltfEntity, { src: 'assets/models/test-glb.glb' })
  cubeIdComponent.create(gltfEntity)
  components.EntityNode.create(gltfEntity, { label: 'Gltf Test', parent: engine.RootEntity })

  // scene
  components.Scene.create(engine.RootEntity, {
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

  const composite = dumpEngineToComposite(engine, 'json')
  return Composite.toJson(composite)
}

const mainEngine = createTempEngine()
const minimalEngine = createTempEngine()

export const mainComposite = generateMainComposite(mainEngine)
export const minimalComposite = generateMinimalComposite(minimalEngine)

const builderMappings: Record<string, string> = {
  'assets/models/test-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models2/test2-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models2/test-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models2/casla-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models2/boedo-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models3/bird-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models4/romagnoli-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models5/romeo-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models6/ortigoza-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models7/hernandez-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models8/torrico-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models9/correa-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models9/pipi-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models10/san-lorenzo-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB'
}

function getFeededEngineAndComposite() {
  return { engine: mainEngine, composite: mainComposite }
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

  const { engine, composite } = getFeededEngineAndComposite()
  const scene = parseSceneFromComponent(engine.components.Scene.get(engine.engine.RootEntity))

  return createFsInMemory({
    ...fileContent,
    'main.composite': Buffer.from(JSON.stringify(composite), 'utf-8'),
    'scene.json': Buffer.from(JSON.stringify(scene), 'utf-8')
  })
}
