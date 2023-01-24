import {
  engine,
  MeshRenderer,
  Transform,
  PointerHoverFeedback,
  InputAction,
  PointerEventType,
  Schemas,
  inputSystem
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { createCube } from './factory'

/**
 * BounceScaling is the flag-component with the time elapsed since creation.
 */
const BounceScalingComponentID = 2000
export const BounceScaling = engine.defineComponent({ t: Schemas.Number }, BounceScalingComponentID)

/**
 * All cubes rotating behavior
 */
export function circularSystem(dt: number) {
  const entitiesWithMeshRenderer = engine.getEntitiesWith(MeshRenderer, Transform)
  for (const [entity, _meshRenderer, _transform] of entitiesWithMeshRenderer) {
    const mutableTransform = Transform.getMutable(entity)

    mutableTransform.rotation = Quaternion.multiply(
      mutableTransform.rotation,
      Quaternion.fromAngleAxis(dt * 10, Vector3.Up())
    )
  }
}

/**
 * The spawner system is listening for entities with hover feedback, when a input is emitted
 * just spawn a new cube randomly and animate the spawner with a bounce.
 */
export function spawnerSystem() {
  const clickedCubes = engine.getEntitiesWith(PointerHoverFeedback)
  for (const [entity] of clickedCubes) {
    if (inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN, entity)) {
      createCube(1 + Math.random() * 8, Math.random() * 8, 1 + Math.random() * 8, false)
      BounceScaling.createOrReplace(entity)
    }
  }
}

/**
 * Add this system and every entity with BounceScaling will bounce for 5 seconds
 * @param dt - detal time in seconds
 */
export function bounceScalingSystem(dt: number) {
  const clickedCubes = engine.getEntitiesWith(BounceScaling, Transform)
  for (const [entity] of clickedCubes) {
    const m = BounceScaling.getMutable(entity)
    m.t += dt

    if (m.t > 5) {
      Transform.getMutable(entity).scale = Vector3.One()
      BounceScaling.deleteFrom(entity)
    } else {
      const factor = 0.9 + 0.2 * Math.exp(-1.5 * m.t) * Math.sin(10 * m.t)
      Transform.getMutable(entity).scale = Vector3.scale(Vector3.One(), factor)
    }
  }
}
