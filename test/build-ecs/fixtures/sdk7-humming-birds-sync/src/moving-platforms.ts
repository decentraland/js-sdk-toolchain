import { GltfContainer, Transform, SyncEntity, Entity } from '@dcl/ecs'
import * as utils from '@dcl-sdk/utils'
import { Vector3 } from '@dcl/sdk/math'
import { NetworkEntityFactory } from '@dcl/sdk/network-transport/types'

export function createMovingPlatforms(networkedEntityFactory: NetworkEntityFactory) {
  //// triggerable platform

  //// only horizontal
  const platform1 = networkedEntityFactory.addEntity()
  GltfContainer.create(platform1, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform1, {
    position: Vector3.create(2, 1.5, 8)
  })
  SyncEntity.create(platform1, { componentIds: [Transform.componentId] })
  //// only vertical
  const platform2 = networkedEntityFactory.addEntity()
  GltfContainer.create(platform2, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform2, {
    position: Vector3.create(4, 1.5, 14)
  })
  SyncEntity.create(platform2, { componentIds: [Transform.componentId] })

  //// path with many waypoints
  const platform4 = networkedEntityFactory.addEntity()
  GltfContainer.create(platform4, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform4, {
    position: Vector3.create(6.5, 7, 4)
  })
  SyncEntity.create(platform4, { componentIds: [Transform.componentId] })

  const platform3 = networkedEntityFactory.addEntity()
  GltfContainer.create(platform3, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform3, {
    position: Vector3.create(14, 4, 12)
  })
  SyncEntity.create(platform3, { componentIds: [Transform.componentId] })
  startPath(platform3, [Vector3.create(14, 4, 12), Vector3.create(14, 4, 4), Vector3.create(14, 4, 12)], 3, false, true)

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

// function to make path following recursive
function startPath(entity: Entity, path: Vector3[], duration: number, facePath?: boolean, loop?: boolean) {
  utils.paths.startStraightPath(entity, path, duration, false, function () {
    if (loop) startPath(entity, path, duration, facePath, loop)
  })
}
