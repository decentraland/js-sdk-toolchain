import { Engine, Entity, IEngine } from '../../../packages/@dcl/ecs/src/engine'
import { createInput } from '../../../packages/@dcl/ecs/src/engine/input'
import { InputAction } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { EventsSystem } from '../../../packages/@dcl/ecs/src/systems/events'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { createTestPointerDownCommand } from './utils'

let engine: IEngine
let fakePointer: (
  entity: Entity,
  pointerType: PointerEventType,
  button?: InputAction
) => void

describe('Events System', () => {
  beforeEach(() => {
    engine = (globalThis as any).engine = Engine()
    const Input = createInput(engine)
    ;(global as any).Input = Input
    engine.addSystem(EventsSystem.update(Input))
    const { PointerEventsResult } = engine.baseComponents
    let fakeCounter = 0

    fakePointer = (entity, pointerType, button) => {
      const pointerEvents =
        PointerEventsResult.getMutableOrNull(engine.RootEntity) ||
        PointerEventsResult.create(engine.RootEntity)

      pointerEvents.commands.push(
        createTestPointerDownCommand(
          entity,
          fakeCounter + 1,
          pointerType,
          button
        )
      )
      fakeCounter += 1
    }
  })

  it('should run default onClick', () => {
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
  })

  it('should create pointer hover components', () => {
    const entity = engine.addEntity()
    const { PointerHoverFeedback } = engine.baseComponents
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
    const { PointerHoverFeedback } = engine.baseComponents
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
    let counter = 0
    EventsSystem.onPointerDown(entity, () => {
      counter += 1
    })
    fakePointer(entity, PointerEventType.PET_DOWN)
    engine.update(1)
    expect(counter).toBe(1)
  })

  it('should remove pointer down', () => {
    const entity = engine.addEntity()
    const { PointerHoverFeedback } = engine.baseComponents
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
    const { PointerHoverFeedback } = engine.baseComponents
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
})
