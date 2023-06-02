import { Engine, Entity, IEngine, components, PointerEventType, InputAction } from '../../../packages/@dcl/ecs/src'
import { createInputSystem } from '../../../packages/@dcl/ecs/src/engine/input'
import { createPointerEventsSystem, PointerEventsSystem } from '../../../packages/@dcl/ecs/src/systems/events'
import { createTestPointerDownCommand } from './utils'

let engine: IEngine
let fakePointer: (entity: Entity, pointerType: PointerEventType, button?: InputAction) => void

describe('Events System', () => {
  let EventsSystem: PointerEventsSystem
  beforeEach(() => {
    engine = Engine()
    const Input = createInputSystem(engine)
    EventsSystem = createPointerEventsSystem(engine, Input)

    const PointerEventsResult = components.PointerEventsResult(engine)
    let fakeCounter = 0

    fakePointer = (entity, pointerType, button) => {
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, fakeCounter + 1, pointerType, button))
      fakeCounter += 1
    }
  })

  it('should run default onClick', async () => {
    const entity = engine.addEntity()
    const PointerEvents = components.PointerEvents(engine)
    let counter = 0
    EventsSystem.onClick({ entity, opts: { button: InputAction.IA_ANY } }, () => {
      counter += 1
    })
    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_ACTION_3)
    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_ACTION_3)
    await engine.update(1)
    expect(counter).toBe(1)
    expect(PointerEvents.getOrNull(entity)?.pointerEvents[0].eventInfo?.hoverText).toBe(undefined)
  })

  it('should create pointer hover components', async () => {
    const entity = engine.addEntity()
    const PointerEvents = components.PointerEvents(engine)
    EventsSystem.onClick({ entity, opts: { hoverText: 'Boedo' } }, () => {})
    fakePointer(entity, PointerEventType.PET_DOWN)
    fakePointer(entity, PointerEventType.PET_UP)
    await engine.update(1)
    const feedback = PointerEvents.getOrNull(entity)
    const boedoFeedback = feedback?.pointerEvents.find((f) => f.eventInfo?.hoverText === 'Boedo')
    expect(boedoFeedback?.eventType).toBe(PointerEventType.PET_DOWN)
  })

  it('should delete pointer hover components and callback', async () => {
    const entity = engine.addEntity()
    const PointerEvents = components.PointerEvents(engine)
    let counter = 0
    EventsSystem.onClick({ entity, opts: { hoverText: 'Boedo', button: InputAction.IA_JUMP } }, () => {
      counter += 1
      EventsSystem.removeOnClick(entity)
    })
    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_JUMP)
    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_JUMP)

    const feedback = PointerEvents.getOrNull(entity)
    const boedoFeedback = feedback?.pointerEvents.find((f) => f.eventInfo?.hoverText === 'Boedo')
    expect(boedoFeedback?.eventType).toBe(PointerEventType.PET_DOWN)
    expect(counter).toBe(0)

    // Update tick, and verify that the counter increments and the Hover was removed
    await engine.update(1)
    expect(counter).toBe(1)
    const removedFeedback = PointerEvents.getOrNull(entity)?.pointerEvents
    expect(removedFeedback?.length).toBe(0)

    // Update tick and verify we didnt increment the counter again
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('should run default onDown', async () => {
    const entity = engine.addEntity()
    const PointerEvents = components.PointerEvents(engine)
    let counter = 0
    EventsSystem.onPointerDown(
      entity,
      () => {
        counter += 1
      },
      { hoverText: '' }
    )
    fakePointer(entity, PointerEventType.PET_DOWN)
    await engine.update(1)
    expect(counter).toBe(1)
    expect(PointerEvents.getOrNull(entity)).toBe(null)
  })

  it('should remove pointer down', async () => {
    const entity = engine.addEntity()
    const PointerEvents = components.PointerEvents(engine)
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
    await engine.update(1)
    expect(counter).toBe(1)

    await engine.update(1)
    expect(counter).toBe(1)
    const feedback = PointerEvents.getOrNull(entity)?.pointerEvents
    expect(feedback?.length).toBe(0)
  })

  it('should run default onUp', async () => {
    const entity = engine.addEntity()
    let counter = 0
    EventsSystem.onPointerUp(entity, () => {
      counter += 1
    })
    fakePointer(entity, PointerEventType.PET_UP)
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('should remove pointer up', async () => {
    const entity = engine.addEntity()
    const PointerEvents = components.PointerEvents(engine)
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
    await engine.update(1)
    expect(counter).toBe(1)

    await engine.update(1)
    expect(counter).toBe(1)
    const feedback = PointerEvents.getOrNull(entity)?.pointerEvents
    expect(feedback?.length).toBe(0)
  })

  it('should run down but not click if there was no UP event', async () => {
    const entity = engine.addEntity()
    let downCounter = 0
    let clickCounter = 0
    let upCounter = 0

    EventsSystem.onPointerDown(entity, () => {
      downCounter += 1
    })
    EventsSystem.onClick({ entity }, () => {
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
    await engine.update(1)
    expect(downCounter).toBe(1)
    expect(upCounter).toBe(0)
    expect(clickCounter).toBe(0)

    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_POINTER)
    await engine.update(1)
    expect(downCounter).toBe(1)
    expect(upCounter).toBe(1)
    expect(clickCounter).toBe(0)

    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_ACTION_3)
    await engine.update(1)
    expect(downCounter).toBe(2)
    expect(upCounter).toBe(1)
    expect(clickCounter).toBe(0)

    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_ACTION_3)
    await engine.update(1)
    expect(downCounter).toBe(2)
    expect(upCounter).toBe(1)
    expect(clickCounter).toBe(1)

    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_POINTER)
    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_POINTER)
    await engine.update(1)
    expect(downCounter).toBe(3)
    expect(upCounter).toBe(2)
    expect(clickCounter).toBe(2)
  })

  it('should delete events callbacks if the entity was removed', async () => {
    const entity = engine.addEntity()
    let counter = 0
    EventsSystem.onClick({ entity, opts: { button: InputAction.IA_ANY } }, () => {
      counter += 1
    })
    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_ACTION_3)
    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_ACTION_3)
    await engine.update(1)
    expect(counter).toBe(1)

    engine.removeEntity(entity)
    await engine.update(1)

    fakePointer(entity, PointerEventType.PET_DOWN, InputAction.IA_ACTION_3)
    fakePointer(entity, PointerEventType.PET_UP, InputAction.IA_ACTION_3)
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('should throw error with a callback thenable', async () => {
    const entity = engine.addEntity()
    let counter = 0
    EventsSystem.onPointerUp(entity, async function () {
      counter += 1
      return new Promise((resolve) => setTimeout(resolve, 0))
    })
    fakePointer(entity, PointerEventType.PET_UP)

    const previousDebugMode = globalThis.DEBUG
    globalThis.DEBUG = true
    await expect(engine.update(1)).rejects.toThrowError()

    if (previousDebugMode) {
      globalThis.DEBUG = previousDebugMode
    } else {
      delete globalThis.DEBUG
    }

    expect(counter).toBe(1)
  })

  it(`should ignore removing hover feedback`, async () => {
    const entity = engine.addEntity()
    EventsSystem.onPointerUp(entity, function () {}, {
      hoverText: 'test',
      button: InputAction.IA_ACTION_3
    })

    const PointerEvents = components.PointerEvents(engine)
    PointerEvents.deleteFrom(entity)

    EventsSystem.removeOnPointerUp(entity)
  })
})
