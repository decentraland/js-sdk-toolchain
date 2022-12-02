import {
  Engine,
  components,
  InputAction,
  PointerEventType
} from '../../../packages/@dcl/ecs/src'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerUp', () => {
    const newEngine = Engine()
    const PointerHoverFeedback = components.PointerHoverFeedback(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    PointerHoverFeedback.create(newEngine.addEntity())
    const pointerHoverFeedback = PointerHoverFeedback.create(entity, {
      pointerEvents: [
        {
          eventType: PointerEventType.PET_UP,
          eventInfo: {
            button: 1,
            hoverText: 'Tap to run',
            maxDistance: 10,
            showFeedback: true
          }
        }
      ]
    })

    PointerHoverFeedback.create(entityB, {
      pointerEvents: [
        {
          eventType: PointerEventType.PET_DOWN,
          eventInfo: {
            button: InputAction.IA_ACTION_4,
            hoverText: 'Run to tap',
            maxDistance: 5,
            showFeedback: false
          }
        }
      ]
    })

    const buffer = PointerHoverFeedback.toBinary(entity)
    PointerHoverFeedback.updateFromBinary(entityB, buffer)

    const result = { ...PointerHoverFeedback.getMutable(entityB) }
    expect(pointerHoverFeedback).toEqual(result)
  })

  it('should receive OnPointerResult', async () => {
    const newEngine = Engine()
    const PointerHoverFeedback = components.PointerHoverFeedback(newEngine)
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    PointerHoverFeedback.create(newEngine.addEntity())

    // We create an onPointerDownEvent
    PointerHoverFeedback.create(entity, {
      pointerEvents: [
        {
          eventType: PointerEventType.PET_DOWN,
          eventInfo: {
            button: InputAction.IA_ACTION_4,
            hoverText: 'Run to tap',
            maxDistance: 5,
            showFeedback: false
          }
        }
      ]
    })

    // wait a tick to receive a response
    await newEngine.update(1 / 30)

    // We receive an OnPointerResult
    PointerEventsResult.create(entity, {
      commands: [
        {
          button: InputAction.IA_ACTION_3,
          timestamp: 5,
          hit: {
            position: { x: 1, y: 2, z: 3 },
            length: 10,
            direction: { x: 1, y: 2, z: 3 },
            normalHit: { x: 1, y: 2, z: 3 },
            origin: { x: 1, y: 2, z: 3 },
            meshName: 'mesh'
          },
          state: PointerEventType.PET_DOWN
        }
      ]
    })

    expect(PointerEventsResult.has(entity))
  })
})
