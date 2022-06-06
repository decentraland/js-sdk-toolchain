import { Engine } from '../../src/engine'

describe('Generated PlaneShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
    const newEngine = Engine()
    const { PlaneShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _planeShape = PlaneShape.create(entity, {
      isPointerBlocker: true,
      visible: true,
      withCollisions: true,
      uvs: [0, 3234.32, 123.2, Math.PI / 2]
    })

    PlaneShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false,
      uvs: [-1, -2.1, 12837127371]
    })
    const buffer = PlaneShape.toBinary(entity)
    PlaneShape.updateFromBinary(entityB, buffer)

    expect(_planeShape).toBeDeepCloseTo({ ...PlaneShape.mutable(entityB) })
  })
})
