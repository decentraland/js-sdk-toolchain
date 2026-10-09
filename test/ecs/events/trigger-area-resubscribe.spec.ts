import * as components from '../../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import { createTriggerAreaEventsSystem } from '../../../packages/@dcl/ecs/src/systems/triggerArea'
import { TriggerAreaEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/trigger_area_result.gen'

function triggerResult(triggered: Entity, triggerer: Entity, eventType: TriggerAreaEventType, timestamp: number) {
  return {
    triggeredEntity: triggered as number,
    triggeredEntityPosition: { x: 0, y: 0, z: 0 },
    triggeredEntityRotation: { x: 0, y: 0, z: 0, w: 1 },
    eventType,
    timestamp,
    trigger: {
      entity: triggerer as number,
      layers: 0,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    }
  }
}

describe('when trigger callbacks are swapped for new ones', () => {
  let engine: ReturnType<typeof Engine>
  let TriggerAreaResult: ReturnType<typeof components.TriggerAreaResult>
  let system: ReturnType<typeof createTriggerAreaEventsSystem>
  let area: Entity
  let triggerer: Entity
  let replacementEnter: jest.Mock

  beforeEach(async () => {
    engine = Engine()
    TriggerAreaResult = components.TriggerAreaResult(engine)
    system = createTriggerAreaEventsSystem(engine)

    area = engine.addEntity()
    triggerer = engine.addEntity()

    // A player walks in and out while the first pair of callbacks is listening.
    system.onTriggerEnter(area, jest.fn())
    system.onTriggerExit(area, jest.fn())
    TriggerAreaResult.addValue(area, triggerResult(area, triggerer, TriggerAreaEventType.TAET_ENTER, 1))
    TriggerAreaResult.addValue(area, triggerResult(area, triggerer, TriggerAreaEventType.TAET_EXIT, 2))
    await engine.update(1)

    system.removeOnTriggerEnter(area)
    system.removeOnTriggerExit(area)

    replacementEnter = jest.fn()
    system.onTriggerEnter(area, replacementEnter)
    await engine.update(1)
  })

  it('should not replay events the previous callbacks already consumed', () => {
    expect(replacementEnter).not.toHaveBeenCalled()
  })

  it('should deliver an event that arrives after the swap', async () => {
    TriggerAreaResult.addValue(area, triggerResult(area, triggerer, TriggerAreaEventType.TAET_ENTER, 3))
    await engine.update(1)

    expect(replacementEnter).toHaveBeenCalledTimes(1)
  })
})

describe('when a trigger callback is registered for the first time', () => {
  let engine: ReturnType<typeof Engine>
  let onEnter: jest.Mock

  beforeEach(async () => {
    engine = Engine()
    const TriggerAreaResult = components.TriggerAreaResult(engine)
    const system = createTriggerAreaEventsSystem(engine)

    const area = engine.addEntity()
    const triggerer = engine.addEntity()

    onEnter = jest.fn()
    system.onTriggerEnter(area, onEnter)
    TriggerAreaResult.addValue(area, triggerResult(area, triggerer, TriggerAreaEventType.TAET_ENTER, 1))
    await engine.update(1)
  })

  it('should receive the event', () => {
    expect(onEnter).toHaveBeenCalledTimes(1)
  })
})
