import { Composite } from '@dcl/ecs'
import { PointerEvents } from '@dcl/ecs/dist/components'
import { defineMaterialComponent } from '@dcl/ecs/dist/components/extended/Material'

import { parseSceneFromComponent } from '../host/utils/component'
import { dumpEngineToComposite } from '../host/utils/engine-to-composite'
import { createFileSystemInterface } from '../../logic/file-system-interface'
import { createEngineContext } from '../host/utils/engine'
import { createInMemoryStorage } from '../../logic/storage/in-memory'
import { downloadAssets } from './builder-utils'

export function createTempEngineContext() {
  const { engine, components } = createEngineContext()
  return {
    engine,
    components: {
      ...components,
      Material: defineMaterialComponent(engine),
      PointerEvents: PointerEvents(engine)
    }
  }
}

type TempEngine = ReturnType<typeof createTempEngineContext>

export function generateMinimalComposite({ engine, components }: TempEngine) {
  // custom component
  const cubeIdComponent = engine.defineComponent('cube-id', {})

  // main box
  const entity = engine.addEntity()
  components.Transform.create(entity, { position: { x: 8, y: 1, z: 8 }, parent: engine.RootEntity })
  components.MeshRenderer.setBox(entity)
  cubeIdComponent.create(entity)
  components.Name.create(entity, { value: 'Magic Cube' })

  // nodes
  components.Nodes.create(engine.RootEntity, {
    value: [
      { entity: engine.RootEntity, children: [entity] },
      { entity, children: [] }
    ]
  })

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

export function generateMainComposite({ engine, components }: TempEngine) {
  // custom component
  const cubeIdComponent = engine.defineComponent('cube-id', {})

  // entities
  const entity = engine.addEntity()
  const gltfEntity = engine.addEntity()

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
  components.Name.create(entity, { value: 'Magic Cube' })

  components.Transform.create(gltfEntity, {
    position: {
      x: 4,
      y: 0.8,
      z: 8
    }
  })
  components.GltfContainer.create(gltfEntity, { src: 'assets/scene/models/test-glb.glb' })
  cubeIdComponent.create(gltfEntity)
  components.Name.create(gltfEntity, { value: 'Gltf Test' })

  // nodes
  components.Nodes.create(engine.RootEntity, {
    value: [
      { entity: engine.RootEntity, children: [entity, gltfEntity] },
      { entity, children: [] },
      { entity: gltfEntity, children: [] }
    ]
  })

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

export const getMinimalComposite = () => generateMinimalComposite(createTempEngineContext())

const builderMappings: Record<string, string> = {
  'assets/scene/models/test-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models2/test2-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models2/test-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models2/casla-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models2/boedo-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models3/bird-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models4/romagnoli-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models5/romeo-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models6/ortigoza-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models7/hernandez-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models8/torrico-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models9/correa-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models9/pipi-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e',
  'assets/scene/models10/san-lorenzo-glb.glb': 'bafkreibzw3d2aziiw2yhq7eoihytxthsulbihbr2ds2zegmsreaycy4h7e'
}

function getFeededEngineAndComposite() {
  const context = createTempEngineContext()
  return { engineContext: context, composite: generateMainComposite(context) }
}

export async function feededFileSystem(mappings: Record<string, string> = builderMappings) {
  const { engineContext, composite } = getFeededEngineAndComposite()
  const scene = parseSceneFromComponent(engineContext.components.Scene.get(engineContext.engine.RootEntity))

  const assets = await downloadAssets(mappings)

  const storage = createInMemoryStorage({
    ...assets,
    'assets/scene/main.composite': Buffer.from(JSON.stringify(composite), 'utf-8'),
    'scene.json': Buffer.from(JSON.stringify(scene), 'utf-8')
  })

  return createFileSystemInterface(storage)
}
