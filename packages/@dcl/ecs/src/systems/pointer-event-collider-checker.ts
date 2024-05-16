/* istanbul ignore file */
import * as components from '../components'
import { Entity } from '../engine'
import { IEngine } from '../engine/types'

/**
 * It checks all the entities that has a PointerEvent and check if it has a collider.
 * *
 * @public
 * @params engine
 */
export function pointerEventColliderChecker(engine: IEngine) {
  const PointerEvents = components.PointerEvents(engine)
  const MeshCollider = components.MeshCollider(engine)
  const GltfContainer = components.GltfContainer(engine)
  const UiTransform = components.UiTransform(engine)
  const alreadyShownlog = new Set<Entity>()
  let timer = 0
  function systemChecker(dt: number) {
    timer += dt
    if (timer <= 10) {
      return
    }
    timer = 0
    for (const [entity] of engine.getEntitiesWith(PointerEvents)) {
      if (alreadyShownlog.has(entity)) continue
      // Maybe the collider is inside the GLTFContainer. Ignore it
      if (GltfContainer.has(entity)) continue

      // UI handles the pointer's in a diff way.
      if (UiTransform.has(entity)) continue

      // check for Mesh Pointer Collision Layer
      const mesh = MeshCollider.getOrNull(entity)
      if (mesh) {
        if (mesh.collisionMask === undefined || mesh.collisionMask & components.ColliderLayer.CL_POINTER) {
          continue
        }
      }
      alreadyShownlog.add(entity)
      console.log(
        `⚠️ Missing MeshCollider component on entity ${entity}. Add a MeshCollider to the entity so it can be clickeable by the player.
See https://docs.decentraland.org/creator/development-guide/sdk7/colliders/#pointer-blocking`
      )
    }
  }
  engine.removeSystem(systemChecker)
  engine.addSystem(systemChecker)
}
