import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/ecs/components/PointerEvents.gen'
import { ActionButton } from '../../../packages/@dcl/ecs/src/components/generated/pb/ecs/components/common/ActionButton.gen'
import { createInput } from '../../../packages/@dcl/ecs/src/engine/input'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Events helpers isPointerEventActive', () => {
  it('should detect no events', () => {
    const newEngine = Engine()
    const isPointerEventActive = createInput(newEngine).isInputActive
    expect(
      isPointerEventActive(
        ActionButton.ANY,
        PointerEventType.DOWN,
        newEngine.RootEntity
      )
    ).toBe(false)
  })

  it('detect pointerEvent', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const isPointerEventActive = createInput(newEngine).isInputActive

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [createTestPointerDownCommand(entity, 4, PointerEventType.DOWN)]
    })

    expect(
      isPointerEventActive(ActionButton.POINTER, PointerEventType.DOWN, entity)
    ).toBe(true)
    expect(
      isPointerEventActive(ActionButton.POINTER, PointerEventType.UP, entity)
    ).toBe(false)
    expect(
      isPointerEventActive(ActionButton.ACTION_3, PointerEventType.UP, entity)
    ).toBe(false)
  })

  it('dont detect pointerEventActive after update', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const isPointerEventActive = createInput(newEngine).isInputActive
    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [createTestPointerDownCommand(entity, 4, PointerEventType.DOWN)]
    })

    expect(
      isPointerEventActive(ActionButton.POINTER, PointerEventType.DOWN, entity)
    ).toBe(true)

    newEngine.update(0)
    expect(
      isPointerEventActive(ActionButton.POINTER, PointerEventType.DOWN, entity)
    ).toBe(false)
  })

  it('down state should persist after update', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const isActionDown = createInput(newEngine).isActionDown
    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [createTestPointerDownCommand(entity, 4, PointerEventType.DOWN)]
    })

    newEngine.update(0)
    expect(isActionDown(ActionButton.POINTER)).toBe(true)

    // See this keep the true value after the update
    newEngine.update(0)
    expect(isActionDown(ActionButton.POINTER)).toBe(true)
  })
})

function createTestPointerDownCommand(
  entity: Entity,
  timestamp: number,
  state: PointerEventType
) {
  return {
    button: ActionButton.POINTER,
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
