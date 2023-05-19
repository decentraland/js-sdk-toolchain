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
import { withRenderer } from '../helpers/with-renderer'
import { assert } from '../helpers/assertions'
export * from '@dcl/sdk'

const entity = 512 as Entity

export const onServerUpdate = withRenderer((engine) => {
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
      globalOrigin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh',
      entityId: entity as number
    },
    state: state,
    analog: 5,
    tickNumber: 0
  }
}

Transform.createOrReplace(entity, {})

let stage = 0
engine.addSystem(() => {
  console.log('PointerEventsResult', Array.from(PointerEventsResult.get(entity)))

  switch (stage++) {
    case 0: {
      assert(inputSystem.isPressed(InputAction.IA_POINTER) === true, 'First state is pressed')
      assert(
        inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity) === true,
        'Was triggered'
      )
      assert(
        !!inputSystem.getInputCommand(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity),
        'Has DOWN command'
      )
      break
    }
    case 1: {
      assert(inputSystem.isPressed(InputAction.IA_POINTER) === false, 'Second state is not pressed')
      assert(
        inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity) === false,
        'DOWN Was not triggered'
      )
      assert(
        inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_UP, entity) === true,
        'UP Was triggered'
      )
      assert(
        !inputSystem.getInputCommand(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity),
        "Doesn't have DOWN command"
      )
      break
    }
    case 2: {
      assert(inputSystem.isPressed(InputAction.IA_POINTER) === true, 'Third state is pressed')
      assert(
        inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity) === true,
        'Was triggered'
      )
      assert(
        !!inputSystem.getInputCommand(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity),
        'Has DOWN command'
      )
      break
    }
    default: {
      console.log('isPressed', inputSystem.isPressed(InputAction.IA_POINTER))
      console.log(
        'isTriggered(entity)=',
        inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)
      )
      console.log(
        'isTriggered(RootEntity)=',
        inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, engine.RootEntity)
      )
      console.log(
        'getCommand(RootEntity)=',
        inputSystem.getInputCommand(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)
      )
    }
  }
})
