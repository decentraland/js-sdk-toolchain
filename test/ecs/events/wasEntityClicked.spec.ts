import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import { wasEntityClickedGenerator } from '../../../packages/@dcl/ecs/src/engine/events'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/ecs/components/PointerEvents.gen'
import { ActionButton } from '../../../packages/@dcl/ecs/src/components/generated/pb/ecs/components/common/ActionButton.gen'

describe('Events helpers wasEntityClicked', () => {
  it('should detect no events', () => {
    const newEngine = Engine()
    const wasEntityClicked = wasEntityClickedGenerator(newEngine)
    expect(wasEntityClicked(newEngine.RootEntity, ActionButton.ANY)).toBe(false)
  })

  it('detect global click', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const wasEntityClicked = wasEntityClickedGenerator(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(
          newEngine.RootEntity,
          4,
          PointerEventType.DOWN
        ),
        createTestPointerDownCommand(
          newEngine.RootEntity,
          5,
          PointerEventType.UP
        )
      ]
    })

    expect(wasEntityClicked(newEngine.RootEntity, ActionButton.POINTER)).toBe(
      true
    )
    expect(wasEntityClicked(newEngine.RootEntity, ActionButton.ACTION_3)).toBe(
      false
    )
  })

  it('detect entity click', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const wasEntityClicked = wasEntityClickedGenerator(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.UP)
      ]
    })

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(true)
    expect(wasEntityClicked(entity, ActionButton.ACTION_3)).toBe(false)
  })

  it('dont detect entity click after update', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const wasEntityClicked = wasEntityClickedGenerator(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.UP)
      ]
    })

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(true)
    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(true)
    newEngine.update(0)
    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(false)
  })

  it('dont detect entity click if pointer up is older', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const wasEntityClicked = wasEntityClickedGenerator(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.DOWN),
        createTestPointerDownCommand(entity, 3, PointerEventType.UP)
      ]
    })

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(false)
    expect(wasEntityClicked(entity, ActionButton.ACTION_3)).toBe(false)
  })

  it('dont detect entity click if pointer up doesnt exists', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const wasEntityClicked = wasEntityClickedGenerator(newEngine)

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [createTestPointerDownCommand(entity, 4, PointerEventType.DOWN)]
    })

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(false)
    expect(wasEntityClicked(entity, ActionButton.ACTION_3)).toBe(false)
  })

  it('dont detect entity click if pointer down doesnt exists', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [createTestPointerDownCommand(entity, 4, PointerEventType.UP)]
    })
    const wasEntityClicked = wasEntityClickedGenerator(newEngine)

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(false)
    expect(wasEntityClicked(entity, ActionButton.ACTION_3)).toBe(false)
  })

  it('should detect click, then no click, then other click', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    PointerEventsResult.create(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.UP),
        createTestPointerDownCommand(entity, 3, PointerEventType.DOWN)
      ]
    })
    const wasEntityClicked = wasEntityClickedGenerator(newEngine)

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(true)
    newEngine.update(0)
    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(false)

    PointerEventsResult.createOrReplace(newEngine.RootEntity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.UP),
        createTestPointerDownCommand(entity, 3, PointerEventType.DOWN),
        createTestPointerDownCommand(entity, 8, PointerEventType.UP),
        createTestPointerDownCommand(entity, 5, PointerEventType.DOWN)
      ]
    })

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(true)
    newEngine.update(0)
    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(false)
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
