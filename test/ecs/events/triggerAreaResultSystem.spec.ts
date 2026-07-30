import {
  Engine,
  IEngine,
  components,
  TriggerAreaEventType,
  createTriggerAreaEventsSystem,
  Entity
} from '../../../packages/@dcl/ecs/src'
import { Quaternion, Vector3 } from '../../../packages/@dcl/sdk/math'

describe('Trigger Area Events Helper System should', () => {
  const engine: IEngine = Engine()
  const triggerAreaEventsSystem = createTriggerAreaEventsSystem(engine)
  const triggerAreaResultComponent = components.TriggerAreaResult(engine)
  const triggerAreaComponent = components.TriggerArea(engine)
  const Transform = components.Transform(engine)

  function makeTriggerResult(
    entity: Entity,
    eventType: TriggerAreaEventType,
    timestamp: number,
    triggererEntity?: Entity,
    position?: { x: number; y: number; z: number }
  ) {
    return {
      triggeredEntity: entity as number,
      triggeredEntityPosition: Vector3.Zero(),
      triggeredEntityRotation: Quaternion.Zero(),
      eventType,
      timestamp,
      trigger: {
        entity: (triggererEntity ?? (engine.RootEntity as Entity)) as number,
        layers: 0,
        position: position ?? Vector3.Zero(),
        rotation: Quaternion.Zero(),
        scale: Vector3.One()
      }
    }
  }

  function addTriggerResult(
    entity: Entity,
    eventType: TriggerAreaEventType,
    timestamp: number,
    triggererEntity?: Entity,
    position?: { x: number; y: number; z: number }
  ) {
    triggerAreaResultComponent.addValue(entity, makeTriggerResult(entity, eventType, timestamp, triggererEntity, position))
  }

  it('run callback on trigger enter', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)

    const fn = jest.fn()
    triggerAreaEventsSystem.onTriggerEnter(entity, fn)

    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 1)

    await engine.update(1)
    expect(fn).toHaveBeenCalled()
  })

  it('synthesizes onStay callbacks after wire-ENTER without requiring wire-STAY', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)

    const onEnter = jest.fn()
    const onStay = jest.fn()
    const onExit = jest.fn()
    triggerAreaEventsSystem.onTriggerEnter(entity, onEnter)
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)
    triggerAreaEventsSystem.onTriggerExit(entity, onExit)

    // Only ENTER — no wire-STAY emitted (new Explorer contract).
    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 1)

    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    // The SDK synthesizes a stay on the same tick as ENTER (Pass 2 runs after Pass 1).
    expect(onStay).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(0)

    // No new wire events — SDK still synthesizes onStay each tick.
    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onStay).toHaveBeenCalledTimes(2)
    expect(onExit).toHaveBeenCalledTimes(0)

    // Wire EXIT — synthesized stays stop, onExit fires.
    addTriggerResult(entity, TriggerAreaEventType.TAET_EXIT, 2)
    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onStay).toHaveBeenCalledTimes(2)
    expect(onExit).toHaveBeenCalledTimes(1)

    // No more stays after EXIT.
    await engine.update(1)
    expect(onStay).toHaveBeenCalledTimes(2)
  })

  it('run callback on trigger exit', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)

    const fn = jest.fn()
    triggerAreaEventsSystem.onTriggerExit(entity, fn)

    addTriggerResult(entity, TriggerAreaEventType.TAET_EXIT, 1)

    await engine.update(1)
    expect(fn).toHaveBeenCalled()
  })

  it('fires onTriggerStay every tick after wire-ENTER until EXIT, even if no wire-STAY ever arrives', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)
    const triggerer = engine.addEntity()

    const onStay = jest.fn()
    const onExit = jest.fn()
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)
    triggerAreaEventsSystem.onTriggerExit(entity, onExit)

    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 10, triggerer)

    // 5 ticks — onStay should fire every tick (starting on the same tick as ENTER).
    for (let i = 0; i < 5; i++) {
      await engine.update(1)
    }
    expect(onStay).toHaveBeenCalledTimes(5)

    // Wire EXIT — onExit fires once, onStay stops.
    addTriggerResult(entity, TriggerAreaEventType.TAET_EXIT, 20, triggerer)
    await engine.update(1)
    expect(onExit).toHaveBeenCalledTimes(1)

    await engine.update(1)
    await engine.update(1)

    // onStay total stays at 5 — no more synthesized stays after EXIT.
    expect(onStay).toHaveBeenCalledTimes(5)
  })

  it('wire-STAY events do NOT fire onStay callbacks', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)
    const triggerer = engine.addEntity()

    const onStay = jest.fn()
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)

    // ENTER + 3 wire-STAY events all appended before the first tick.
    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 100, triggerer)
    addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 101, triggerer)
    addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 102, triggerer)
    addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 103, triggerer)

    // Run exactly 1 tick — all 4 events drain in Pass 1, then Pass 2 synthesizes exactly one onStay.
    await engine.update(1)
    expect(onStay).toHaveBeenCalledTimes(1)
  })

  it('wire-STAY without prior ENTER is ignored', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)
    const triggerer = engine.addEntity()

    const onStay = jest.fn()
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)

    // No ENTER, only wire-STAY events.
    addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 300, triggerer)
    addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 301, triggerer)

    await engine.update(1)
    await engine.update(1)
    await engine.update(1)

    // No callbacks should have fired — no prior ENTER means insideTriggerers is empty.
    expect(onStay).toHaveBeenCalledTimes(0)
  })

  it('synthesized stay refreshes position from Transform when triggerer is scene-owned', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)
    const triggerer = engine.addEntity()

    // Give the triggerer a scene-side Transform.
    const P0 = { x: 10, y: 0, z: 0 }
    const P1 = { x: 20, y: 0, z: 0 }
    Transform.create(triggerer, { position: P0 })

    const onStay = jest.fn()
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)

    // ENTER with a cached position different from P0 to prove Transform wins.
    const cachedPos = { x: 99, y: 99, z: 99 }
    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 400, triggerer, cachedPos)

    await engine.update(1)
    expect(onStay).toHaveBeenCalledTimes(1)
    expect(onStay.mock.calls[0][0].trigger.position).toMatchObject(P0)

    // Mutate the Transform and verify the next synthesized stay picks up P1.
    Transform.getMutable(triggerer).position = P1
    await engine.update(1)
    expect(onStay).toHaveBeenCalledTimes(2)
    expect(onStay.mock.calls[1][0].trigger.position).toMatchObject(P1)
  })

  it('synthesized stay falls back to cached values when triggerer has no Transform', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)
    const triggerer = engine.addEntity()
    // Deliberately do NOT give triggerer a Transform.

    const onStay = jest.fn()
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)

    const cachedPos = { x: 5, y: 6, z: 7 }
    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 500, triggerer, cachedPos)

    await engine.update(1)
    expect(onStay).toHaveBeenCalledTimes(1)
    // No Transform on triggerer — should use cached position.
    expect(onStay.mock.calls[0][0].trigger.position).toMatchObject(cachedPos)
  })

  it('runs callbacks only for new values and in order', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)

    const onEnter = jest.fn()
    const onStay = jest.fn()
    const onExit = jest.fn()
    triggerAreaEventsSystem.onTriggerEnter(entity, onEnter)
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)
    triggerAreaEventsSystem.onTriggerExit(entity, onExit)

    // add ENTER value before the first update
    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 1)

    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    // Pass 2 fires onStay once (triggerer is now inside).
    expect(onStay).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(0)

    // no new wire values -> only synthesized onStay
    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onStay).toHaveBeenCalledTimes(2)
    expect(onExit).toHaveBeenCalledTimes(0)

    // append older timestamp -> should be ignored (both wire and stay counts stay)
    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 0)
    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    // onStay still fires from Pass 2 (triggerer still inside).
    expect(onStay).toHaveBeenCalledTimes(3)
    expect(onExit).toHaveBeenCalledTimes(0)

    // append a new EXIT timestamp -> onExit fires, onStay stops
    addTriggerResult(entity, TriggerAreaEventType.TAET_EXIT, 3)
    await engine.update(1)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(onStay).toHaveBeenCalledTimes(3)
  })

  it('remove callbacks correctly', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)

    const onEnter = jest.fn()
    triggerAreaEventsSystem.onTriggerEnter(entity, onEnter)
    triggerAreaEventsSystem.removeOnTriggerEnter(entity)

    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 1)
    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(0)
  })

  it('removing onStay halts synthesized firing on the very next tick', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)
    const triggerer = engine.addEntity()

    const onStay = jest.fn()
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)

    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 600, triggerer)

    await engine.update(1)
    expect(onStay).toHaveBeenCalledTimes(1)

    await engine.update(1)
    expect(onStay).toHaveBeenCalledTimes(2)

    // Remove the callback — the entity record is evicted (only onStay was registered).
    triggerAreaEventsSystem.removeOnTriggerStay(entity)

    await engine.update(1)
    // No more synthesized callbacks.
    expect(onStay).toHaveBeenCalledTimes(2)
  })

  it('handle deleted entities correctly', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)
    const triggerer = engine.addEntity()

    const onEnter = jest.fn()
    const onStay = jest.fn()
    triggerAreaEventsSystem.onTriggerEnter(entity, onEnter)
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)

    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 1, triggerer)
    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onStay).toHaveBeenCalledTimes(1)

    engine.removeEntity(entity)
    await engine.update(1)

    // component data should be cleared
    expect(triggerAreaResultComponent.get(entity).size).toBe(0)

    // Re-subscribe after deletion — no stale callbacks should fire because
    // the entity record (including insideTriggerers) was evicted.
    const onStay2 = jest.fn()
    triggerAreaEventsSystem.onTriggerStay(entity, onStay2)
    await engine.update(1)
    // Entity is removed; the system detects EntityState.Removed on the next run
    // and evicts the record again without firing.
    expect(onStay2).toHaveBeenCalledTimes(0)
  })
})
