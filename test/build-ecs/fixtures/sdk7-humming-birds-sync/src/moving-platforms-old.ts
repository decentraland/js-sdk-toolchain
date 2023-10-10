import { GltfContainer, Transform, SyncComponents, Entity } from '@dcl/ecs'
import * as utils from '@dcl-sdk/utils'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { engine } from '@dcl/sdk/ecs'
import { NetworkManager } from '@dcl/sdk/network-transport/types'

const diffZ = 20

export function createMovingPlatformsOld(networkedEntityFactory: NetworkManager) {
  //// triggerable platform

  //// only horizontal
  const platform1 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform1, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform1, {
    position: Vector3.create(2, 1.5, 8 + diffZ)
  })
  SyncComponents.create(platform1, { componentIds: [Transform.componentId] })
  //// only vertical
  const platform2 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform2, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform2, {
    position: Vector3.create(4, 1.5, 14 + diffZ)
  })
  SyncComponents.create(platform2, { componentIds: [Transform.componentId] })

  //// path with many waypoints
  const platform4 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform4, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform4, {
    position: Vector3.create(6.5, 7, 4 + diffZ)
  })
  SyncComponents.create(platform4, { componentIds: [Transform.componentId] })

  const platform3 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform3, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform3, {
    position: Vector3.create(14, 4, 12 + diffZ)
  })
  SyncComponents.create(platform3, { componentIds: [Transform.componentId] })
  startPath(
    platform3,
    [Vector3.create(14, 4, 12 + diffZ), Vector3.create(14, 4, 4 + diffZ), Vector3.create(14, 4, 12 + diffZ)],
    3,
    false,
    true
  )

  startPath(
    platform1,
    [Vector3.create(2, 1.5, 6 + diffZ), Vector3.create(2, 1.5, 12 + diffZ), Vector3.create(2, 1.5, 6 + diffZ)],
    4,
    false,
    true
  )

  startPath(
    platform2,
    [Vector3.create(4, 1.5, 14 + diffZ), Vector3.create(4, 4, 14 + diffZ), Vector3.create(4, 1.5, 14 + diffZ)],
    2,
    false,
    true
  )

  startPath(
    platform4,
    [
      Vector3.create(6.5, 7, 4 + diffZ),
      Vector3.create(6.5, 7, 12 + diffZ),
      Vector3.create(6.5, 10.5, 12 + diffZ),
      Vector3.create(6.5, 10.5, 4 + diffZ),
      Vector3.create(6.5, 7, 4 + diffZ)
    ],
    40,
    false,
    true
  )

  function rotate() {
    utils.tweens.startRotation(
      platform2,
      Quaternion.fromEulerDegrees(0, 0, 0),
      Quaternion.fromEulerDegrees(0, 180, 0),
      1,
      utils.InterpolationType.LINEAR,
      rotate
    )
  }
  rotate()
}

// function to make path following recursive
function startPath(entity: Entity, path: Vector3[], duration: number, facePath?: boolean, loop?: boolean) {
  utils.paths.startStraightPath(entity, path, duration, false, function () {
    if (loop) startPath(entity, path, duration, facePath, loop)
  })
}
