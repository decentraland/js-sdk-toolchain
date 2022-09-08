import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerDown', () => {
    const newEngine = Engine()
    const { OnPointerUpResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    OnPointerUpResult.create(newEngine.addEntity())
    const onPointerResult = OnPointerUpResult.create(entity, {
      button: 1,
      point: { x: 1, y: 2, z: 3 },
      distance: 10,
      direction: { x: 1, y: 2, z: 3 },
      normal: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh',
      timestamp: 23432
    })

    OnPointerUpResult.create(entityB, {
      button: 3,
      point: { x: 1, y: 2, z: 3 },
      distance: 10,
      direction: { x: 1, y: 2, z: 3 },
      normal: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh',
      timestamp: 23432
    })
    const buffer = OnPointerUpResult.toBinary(entity)
    OnPointerUpResult.updateFromBinary(entityB, buffer)

    const result = { ...OnPointerUpResult.getMutable(entityB) }

    expect(onPointerResult).toEqual(result)
  })
})
