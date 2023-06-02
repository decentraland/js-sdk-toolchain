import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import { createInputSystem } from '../../../packages/@dcl/ecs/src/engine/input'
import {
  Engine,
  components,
  PointerEventType,
  InputAction,
  PBPointerEventsResult
} from '../../../packages/@dcl/ecs/src'

describe('Events helpers isTriggered', () => {
  it('should detect no events', () => {
    const newEngine = Engine()
    const { isTriggered } = createInputSystem(newEngine)
    expect(isTriggered(InputAction.IA_ANY, PointerEventType.PET_DOWN, newEngine.RootEntity)).toBe(false)
  })

  it('no rootEntity', async () => {
    // TODO: what does this test actually tests?
    const engine = Engine()
    components.PointerEventsResult(engine)
    engine.addEntity()
    createInputSystem(engine)

    await engine.update(1)
  })

  it('detect pointerEvent', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isTriggered } = createInputSystem(newEngine)
    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))

    // we must run the systems to update the internal inputSystem state
    await newEngine.update(1)

    // then assert
    expect(isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)).toBe(true)
    expect(isTriggered(InputAction.IA_POINTER, PointerEventType.PET_UP, entity)).toBe(false)
    expect(isTriggered(InputAction.IA_ACTION_3, PointerEventType.PET_UP, entity)).toBe(false)
  })

  it('dont detect pointerEventActive after update', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isTriggered } = createInputSystem(newEngine)
    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))

    // we must run the systems to update the internal inputSystem state
    await newEngine.update(1)
    expect(isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)).toBe(true)

    // in the next tick we will no-longer see the entity bing triggered==true
    await newEngine.update(0)
    expect(isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)).toBe(false)
  })

  it('down state should persist after update', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isPressed } = createInputSystem(newEngine)
    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))

    await newEngine.update(0)
    expect(isPressed(InputAction.IA_POINTER)).toBe(true)

    // See this keep the true value after the update
    await newEngine.update(0)
    expect(isPressed(InputAction.IA_POINTER)).toBe(true)
  })
})

describe('Global Events helpers isTriggered, getInputCommand', () => {
  it('should detect no events', () => {
    const newEngine = Engine()
    const { isTriggered } = createInputSystem(newEngine)
    expect(isTriggered(InputAction.IA_ANY, PointerEventType.PET_DOWN)).toBe(false)
  })

  it('detect pointerEvent', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isTriggered, getInputCommand } = createInputSystem(newEngine)
    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))

    // we must run the systems to update the internal inputSystem state
    await newEngine.update(1)

    // then assert
    expect(isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN)).toBe(true)
    expect(getInputCommand(InputAction.IA_POINTER, PointerEventType.PET_DOWN)).not.toBeNull()

    expect(isTriggered(InputAction.IA_POINTER, PointerEventType.PET_UP)).toBe(false)

    expect(isTriggered(InputAction.IA_ACTION_3, PointerEventType.PET_UP)).toBe(false)
    expect(getInputCommand(InputAction.IA_ACTION_3, PointerEventType.PET_DOWN)).toBeNull()
  })

  it('detect any pointerEvent', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isTriggered, getInputCommand } = createInputSystem(newEngine)
    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))

    // we must run the systems to update the internal inputSystem state
    await newEngine.update(1)

    // then assert
    expect(isTriggered(InputAction.IA_ANY, PointerEventType.PET_DOWN)).toBe(true)
    expect(getInputCommand(InputAction.IA_ANY, PointerEventType.PET_DOWN)).not.toBeNull()
  })

  it('dont detect pointerEventActive after update', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isTriggered } = createInputSystem(newEngine)
    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))

    // we must run the systems to update the internal inputSystem state
    await newEngine.update(1)
    expect(isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN)).toBe(true)

    // in the next tick we will no-longer see the entity bing triggered==true
    await newEngine.update(0)
    expect(isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN)).toBe(false)
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
