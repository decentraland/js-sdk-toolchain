import { Engine } from '../../src/engine'

describe('Generated BoxShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
    const newEngine = Engine()
    const { BoxShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _boxShape = BoxShape.create(entity, {
      isPointerBlocker: true,
      visible: true,
      withCollisions: true,
      uvs: [0, 3234.32, 123.2, Math.PI / 2]
    })

    BoxShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false,
      uvs: [-1, -2.1, 12837127371]
    })
    const buffer = BoxShape.toBinary(entity)
    BoxShape.updateFromBinary(entityB, buffer)

    expect(_boxShape).toBeDeepCloseTo({ ...BoxShape.mutable(entityB) })
  })
})
