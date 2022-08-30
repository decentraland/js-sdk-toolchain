import { Engine } from '../../src/engine'
import {ActionButton} from "../../src/components/generated/pb/common/ActionButton.gen";
import {PointerEventType} from "../../src/components/generated/pb/PointerEventsResult.gen";

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerUp', () => {
    const newEngine = Engine()
    const { OnPointerUp } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    OnPointerUp.create(newEngine.addEntity())
    const onPointerUp = OnPointerUp.create(entity, {
      button: 1,
      hoverText: 'Tap to run',
      maxDistance: 10,
      showFeedback: true
    })

    OnPointerUp.create(entityB, {
      button: 3,
      hoverText: 'TCker',
      maxDistance: 5,
      showFeedback: false
    })
    const buffer = OnPointerUp.toBinary(entity)
    OnPointerUp.updateFromBinary(entityB, buffer)

    expect(onPointerUp).toBeDeepCloseTo({
      ...OnPointerUp.getMutable(entityB)
    })
  })

  it('should receive OnPointerResult', () => {
    const newEngine = Engine()
    const { OnPointerUp, PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    OnPointerUp.create(newEngine.addEntity())

    // We create an onPointerDownEvent
    OnPointerUp.create(entity, {
      button: 1,
      hoverText: 'Tap to run',
      maxDistance: 10,
      showFeedback: true
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
