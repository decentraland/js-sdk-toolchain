import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerDown', () => {
    const newEngine = Engine()
    const { OnPointerDownResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    OnPointerDownResult.create(newEngine.addEntity())
    const onPointerResult = OnPointerDownResult.create(entity, {
      button: 1,
      point: { x: 1, y: 2, z: 3 },
      distance: 10,
      direction: { x: 1, y: 2, z: 3 },
      normal: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh',
      timestamp: 23432
    })

    OnPointerDownResult.create(entityB, {
      button: 3,
      point: { x: 1, y: 2, z: 3 },
      distance: 10,
      direction: { x: 1, y: 2, z: 3 },
      normal: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh',
      timestamp: 23432
    })
    const buffer = OnPointerDownResult.toBinary(entity)
    OnPointerDownResult.updateFromBinary(entityB, buffer)

    const result = { ...OnPointerDownResult.getMutable(entityB) }

    expect(onPointerResult).toEqual(result)
  })
})
