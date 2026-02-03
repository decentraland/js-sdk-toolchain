import { Engine, components, InputAction, PointerEventType, InteractionType } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerUp', () => {
    const newEngine = Engine()
    const PointerEvents = components.PointerEvents(newEngine)

    testComponentSerialization(PointerEvents, {
      pointerEvents: [
        {
          eventType: PointerEventType.PET_UP,
          eventInfo: {
            button: 1,
            hoverText: 'Tap to run',
            maxDistance: 10,
            showFeedback: true,
            showHighlight: true,
            maxPlayerDistance: 10,
            priority: 0
          },
          interactionType: InteractionType.CURSOR
        }
      ]
    })

    testComponentSerialization(PointerEvents, {
      pointerEvents: [
        {
          eventType: PointerEventType.PET_DOWN,
          eventInfo: {
            button: InputAction.IA_ACTION_4,
            hoverText: 'Run to tap',
            maxDistance: 5,
            showFeedback: false,
            showHighlight: false,
            maxPlayerDistance: 7,
            priority: 0
          },
          interactionType: InteractionType.CURSOR
        }
      ]
    })
  })

  it('should receive OnPointerResult', async () => {
    const newEngine = Engine()
    const PointerEvents = components.PointerEvents(newEngine)
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    const entity = newEngine.addEntity()
    PointerEvents.create(newEngine.addEntity())

    // We create an onPointerDownEvent
    PointerEvents.create(entity, {
      pointerEvents: [
        {
          eventType: PointerEventType.PET_DOWN,
          eventInfo: {
            button: InputAction.IA_ACTION_4,
            hoverText: 'Run to tap',
            maxDistance: 5,
            showFeedback: false,
            showHighlight: false,
            maxPlayerDistance: 3,
            priority: 0
          },
          interactionType: InteractionType.CURSOR
        }
      ]
    })

    // wait a tick to receive a response
    await newEngine.update(1 / 30)

    // We receive an OnPointerResult
    PointerEventsResult.addValue(entity, {
      button: InputAction.IA_ACTION_3,
      timestamp: 5,
      hit: {
        position: { x: 1, y: 2, z: 3 },
        length: 10,
        direction: { x: 1, y: 2, z: 3 },
        normalHit: { x: 1, y: 2, z: 3 },
        globalOrigin: { x: 1, y: 2, z: 3 },
        meshName: 'mesh'
      },
      state: PointerEventType.PET_DOWN,
      tickNumber: 0
    })

    expect(PointerEventsResult.has(entity))
  })
})
