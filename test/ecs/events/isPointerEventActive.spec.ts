import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_events.gen'
import { InputAction } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { isPointerEventActiveGenerator } from '../../../packages/@dcl/ecs/src/engine/events'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Events helpers isPointerEventActive', () => {
  it('should detect no events', () => {
    const newEngine = Engine()
    const isPointerEventActive = isPointerEventActiveGenerator(newEngine)
    expect(
      isPointerEventActive(
        newEngine.RootEntity,
        InputAction.IA_ANY,
        PointerEventType.PET_DOWN
      )
    ).toBe(false)
  })

  it('detect pointerEvent', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const isPointerEventActive = isPointerEventActiveGenerator(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    expect(
      isPointerEventActive(
        entity,
        InputAction.IA_POINTER,
        PointerEventType.PET_DOWN
      )
    ).toBe(true)
    expect(
      isPointerEventActive(
        entity,
        InputAction.IA_POINTER,
        PointerEventType.PET_UP
      )
    ).toBe(false)
    expect(
      isPointerEventActive(
        entity,
        InputAction.IA_ACTION_3,
        PointerEventType.PET_UP
      )
    ).toBe(false)
  })

  it('dont detect pointerEventActive after update', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const isPointerEventActive = isPointerEventActiveGenerator(newEngine)
    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    expect(
      isPointerEventActive(
        entity,
        InputAction.IA_POINTER,
        PointerEventType.PET_DOWN
      )
    ).toBe(true)

    newEngine.update(0)
    expect(
      isPointerEventActive(
        entity,
        InputAction.IA_POINTER,
        PointerEventType.PET_DOWN
      )
    ).toBe(false)
  })
})

function createTestPointerDownCommand(
  entity: Entity,
  timestamp: number,
  state: PointerEventType
) {
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
      entityId: entity
    },
    state: state,
    analog: 5
  }
}
