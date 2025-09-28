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

  function addTriggerResult(entity: Entity, eventType: TriggerAreaEventType, timestamp: number) {
    triggerAreaResultComponent.addValue(entity, {
      triggeredEntity: entity as number,
      triggeredEntityPosition: Vector3.Zero(),
      triggeredEntityRotation: Quaternion.Zero(),
      eventType,
      timestamp,
      trigger: {
        entity: engine.RootEntity as number,
        layer: 0,
        position: Vector3.Zero(),
        rotation: Quaternion.Zero(),
        scale: Vector3.One()
      }
    })
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

  it('run callback on trigger stay', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)

    const fn = jest.fn()
    triggerAreaEventsSystem.onTriggerStay(entity, fn)

    addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 1)

    await engine.update(1)
    expect(fn).toHaveBeenCalled()
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

  it('runs callbacks only for new values and in order', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)

    const onEnter = jest.fn()
    const onStay = jest.fn()
    const onExit = jest.fn()
    triggerAreaEventsSystem.onTriggerEnter(entity, onEnter)
    triggerAreaEventsSystem.onTriggerStay(entity, onStay)
    triggerAreaEventsSystem.onTriggerExit(entity, onExit)

    // add two values before the first update
    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 1)
    addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 2)

    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onStay).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(0)

    // no new values -> no new calls
    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onStay).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(0)

    // append older timestamp -> should be ignored
    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 0)
    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onStay).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(0)

    // append a new timestamp -> should trigger
    addTriggerResult(entity, TriggerAreaEventType.TAET_EXIT, 3)
    await engine.update(1)
    expect(onExit).toHaveBeenCalledTimes(1)
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

  it('handle deleted entities correctly', async () => {
    const entity = engine.addEntity()
    triggerAreaComponent.setBox(entity)

    const onEnter = jest.fn()
    triggerAreaEventsSystem.onTriggerEnter(entity, onEnter)

    addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 1)
    await engine.update(1)
    expect(onEnter).toHaveBeenCalledTimes(1)

    engine.removeEntity(entity)
    await engine.update(1)

    // component data should be cleared
    expect(triggerAreaResultComponent.get(entity).size).toBe(0)
  })
})


