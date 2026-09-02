import * as components from '../../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import { createInputSystem, IInputSystem } from '../../../packages/@dcl/ecs/src/engine/input'
import { InputAction, PointerEventType } from '../../../packages/@dcl/ecs/src'
import { createTestPointerDownCommand } from './utils'

describe('when two entities report input in the same frame and the later one is older', () => {
  let engine: ReturnType<typeof Engine>
  let input: IInputSystem
  let clickedEntity: Entity
  let otherEntity: Entity

  beforeEach(async () => {
    engine = Engine()
    input = createInputSystem(engine)
    const PointerEventsResult = components.PointerEventsResult(engine)

    clickedEntity = engine.addEntity()
    otherEntity = engine.addEntity()

    // The pointer is released on one entity, and on another the player also
    // pressed a key and clicked, both earlier in the same frame. Timestamps
    // are a single counter shared by every entity.
    PointerEventsResult.addValue(
      clickedEntity,
      createTestPointerDownCommand(clickedEntity, 3, PointerEventType.PET_UP, InputAction.IA_POINTER)
    )
    PointerEventsResult.addValue(
      otherEntity,
      createTestPointerDownCommand(otherEntity, 1, PointerEventType.PET_DOWN, InputAction.IA_PRIMARY)
    )
    PointerEventsResult.addValue(
      otherEntity,
      createTestPointerDownCommand(otherEntity, 2, PointerEventType.PET_DOWN, InputAction.IA_POINTER)
    )

    await engine.update(1)
  })

  it('should hold the key reported by the second entity as pressed', () => {
    expect(input.isPressed(InputAction.IA_PRIMARY)).toBe(true)
  })

  it('should report that key as triggered globally', () => {
    expect(input.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)).toBe(true)
  })

  it('should still report the key as triggered on its own entity', () => {
    expect(input.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN, otherEntity)).toBe(true)
  })

  it('should keep the newest state for the button both entities reported', () => {
    expect(input.isPressed(InputAction.IA_POINTER)).toBe(false)
  })
})

describe('when a frame brings no new commands', () => {
  let engine: ReturnType<typeof Engine>
  let input: IInputSystem
  let entity: Entity

  beforeEach(async () => {
    engine = Engine()
    input = createInputSystem(engine)
    const PointerEventsResult = components.PointerEventsResult(engine)

    entity = engine.addEntity()
    PointerEventsResult.addValue(
      entity,
      createTestPointerDownCommand(entity, 1, PointerEventType.PET_DOWN, InputAction.IA_PRIMARY)
    )
    await engine.update(1)
    await engine.update(1)
  })

  it('should keep the button pressed', () => {
    expect(input.isPressed(InputAction.IA_PRIMARY)).toBe(true)
  })

  it('should stop reporting it as triggered this frame', () => {
    expect(input.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)).toBe(false)
  })
})
