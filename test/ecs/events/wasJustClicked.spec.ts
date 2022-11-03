import { Engine } from '../../../packages/@dcl/ecs/src/engine'
import { createInput } from '../../../packages/@dcl/ecs/src/engine/input'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { InputAction } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { createTestPointerDownCommand } from './utils'

describe('Events helpers isClicked', () => {
  it('should detect no events', () => {
    const newEngine = Engine()
    const { isClicked } = createInput(newEngine)
    expect(isClicked(InputAction.IA_ANY, newEngine.RootEntity)).toBe(false)
  })

  it('detect global click', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const { isClicked } = createInput(newEngine)

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

  it('detect entity click', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const { isClicked } = createInput(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.PET_UP)
      ]
    })

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click after update', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const { isClicked } = createInput(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.PET_UP)
      ]
    })

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    newEngine.update(0)
    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
  })

  it('dont detect entity click if pointer up is older', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const { isClicked } = createInput(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(entity, 3, PointerEventType.PET_UP)
      ]
    })

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
  })

  it('dont detect entity click if pointer up doesnt exists', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const { isClicked } = createInput(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.PET_DOWN)
      ]
    })

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
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
    const { isClicked } = createInput(newEngine)

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
    expect(isClicked(InputAction.IA_ACTION_3, entity)).toBe(false)
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
    const { isClicked } = createInput(newEngine)

    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(true)
    newEngine.update(0)
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
    newEngine.update(0)
    expect(isClicked(InputAction.IA_POINTER, entity)).toBe(false)
  })
})
