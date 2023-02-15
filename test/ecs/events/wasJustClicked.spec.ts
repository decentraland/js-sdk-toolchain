import { Engine, components, PointerEventType, InputAction } from '../../../packages/@dcl/ecs/src'
import { createInputSystem } from '../../../packages/@dcl/ecs/src/engine/input'
import { createTestPointerDownCommand } from './utils'

describe('Events helpers isClicked', () => {
  it('should detect no events', async () => {
    const newEngine = Engine()
    const { isClicked } = createInputSystem(newEngine)
    expect(isClicked(InputAction.IA_ANY, newEngine.RootEntity)).toBe(false)
  })

  it('detect global click', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const { isClicked } = createInputSystem(newEngine)

    PointerEventsResult.addValue(
      newEngine.RootEntity,
      createTestPointerDownCommand(newEngine.RootEntity, 4, PointerEventType.PET_DOWN)
    )

    PointerEventsResult.addValue(
      newEngine.RootEntity,
      createTestPointerDownCommand(newEngine.RootEntity, 5, PointerEventType.PET_UP)
    )

    await newEngine.update(0)

    expect(isClicked(InputAction.IA_POINTER, newEngine.RootEntity)).toBe(true)
    expect(isClicked(InputAction.IA_ACTION_3, newEngine.RootEntity)).toBe(false)
  })

  it('detect entity click', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isClicked } = createInputSystem(newEngine)

    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))
    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 5, PointerEventType.PET_UP))

    await newEngine.update(0)

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click after update', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isClicked } = createInputSystem(newEngine)

    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))
    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 5, PointerEventType.PET_UP))

    await newEngine.update(0)

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)

    await newEngine.update(0)

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
  })

  it('dont detect entity click if pointer up is older', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isClicked } = createInputSystem(newEngine)

    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))
    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 3, PointerEventType.PET_UP))

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click if pointer up doesnt exists', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isClicked } = createInputSystem(newEngine)

    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN))

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click if pointer down doesnt exists', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()

    PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_UP))
    const { isClicked } = createInputSystem(newEngine)

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('should detect click, then no click, then other click', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()

    const { isClicked } = createInputSystem(newEngine)

    {
      // renderer
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_UP))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 3, PointerEventType.PET_DOWN))
      // tick
      await newEngine.update(0)
      // client
      expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    }

    {
      // renderer
      //   (noop)
      // tick
      await newEngine.update(0)
      // client
      expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    }

    {
      // renderer
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 4, PointerEventType.PET_UP))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 3, PointerEventType.PET_DOWN))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 8, PointerEventType.PET_UP))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 5, PointerEventType.PET_DOWN))
      // tick
      await newEngine.update(0)
      // client
      expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    }

    {
      // renderer
      //   (noop)
      // tick
      await newEngine.update(0)
      // client
      expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    }
  })
})
