import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { createInputSystem } from '../../../packages/@dcl/ecs/src/engine/input'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { InputAction } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/input_action.gen'
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

    expect(isClicked(InputAction.IA_POINTER, newEngine.RootEntity)).toBe(true)
    expect(isClicked(InputAction.IA_ACTION_3, newEngine.RootEntity)).toBe(false)
  })

  it('detect entity click', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isClicked } = createInputSystem(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.PET_UP)
      ]
    })

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click after update', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isClicked } = createInputSystem(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.PET_UP)
      ]
    })

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

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 3, PointerEventType.PET_UP)
      ]
    })

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click if pointer up doesnt exists', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    const { isClicked } = createInputSystem(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click if pointer down doesnt exists', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_UP)
      ]
    })
    const { isClicked } = createInputSystem(newEngine)

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('should detect click, then no click, then other click', async () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_UP),
        createTestPointerDownCommand(entity, 3, PointerEventType.PET_DOWN)
      ]
    })
    const { isClicked } = createInputSystem(newEngine)

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    await newEngine.update(0)
    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)

    PointerEventsResult.createOrReplace(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_UP),
        createTestPointerDownCommand(entity, 3, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 8, PointerEventType.PET_UP),
        createTestPointerDownCommand(entity, 5, PointerEventType.PET_DOWN)
      ]
    })

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    await newEngine.update(0)
    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
  })
})
