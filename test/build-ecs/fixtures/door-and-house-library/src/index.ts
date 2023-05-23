import { engine, InputAction, inputSystem, PointerEventType, Schemas, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Scalar, Vector3 } from '@dcl/sdk/math'

const DoorComponent = engine.defineComponent('test-door-component', {
  open: Schemas.Boolean,
  factor: Schemas.Float,
  changingState: Schemas.Boolean,
  handleEntity: Schemas.Entity
})

function doorSystem(dt: number) {
  const entities = engine.getEntitiesWith(DoorComponent, Transform)
  for (const [entity, door] of entities) {
    if (
      inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN, door.handleEntity) &&
      !door.changingState
    ) {
      DoorComponent.getMutable(entity).changingState = true
      DoorComponent.getMutable(entity).open = !door.open
    }

    if (door.changingState) {
      const doorMut = DoorComponent.getMutable(entity)
      const velocity = 2.0
      doorMut.factor = Scalar.clamp(doorMut.factor + (doorMut.open ? -1 : 1) * velocity * dt, 0.0, 1.0)

      if (doorMut.factor === 1.0 || doorMut.factor === 0.0) {
        doorMut.changingState = false
      }

      const mutableTransform = Transform.getMutable(entity)
      mutableTransform.rotation = Quaternion.fromAngleAxis(
        90.0 * Math.sin(0.5 * Math.PI * doorMut.factor),
        Vector3.Up()
      )
    }
  }
}

engine.addSystem(doorSystem)
