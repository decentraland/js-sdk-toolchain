import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'
import { createInput } from '../../../packages/@dcl/ecs/src/engine/input'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_events.gen'
import { InputAction } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/input_action.gen'

describe('Events helpers wasEntityClicked', () => {
  it('should detect no events', () => {
    const newEngine = Engine()
    const wasEntityClicked = createInput(newEngine).wasJustClicked
    expect(wasEntityClicked(InputAction.IA_ANY, newEngine.RootEntity)).toBe(
      false
    )
  })

  it('detect global click', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const wasEntityClicked = createInput(newEngine).wasJustClicked

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(
          newEngine.RootEntity,
          4,
          PointerEventType.PET_DOWN
        ),
        createTestPointerDownCommand(
          newEngine.RootEntity,
          5,
          PointerEventType.PET_UP
        )
      ]
    })

    expect(wasEntityClicked(InputAction.IA_POINTER, newEngine.RootEntity)).toBe(
      true
    )
    expect(
      wasEntityClicked(InputAction.IA_ACTION_3, newEngine.RootEntity)
    ).toBe(false)
  })

  it('detect entity click', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const wasEntityClicked = createInput(newEngine).wasJustClicked

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.PET_UP)
      ]
    })

    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(true)
    expect(wasEntityClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click after update', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const wasEntityClicked = createInput(newEngine).wasJustClicked

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.PET_UP)
      ]
    })

    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(true)
    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(true)
    newEngine.update(0)
    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(false)
  })

  it('dont detect entity click if pointer up is older', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const wasEntityClicked = createInput(newEngine).wasJustClicked

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 3, PointerEventType.PET_UP)
      ]
    })

    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(wasEntityClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click if pointer up doesnt exists', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const wasEntityClicked = createInput(newEngine).wasJustClicked

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(wasEntityClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click if pointer down doesnt exists', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_UP)
      ]
    })
    const wasEntityClicked = createInput(newEngine).wasJustClicked

    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(wasEntityClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('should detect click, then no click, then other click', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_UP),
        createTestPointerDownCommand(entity, 3, PointerEventType.PET_DOWN)
      ]
    })
    const wasEntityClicked = createInput(newEngine).wasJustClicked

    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(true)
    newEngine.update(0)
    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(false)

    PointerEventsResult.createOrReplace(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_UP),
        createTestPointerDownCommand(entity, 3, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 8, PointerEventType.PET_UP),
        createTestPointerDownCommand(entity, 5, PointerEventType.PET_DOWN)
      ]
    })

    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(true)
    newEngine.update(0)
    expect(wasEntityClicked(InputAction.IA_POINTER, entity)).toBe(false)
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
