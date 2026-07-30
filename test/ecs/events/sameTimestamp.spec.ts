import {
  Engine,
  IEngine,
  components,
  PointerEventType,
  InputAction
} from '../../../packages/@dcl/ecs/src'
import { createInputSystem, IInputSystem } from '../../../packages/@dcl/ecs/src/engine/input'
import { createTestPointerDownCommand } from './utils'

describe('Same-timestamp input system behavior', () => {
  let engine: IEngine
  let inputSystem: IInputSystem
  let PointerEventsResult: ReturnType<typeof components.PointerEventsResult>

  beforeEach(() => {
    engine = Engine()
    PointerEventsResult = components.PointerEventsResult(engine)
    inputSystem = createInputSystem(engine)
  })

  describe('isTriggered with multiple same-timestamp events for different buttons', () => {
    it('should detect all triggered events when multiple buttons fire in the same tick', async () => {
      const entity = engine.addEntity()

      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_DOWN, InputAction.IA_POINTER))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_DOWN, InputAction.IA_PRIMARY))

      await engine.update(1)

      expect(inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)).toBe(true)
      expect(inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN, entity)).toBe(true)
    })
  })

  describe('isPressed with multiple same-timestamp events for different buttons', () => {
    it('should track pressed state for all buttons when fired with the same timestamp', async () => {
      const entity = engine.addEntity()

      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_DOWN, InputAction.IA_POINTER))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_DOWN, InputAction.IA_PRIMARY))

      await engine.update(1)

      expect(inputSystem.isPressed(InputAction.IA_POINTER)).toBe(true)
      expect(inputSystem.isPressed(InputAction.IA_PRIMARY)).toBe(true)
    })
  })

  describe('findClick with same-timestamp DOWN and UP', () => {
    it('should detect a click when DOWN and UP have the same timestamp', async () => {
      const entity = engine.addEntity()

      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_DOWN, InputAction.IA_POINTER))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_UP, InputAction.IA_POINTER))

      await engine.update(1)

      expect(inputSystem.isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    })

    it('should return click info when DOWN and UP share the same timestamp', async () => {
      const entity = engine.addEntity()

      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_DOWN, InputAction.IA_POINTER))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_UP, InputAction.IA_POINTER))

      await engine.update(1)

      const click = inputSystem.getClick(InputAction.IA_POINTER, entity)
      expect(click).not.toBeNull()
      expect(click!.down.state).toBe(PointerEventType.PET_DOWN)
      expect(click!.up.state).toBe(PointerEventType.PET_UP)
    })
  })

  describe('buttonState tracking with same-timestamp events across multiple buttons', () => {
    it('should not lose button state updates due to early loop termination', async () => {
      const entity = engine.addEntity()

      // Tick 1: press IA_POINTER
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_DOWN, InputAction.IA_POINTER))
      await engine.update(1)
      expect(inputSystem.isPressed(InputAction.IA_POINTER)).toBe(true)

      // Tick 2: release IA_POINTER AND press IA_PRIMARY — both with same timestamp
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 2, PointerEventType.PET_UP, InputAction.IA_POINTER))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 2, PointerEventType.PET_DOWN, InputAction.IA_PRIMARY))
      await engine.update(1)

      expect(inputSystem.isPressed(InputAction.IA_POINTER)).toBe(false)
      expect(inputSystem.isPressed(InputAction.IA_PRIMARY)).toBe(true)
    })
  })
})
