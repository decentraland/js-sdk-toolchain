import { Engine } from '../../src/engine'

describe('Generated Cylinder ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
    const newEngine = Engine()
    const { CylinderShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _shape = CylinderShape.create(entity, {
      isPointerBlocker: true,
      visible: true,
      withCollisions: true,
      radiusTop: 1,
      radiusBottom: 1
    })

    CylinderShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false,
      radiusTop: 0,
      radiusBottom: 0
    })
    const buffer = CylinderShape.toBinary(entity)
    CylinderShape.updateFromBinary(entityB, buffer)

    expect(_shape).toBeDeepCloseTo({ ...CylinderShape.mutable(entityB) })
  })
})
