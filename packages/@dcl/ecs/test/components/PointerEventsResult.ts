import { Engine } from '../../src/engine'
import { ActionButton } from '../../src/components/generated/pb/common/ActionButton.gen'
import { PointerEventType } from '../../src/components/generated/pb/PointerEventsResult.gen'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerDown', () => {
    const newEngine = Engine()
    const { PointerEventsResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    PointerEventsResult.create(newEngine.addEntity())
    const onPointerResult = PointerEventsResult.create(entity, {
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

    PointerEventsResult.create(entityB, {
      commands: [
        {
          button: ActionButton.ACTION_5,
          timestamp: 15,
          hit: {
            position: { x: 3, y: 4, z: 5 },
            length: 15,
            direction: { x: 3, y: 4, z: 5 },
            normalHit: { x: 3, y: 4, z: 5 },
            origin: { x: 3, y: 4, z: 5 },
            meshName: 'meshNew'
          },
          state: PointerEventType.UP
        },
        {
          button: ActionButton.ACTION_5,
          timestamp: 15,
          hit: {
            position: { x: 3, y: 4, z: 5 },
            length: 15,
            direction: { x: 3, y: 4, z: 5 },
            normalHit: { x: 3, y: 4, z: 5 },
            origin: { x: 3, y: 4, z: 5 },
            meshName: 'meshNew'
          },
          state: PointerEventType.UP
        }
      ]
    })
    const buffer = PointerEventsResult.toBinary(entity)
    PointerEventsResult.updateFromBinary(entityB, buffer)

    const result = { ...PointerEventsResult.getMutable(entityB) }

    expect(onPointerResult).toEqual(result)
  })
})
