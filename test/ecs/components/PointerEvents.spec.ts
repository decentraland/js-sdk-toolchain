import { Engine } from '../../../packages/@dcl/ecs/src/engine'
import { ActionButton } from '../../../packages/@dcl/ecs/src/components/generated/pb/ecs/components/common/ActionButton.gen'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/ecs/components/PointerEvents.gen'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerUp', () => {
    const newEngine = Engine()
    const { PointerEvents } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    PointerEvents.create(newEngine.addEntity())
    const pointerEvents = PointerEvents.create(entity, {
      pointerEvents: [
        {
          eventType: PointerEventType.UP,
          eventInfo: {
            button: 1,
            hoverText: 'Tap to run',
            maxDistance: 10,
            showFeedback: true
          }
        }
      ]
    })

    PointerEvents.create(entityB, {
      pointerEvents: [
        {
          eventType: PointerEventType.DOWN,
          eventInfo: {
            button: ActionButton.ACTION_4,
            hoverText: 'Run to tap',
            maxDistance: 5,
            showFeedback: false
          }
        }
      ]
    })

    const buffer = PointerEvents.toBinary(entity)
    PointerEvents.updateFromBinary(entityB, buffer)

    const result = { ...PointerEvents.getMutable(entityB) }
    expect(pointerEvents).toEqual(result)
  })

  it('should receive OnPointerResult', () => {
    const newEngine = Engine()
    const { PointerEvents, PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    PointerEvents.create(newEngine.addEntity())

    // We create an onPointerDownEvent
    PointerEvents.create(entity, {
      pointerEvents: [
        {
          eventType: PointerEventType.DOWN,
          eventInfo: {
            button: ActionButton.ACTION_4,
            hoverText: 'Run to tap',
            maxDistance: 5,
            showFeedback: false
          }
        }
      ]
    })

    // wait a tick to receive a response
    newEngine.update(1 / 30)

    // We receive an OnPointerResult
    PointerEventsResult.create(entity, {
      commands: [
        {
          button: ActionButton.ACTION_3,
          timestamp: 5,
          hit: {
            position: { x: 1, y: 2, z: 3 },
            length: 10,
            direction: { x: 1, y: 2, z: 3 },
            normalHit: { x: 1, y: 2, z: 3 },
            origin: { x: 1, y: 2, z: 3 },
            meshName: 'mesh'
          },
          state: PointerEventType.DOWN
        }
      ]
    })

    expect(PointerEventsResult.has(entity))
  })
})
