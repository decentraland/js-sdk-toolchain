import {
  engine,
  Entity,
  InputAction,
  inputSystem,
  PBPointerEventsResult,
  PointerEventsResult,
  PointerEventType,
  Transform
} from '@dcl/sdk/ecs'
import * as components from '@dcl/ecs/dist/components'
import { withRenderer } from './helpers/with-renderer'
export * from '@dcl/sdk'

const entity = 512 as Entity

withRenderer((engine) => {
  const PointerEventsResult = components.PointerEventsResult(engine)

  let count = 0

  // this system adds a command of mouse DOWN UP DOWN UP DOWN UP changing
  // once per frame
  engine.addSystem(() => {
    count++

    PointerEventsResult.addValue(
      entity,
      createTestPointerDownCommand(entity, count, count % 2 ? PointerEventType.PET_DOWN : PointerEventType.PET_UP)
    )
  })
})

function createTestPointerDownCommand(
  entity: Entity,
  timestamp: number,
  state: PointerEventType
): PBPointerEventsResult {
  return {
    button: InputAction.IA_POINTER,
    timestamp: timestamp,
    hit: {
      position: { x: 1, y: 2, z: 3 },
      length: 10,
      direction: { x: 1, y: 2, z: 3 },
      normalHit: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh',
      entityId: entity as number
    },
    state: state,
    analog: 5
  }
}

Transform.createOrReplace(entity, {})

engine.addSystem((_dt) => {
  console.log('PointerEventsResult', Array.from(PointerEventsResult.get(entity)))
  console.log('isPressed', inputSystem.isPressed(InputAction.IA_POINTER))
  console.log('isTriggered(entity)=', inputSystem.isTriggered(InputAction.IA_POINTER, entity))
  console.log('isTriggered(RootEntity)=', inputSystem.isTriggered(InputAction.IA_POINTER, engine.RootEntity))
  console.log(
    'getCommand(RootEntity)=',
    inputSystem.getInputCommand(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)
  )
})
