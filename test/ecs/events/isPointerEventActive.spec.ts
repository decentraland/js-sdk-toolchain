import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import { createInput } from '../../../packages/@dcl/ecs/src/engine/input'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { InputAction } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Events helpers isPointerEventActive', () => {
  it('should detect no events', () => {
    const newEngine = Engine()
    const isPointerEventActive = createInput(newEngine).isActive
    expect(
      isPointerEventActive(
        InputAction.IA_ANY,
        PointerEventType.PET_DOWN,
        newEngine.RootEntity
      )
    ).toBe(false)
  })

  it('detect pointerEvent', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const isPointerEventActive = createInput(newEngine).isActive

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    expect(
      isPointerEventActive(
        InputAction.IA_POINTER,
        PointerEventType.PET_DOWN,
        entity
      )
    ).toBe(true)
    expect(
      isPointerEventActive(
        InputAction.IA_POINTER,
        PointerEventType.PET_UP,
        entity
      )
    ).toBe(false)
    expect(
      isPointerEventActive(
        InputAction.IA_ACTION_3,
        PointerEventType.PET_UP,
        entity
      )
    ).toBe(false)
  })

  it('dont detect pointerEventActive after update', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const isPointerEventActive = createInput(newEngine).isActive
    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    expect(
      isPointerEventActive(
        InputAction.IA_POINTER,
        PointerEventType.PET_DOWN,
        entity
      )
    ).toBe(true)

    newEngine.update(0)
    expect(
      isPointerEventActive(
        InputAction.IA_POINTER,
        PointerEventType.PET_DOWN,
        entity
      )
    ).toBe(false)
  })

  it('down state should persist after update', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const isActionDown = createInput(newEngine).isActionDown
    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    newEngine.update(0)
    expect(isActionDown(InputAction.IA_POINTER)).toBe(true)

    // See this keep the true value after the update
    newEngine.update(0)
    expect(isActionDown(InputAction.IA_POINTER)).toBe(true)
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
