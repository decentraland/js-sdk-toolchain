import * as components from '../../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import { createInputSystem } from '../../../packages/@dcl/ecs/src/engine/input'
import { createPointerEventsSystem, PointerEventsSystem } from '../../../packages/@dcl/ecs/src/systems/events'
import {
  InputAction,
  InteractionType,
  PointerEventType
} from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { createTestPointerDownCommand } from './utils'

type Engines = {
  engine: ReturnType<typeof Engine>
  pointerEvents: PointerEventsSystem
  PointerEvents: ReturnType<typeof components.PointerEvents>
  PointerEventsResult: ReturnType<typeof components.PointerEventsResult>
}

function setup(): Engines {
  const engine = Engine()
  const pointerEvents = createPointerEventsSystem(engine, createInputSystem(engine))
  return {
    engine,
    pointerEvents,
    PointerEvents: components.PointerEvents(engine),
    PointerEventsResult: components.PointerEventsResult(engine)
  }
}

describe('when a pointer event without a hover text is registered more than once', () => {
  let ctx: Engines
  let entity: Entity

  beforeEach(() => {
    ctx = setup()
    entity = ctx.engine.addEntity()
    ctx.pointerEvents.onPointerDown(entity, () => {})
    ctx.pointerEvents.onPointerDown(entity, () => {})
    ctx.pointerEvents.onPointerDown(entity, () => {})
  })

  it('should describe the interaction once', () => {
    expect(ctx.PointerEvents.get(entity).pointerEvents).toHaveLength(1)
  })

  it('should describe nothing after it is removed', () => {
    ctx.pointerEvents.removeOnPointerDown(entity)

    expect(ctx.PointerEvents.get(entity).pointerEvents).toHaveLength(0)
  })
})

describe('when a pointer event with a hover text is removed', () => {
  let ctx: Engines
  let entity: Entity

  beforeEach(() => {
    ctx = setup()
    entity = ctx.engine.addEntity()
    ctx.pointerEvents.onPointerDown({ entity, opts: { hoverText: 'Open' } }, () => {})
    ctx.pointerEvents.removeOnPointerDown(entity)
  })

  it('should describe nothing', () => {
    expect(ctx.PointerEvents.get(entity).pointerEvents).toHaveLength(0)
  })
})

describe('when a proximity handler is registered on an entity that already has a cursor one', () => {
  let ctx: Engines
  let entity: Entity
  let cursorCallback: jest.Mock
  let proximityCallback: jest.Mock

  beforeEach(() => {
    ctx = setup()
    entity = ctx.engine.addEntity()
    cursorCallback = jest.fn()
    proximityCallback = jest.fn()
    ctx.pointerEvents.onPointerDown({ entity, opts: { hoverText: 'cursor' } }, cursorCallback)
    ctx.pointerEvents.onProximityDown({ entity, opts: { hoverText: 'proximity' } }, proximityCallback)
  })

  it('should describe both interactions', () => {
    expect(ctx.PointerEvents.get(entity).pointerEvents.map((pointer) => pointer.interactionType)).toEqual([
      InteractionType.CURSOR,
      InteractionType.PROXIMITY
    ])
  })

  it('should keep the cursor callback registered', async () => {
    ctx.PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 1, PointerEventType.PET_DOWN))
    await ctx.engine.update(1)

    expect(cursorCallback).toHaveBeenCalledTimes(1)
  })
})

describe('when a proximity handler is removed', () => {
  let ctx: Engines
  let entity: Entity

  beforeEach(() => {
    ctx = setup()
    entity = ctx.engine.addEntity()
    ctx.pointerEvents.onPointerDown({ entity, opts: { hoverText: 'cursor' } }, () => {})
    ctx.pointerEvents.onProximityDown({ entity, opts: { hoverText: 'proximity' } }, () => {})
    ctx.pointerEvents.removeOnProximityDown(entity)
  })

  it('should stop describing the proximity interaction', () => {
    const described = ctx.PointerEvents.get(entity).pointerEvents

    expect(described.some((pointer) => pointer.interactionType === InteractionType.PROXIMITY)).toBe(false)
  })

  it('should leave the cursor interaction alone', () => {
    const described = ctx.PointerEvents.get(entity).pointerEvents

    expect(described.map((pointer) => pointer.eventInfo?.hoverText)).toEqual(['cursor'])
  })
})

describe('when an entity carries both an onClick and an onPointerDown for the same button', () => {
  let ctx: Engines
  let entity: Entity

  beforeEach(() => {
    ctx = setup()
    entity = ctx.engine.addEntity()
    ctx.pointerEvents.onClick({ entity, opts: { button: InputAction.IA_POINTER, hoverText: 'click' } }, () => {})
    ctx.pointerEvents.onPointerDown({ entity, opts: { button: InputAction.IA_POINTER, hoverText: 'down' } }, () => {})
  })

  it('should describe one interaction per registration', () => {
    expect(ctx.PointerEvents.get(entity).pointerEvents).toHaveLength(2)
  })

  it('should leave the other registration described when one is removed', () => {
    ctx.pointerEvents.removeOnClick(entity)

    expect(ctx.PointerEvents.get(entity).pointerEvents).toHaveLength(1)
  })
})
