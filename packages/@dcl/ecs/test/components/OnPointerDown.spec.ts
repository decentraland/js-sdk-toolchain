import { ActionButton } from '../../src/components/generated/pb/common/ActionButton.gen'
import { Engine } from '../../src/engine'
import {PointerEventType} from "../../src/components/generated/pb/PointerEventsResult.gen";

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerDown', () => {
    const newEngine = Engine()
    const { OnPointerDown } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    OnPointerDown.create(newEngine.addEntity())
    const onPointerDown = OnPointerDown.create(entity, {
      button: ActionButton.PRIMARY,
      hoverText: 'Tap to run',
      maxDistance: 10,
      showFeedback: true
    })

    OnPointerDown.create(entityB, {
      button: ActionButton.SECONDARY,
      hoverText: 'TCker',
      maxDistance: 5,
      showFeedback: false
    })
    const buffer = OnPointerDown.toBinary(entity)
    OnPointerDown.updateFromBinary(entityB, buffer)

    expect(onPointerDown).toEqual({ ...OnPointerDown.getMutable(entityB) })
  })

  it('should receive OnPointerResult', () => {
    const newEngine = Engine()
    const { OnPointerDown, PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    OnPointerDown.create(newEngine.addEntity())

    // We create an onPointerDownEvent
    OnPointerDown.create(entity, {
      button: ActionButton.PRIMARY,
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
