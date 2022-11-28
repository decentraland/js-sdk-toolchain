import {
  Engine,
  Entity,
  IEngine,
  components
} from '../../../packages/@dcl/ecs/src'
import { createInputSystem } from '../../../packages/@dcl/ecs/src/engine/input'
import { InputAction } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import {
  createPointerEventSystem,
  PointerEventsSystem
} from '../../../packages/@dcl/ecs/src/systems/events'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { createTestPointerDownCommand } from './utils'

let engine: IEngine
let fakePointer: (
  entity: Entity,
  pointerType: PointerEventType,
  button?: InputAction
) => void

describe('Events System', () => {
  let EventsSystem: PointerEventsSystem
  beforeEach(() => {
    engine = Engine()
    const Input = createInputSystem(engine)
    EventsSystem = createPointerEventSystem(engine, Input)

    const PointerEventsResult = components.PointerEventsResult(engine)
    let fakeCounter = 0

    fakePointer = (entity, pointerType, button) => {
      const pointerEvents =
        PointerEventsResult.getMutableOrNull(engine.RootEntity) ||
        PointerEventsResult.create(engine.RootEntity)

      pointerEvents.commands.push(
        createTestPointerDownCommand(
          entity as number,
          fakeCounter + 1,
          pointerType,
          button
        ) as any
      )
      fakeCounter += 1
    }
  })

  it('should run default onClick', () => {
    const entity = engine.addEntity()
    const PointerHoverFeedback = components.PointerHoverFeedback(engine)
    let counter = 0
    EventsSystem.onClick(
      entity,
      () => {
        counter += 1
      },
      { button: InputAction.IA_ANY }
    )
    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_ACTION_3)
    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_ACTION_3)
    engine.update(1)
    expect(counter).toBe(1)
    expect(
      PointerHoverFeedback.getOrNull(entity)?.pointerEvents[0].eventInfo
        ?.hoverText
    ).toBe('Interact')
  })

  it('should create pointer hover components', () => {
    const entity = engine.addEntity()
    const PointerHoverFeedback = components.PointerHoverFeedback(engine)
    EventsSystem.onClick(entity, () => {}, { hoverText: 'Boedo' })
    fakePointer(entity, PointerEventType.PET_DOWN)
    fakePointer(entity, PointerEventType.PET_UP)
    engine.update(1)
    const feedback = PointerHoverFeedback.getOrNull(entity)
    const boedoFeedback = feedback?.pointerEvents.find(
      (f) => f.eventInfo?.hoverText === 'Boedo'
    )
    expect(boedoFeedback?.eventType).toBe(PointerEventType.PET_DOWN)
  })

  it('should delete pointer hover components and callback', () => {
    const entity = engine.addEntity()
    const PointerHoverFeedback = components.PointerHoverFeedback(engine)
    let counter = 0
    EventsSystem.onClick(
      entity,
      () => {
        counter += 1
        EventsSystem.removeOnClick(entity)
      },
      { hoverText: 'Boedo', button: InputAction.IA_JUMP }
    )
    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_JUMP)
    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_JUMP)

    const feedback = PointerHoverFeedback.getOrNull(entity)
    const boedoFeedback = feedback?.pointerEvents.find(
      (f) => f.eventInfo?.hoverText === 'Boedo'
    )
    expect(boedoFeedback?.eventType).toBe(PointerEventType.PET_DOWN)
    expect(counter).toBe(0)

    // Update tick, and verify that the counter increments and the Hover was removed
    engine.update(1)
    expect(counter).toBe(1)
    const removedFeedback =
      PointerHoverFeedback.getOrNull(entity)?.pointerEvents
    expect(removedFeedback?.length).toBe(0)

    // Update tick and verify we didnt increment the counter again
    engine.update(1)
    expect(counter).toBe(1)
  })

  it('should run default onDown', () => {
    const entity = engine.addEntity()
    const PointerHoverFeedback = components.PointerHoverFeedback(engine)
    let counter = 0
    EventsSystem.onPointerDown(
      entity,
      () => {
        counter += 1
      },
      { hoverText: '' }
    )
    fakePointer(entity, PointerEventType.PET_DOWN)
    engine.update(1)
    expect(counter).toBe(1)
    expect(PointerHoverFeedback.getOrNull(entity)).toBe(null)
  })

  it('should remove pointer down', () => {
    const entity = engine.addEntity()
    const PointerHoverFeedback = components.PointerHoverFeedback(engine)
    let counter = 0
    EventsSystem.onPointerDown(
      entity,
      () => {
        counter += 1
        EventsSystem.removeOnPointerDown(entity)
      },
      { hoverText: 'Boedo' }
    )
    fakePointer(entity, PointerEventType.PET_DOWN)
    engine.update(1)
    expect(counter).toBe(1)

    engine.update(1)
    expect(counter).toBe(1)
    const feedback = PointerHoverFeedback.getOrNull(entity)?.pointerEvents
    expect(feedback?.length).toBe(0)
  })

  it('should run default onUp', () => {
    const entity = engine.addEntity()
    let counter = 0
    EventsSystem.onPointerUp(entity, () => {
      counter += 1
    })
    fakePointer(entity, PointerEventType.PET_UP)
    engine.update(1)
    expect(counter).toBe(1)
  })

  it('should remove pointer up', () => {
    const entity = engine.addEntity()
    const PointerHoverFeedback = components.PointerHoverFeedback(engine)
    let counter = 0
    EventsSystem.onPointerUp(
      entity,
      () => {
        counter += 1
        EventsSystem.removeOnPointerUp(entity)
      },
      { hoverText: 'Boedo' }
    )
    fakePointer(entity, PointerEventType.PET_UP)
    engine.update(1)
    expect(counter).toBe(1)

    engine.update(1)
    expect(counter).toBe(1)
    const feedback = PointerHoverFeedback.getOrNull(entity)?.pointerEvents
    expect(feedback?.length).toBe(0)
  })

  it('should run down but not click if there was no UP event', () => {
    const entity = engine.addEntity()
    let downCounter = 0
    let clickCounter = 0
    let upCounter = 0

    EventsSystem.onPointerDown(entity, () => {
      downCounter += 1
    })
    EventsSystem.onClick(entity, () => {
      clickCounter += 1
    })
    EventsSystem.onPointerUp(
      entity,
      () => {
        upCounter += 1
      },
      { button: InputAction.IA_POINTER }
    )

    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_PRIMARY)
    engine.update(1)
    expect(downCounter).toBe(1)
    expect(upCounter).toBe(0)
    expect(clickCounter).toBe(0)

    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_POINTER)
    engine.update(1)
    expect(downCounter).toBe(1)
    expect(upCounter).toBe(1)
    expect(clickCounter).toBe(0)

    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_ACTION_3)
    engine.update(1)
    expect(downCounter).toBe(2)
    expect(upCounter).toBe(1)
    expect(clickCounter).toBe(0)

    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_ACTION_3)
    engine.update(1)
    expect(downCounter).toBe(2)
    expect(upCounter).toBe(1)
    expect(clickCounter).toBe(1)

    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_POINTER)
    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_POINTER)
    engine.update(1)
    expect(downCounter).toBe(3)
    expect(upCounter).toBe(2)
    expect(clickCounter).toBe(2)
  })

  it('should delete events callbacks if the entity was removed', () => {
    const entity = engine.addEntity()
    let counter = 0
    EventsSystem.onClick(
      entity,
      () => {
        counter += 1
      },
      { button: InputAction.IA_ANY }
    )
    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_ACTION_3)
    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_ACTION_3)
    engine.update(1)
    expect(counter).toBe(1)
    engine.removeEntity(entity)
    engine.update(1)
    expect(counter).toBe(1)
  })

  it('should throw error with a callback thenable', () => {
    const entity = engine.addEntity()
    let counter = 0
    EventsSystem.onPointerUp(entity, async function () {
      counter += 1
      return new Promise((resolve) => setTimeout(resolve, 0))
    })
    fakePointer(entity, PointerEventType.PET_UP)

    const previousDebugMode = (globalThis as any).DEBUG
    ;(globalThis as any).DEBUG = true
    expect(() => {
      engine.update(1)
    }).toThrowError()

    if (previousDebugMode) {
      ;(globalThis as any).DEBUG = previousDebugMode
    } else {
      delete (globalThis as any).DEBUG
    }

    expect(counter).toBe(1)
  })

  it(`should ignore removing hover feedback`, () => {
    const entity = engine.addEntity()
    EventsSystem.onPointerUp(entity, function () {}, {
      hoverText: 'test',
      button: InputAction.IA_ACTION_3
    })

    const PointerHoverFeedback = components.PointerHoverFeedback(engine)
    PointerHoverFeedback.deleteFrom(entity)

    EventsSystem.removeOnPointerUp(entity)
  })
})
