import { Engine } from '../../src/engine'

describe('Generated SphereShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
    const newEngine = Engine()
    const { SphereShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _sphereShape = SphereShape.create(entity, {
      isPointerBlocker: true,
      visible: true,
      withCollisions: true
    })

    SphereShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false
    })
    const buffer = SphereShape.toBinary(entity)
    SphereShape.updateFromBinary(entityB, buffer)

    expect(_sphereShape).toBeDeepCloseTo({ ...SphereShape.mutable(entityB) })
  })
})
