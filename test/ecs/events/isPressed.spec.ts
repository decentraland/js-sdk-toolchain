import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import { createInputSystem } from '../../../packages/@dcl/ecs/src/engine/input'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { InputAction } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('Events helpers isTriggered', () => {
  it('should detect no events', () => {
    const newEngine = Engine()
    const { isTriggered } = createInputSystem(newEngine)
    expect(
      isTriggered(
        InputAction.IA_ANY,
        PointerEventType.PET_DOWN,
        newEngine.RootEntity
      )
    ).toBe(false)
  })

  it('no rootEntity', async () => {
    const engine = Engine()
    components.PointerEventsResult(engine)
    engine.addEntity()
    createInputSystem(engine)

    await engine.update(1)
    expect(1).toBe(1)
  })

  it('detect pointerEvent', () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isTriggered } = createInputSystem(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    expect(
      isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)
    ).toBe(true)
    expect(
      isTriggered(InputAction.IA_POINTER, PointerEventType.PET_UP, entity)
    ).toBe(false)
    expect(
      isTriggered(InputAction.IA_ACTION_3, PointerEventType.PET_UP, entity)
    ).toBe(false)
  })

  it('dont detect pointerEventActive after update', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isTriggered } = createInputSystem(newEngine)
    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    expect(
      isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)
    ).toBe(true)

    await newEngine.update(0)
    expect(
      isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)
    ).toBe(false)
  })

  it('down state should persist after update', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isPressed } = createInputSystem(newEngine)
    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    await newEngine.update(0)
    expect(isPressed(InputAction.IA_POINTER)).toBe(true)

    // See this keep the true value after the update
    await newEngine.update(0)
    expect(isPressed(InputAction.IA_POINTER)).toBe(true)
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
