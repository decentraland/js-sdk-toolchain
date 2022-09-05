import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import { wasEntityClicked } from '../../../packages/@dcl/ecs/src/engine/events'
import { Engine } from '../../../packages/@dcl/ecs/src'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/PointerEvents.gen'
import { ActionButton } from '../../../packages/@dcl/ecs/src/components/generated/pb/common/ActionButton.gen'

describe('Events helpers wasEntityClicked', () => {
  it('detect entity click', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    PointerEventsResult.create(0 as Entity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.UP)
      ]
    })

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(true)
    expect(wasEntityClicked(entity, ActionButton.ACTION_3)).toBe(false)
  })

  it('dont detect entity click twice', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    PointerEventsResult.create(0 as Entity, {
      commands: [
        createTestPointerDownCommand(entity, 4, PointerEventType.DOWN),
        createTestPointerDownCommand(entity, 5, PointerEventType.UP)
      ]
    })

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(true)
    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(false)
  })

  it('dont detect entity click if pointer up is older', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    PointerEventsResult.create(0 as Entity, {
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

    PointerEventsResult.create(0 as Entity, {
      commands: [createTestPointerDownCommand(entity, 4, PointerEventType.DOWN)]
    })

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(false)
    expect(wasEntityClicked(entity, ActionButton.ACTION_3)).toBe(false)
  })

  it('dont detect entity click if pointer down doesnt exists', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    PointerEventsResult.create(0 as Entity, {
      commands: [createTestPointerDownCommand(entity, 4, PointerEventType.UP)]
    })

    expect(wasEntityClicked(entity, ActionButton.POINTER)).toBe(false)
    expect(wasEntityClicked(entity, ActionButton.ACTION_3)).toBe(false)
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
