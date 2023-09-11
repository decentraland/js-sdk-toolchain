import { engine, Entity, SyncEntity, GltfContainer, Transform, Schemas } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { createCoin } from './modules/coin'
import * as utils from '@dcl-sdk/utils'
import { getRealm } from '~system/Runtime'
import { createNetworkManager } from '@dcl/sdk/network-transport'
import { isServer } from '~system/EngineApi'

// TODO: this could (or should?) be added as part of the networkTransport in the sdk package.
const NetworkEntityId = engine.defineComponent('server:network-entity', { id: Schemas.String })
export async function findNetworkId(id: string) {
  return new Promise<Entity>((resolve) => {
    function networkSystem() {
      for (const [entity, networkId] of engine.getEntitiesWith(NetworkEntityId)) {
        if (networkId.id === id) {
          engine.removeSystem(networkSystem)
          resolve(entity)
          return
        }
      }
    }
    engine.addSystem(networkSystem)
  })
}

export async function main() {
  const realm = await getRealm({})
  const serverUrl = realm.realmInfo?.isPreview
    ? 'ws://127.0.0.1:3000/ws/localScene'
    : 'wss://scene-state-server.decentraland.org/ws/MaximoCossetti.dcl.eth'
  const networkManager = await createNetworkManager({ serverUrl })

  const inAServer = isServer && (await isServer({})).isServer

  // Instantiate base models
  GltfContainer.create(engine.addEntity(), {
    src: 'models/baseLight.glb'
  })
  GltfContainer.create(engine.addEntity(), {
    src: 'models/staticPlatforms.glb'
  })

  // Instantiate pickable coin
  createCoin('models/starCoin.glb', Vector3.create(9, 12.75, 8), Vector3.create(1.5, 3, 1.5), Vector3.create(0, 1, 0))

  if (!inAServer) {
    const platform3Entity = await findNetworkId('platform3')
    const childTriggerEntity = engine.addEntity()
    Transform.create(childTriggerEntity, { parent: platform3Entity })

    utils.triggers.addTrigger(
      childTriggerEntity,
      utils.LAYER_1,
      utils.LAYER_1,
      [{ type: 'box', scale: Vector3.create(1, 2, 1) }],
      () => {
        startPath(
          platform3Entity,
          [Vector3.create(14, 4, 12), Vector3.create(14, 4, 4), Vector3.create(14, 4, 12)],
          20,
          false,
          false
        )
      }
    )
  }

  if (inAServer) {
    //// triggerable platform
    const platform3 = networkManager.addEntity(engine)
    GltfContainer.create(platform3, {
      src: 'models/triggerPlatform.glb'
    })
    Transform.create(platform3, {
      position: Vector3.create(14, 4, 12)
    })
    NetworkEntityId.create(platform3, { id: 'platform3' })
    SyncEntity.create(platform3, { componentIds: [Transform.componentId] })

    // Instantiate moving platforms

    //// only horizontal
    const platform1 = networkManager.addEntity(engine)
    GltfContainer.create(platform1, {
      src: 'models/movingPlatform.glb'
    })
    Transform.create(platform1, {
      position: Vector3.create(2, 1.5, 8)
    })
    SyncEntity.create(platform1, { componentIds: [Transform.componentId] })

    //// only vertical
    const platform2 = networkManager.addEntity(engine)
    GltfContainer.create(platform2, {
      src: 'models/movingPlatform.glb'
    })
    Transform.create(platform2, {
      position: Vector3.create(4, 1.5, 14)
    })
    SyncEntity.create(platform2, { componentIds: [Transform.componentId] })

    //// path with many waypoints
    const platform4 = networkManager.addEntity(engine)
    GltfContainer.create(platform4, {
      src: 'models/movingPlatform.glb'
    })
    Transform.create(platform4, {
      position: Vector3.create(6.5, 7, 4)
    })
    SyncEntity.create(platform4, { componentIds: [Transform.componentId] })

    startPath(
      platform1,
      [Vector3.create(2, 1.5, 8), Vector3.create(2, 1.5, 10), Vector3.create(2, 1.5, 8)],
      3,
      false,
      true
    )

    startPath(
      platform2,
      [Vector3.create(4, 1.5, 14), Vector3.create(4, 4, 14), Vector3.create(4, 1.5, 14)],
      2,
      false,
      true
    )

    startPath(
      platform4,
      [
        Vector3.create(6.5, 7, 4),
        Vector3.create(6.5, 7, 12),
        Vector3.create(6.5, 10.5, 12),
        Vector3.create(6.5, 10.5, 4),
        Vector3.create(6.5, 7, 4)
      ],
      40,
      false,
      true
    )
  }
}

// function to make path following recursive
function startPath(entity: Entity, path: Vector3[], duration: number, facePath?: boolean, loop?: boolean) {
  utils.paths.startStraightPath(entity, path, duration, false, function () {
    if (loop) startPath(entity, path, duration, facePath, loop)
  })
}
